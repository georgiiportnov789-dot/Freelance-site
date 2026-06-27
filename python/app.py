from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response, RedirectResponse, JSONResponse
from fastapi import FastAPI, Request, Form
import os, random, uvicorn, uuid, asyncio, aiosmtplib, re
from email.message import EmailMessage

from requestBD import request_bd, init_db

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates.env.cache = None

# Временное хранилище для незавершённых регистраций (до верификации)
temp = {}


@app.on_event("startup")
async def startup():
    await init_db()


async def send_verification_email(to_email: str, code: str):
    message = EmailMessage()
    message["From"] = os.environ.get("SMTP_USER", "georgiiportnov789@gmail.com")
    message["To"] = to_email
    message["Subject"] = "Код подтверждения SKILLFORGE"
    message.set_content(f"Ваш код для активации аккаунта: {code}")
    smtp = aiosmtplib.SMTP(
        hostname="smtp.gmail.com",
        port=587,
        use_tls=True,
        username=os.environ.get("SMTP_USER", "georgiiportnov789@gmail.com"),
        password=os.environ.get("SMTP_PASSWORD", ""),
    )
    async with smtp:
        await smtp.send_message(message)


# ── Страницы ────────────────────────────────────────────────────────────────

@app.get("/")
async def get_reg_page(request: Request):
    session_id = request.cookies.get("session_id")
    response = templates.TemplateResponse(request, "index.html")
    if not session_id:
        new_session_id = str(uuid.uuid4())
        response.set_cookie(key="session_id", value=new_session_id, httponly=True)
    return response


@app.get("/login")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.get("/main")
async def get_main_page(request: Request):
    return templates.TemplateResponse(request, "main.html")


@app.get("/about")
async def get_about_page(request: Request):
    return templates.TemplateResponse(request, "about.html")


@app.get("/applications")
async def get_appl_page(request: Request):
    return templates.TemplateResponse(request, "applications.html")


@app.get("/orders")
async def get_ord_page(request: Request):
    return templates.TemplateResponse(request, "orders.html")


@app.get("/verify")
async def get_ver_page(request: Request):
    return templates.TemplateResponse(request, "verify.html")


@app.get("/my_profile")
async def get_myp_page(request: Request):
    session_id = request.cookies.get("session_id")

    user = {
        "name": "",
        "email": "",
        "university": "",
        "phone": "",
        "initials": "?",
        "socials": [],
        "achievements": [],
    }

    if session_id:
        try:
            rows = await request_bd(
                "SELECT fio, email, university, number FROM users WHERE id = ?",
                (session_id,)
            )
            if rows:
                fio = rows[0][0] or ""
                email = rows[0][1] or ""
                university = rows[0][2] or ""
                phone = rows[0][3] or ""

                parts = fio.strip().split()
                initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"

                ach_rows = await request_bd(
                    "SELECT year, description FROM achievements WHERE user_id = ? ORDER BY year DESC",
                    (session_id,)
                )
                achievements = [{"year": r[0], "description": r[1]} for r in ach_rows]

                soc_rows = await request_bd(
                    "SELECT url, name FROM socials WHERE user_id = ?",
                    (session_id,)
                )
                socials = [{"url": r[0], "name": r[1]} for r in soc_rows]

                user = {
                    "name": fio,
                    "email": email,
                    "university": university,
                    "phone": phone,
                    "initials": initials,
                    "socials": socials,
                    "achievements": achievements,
                }
        except Exception as e:
            print(f"Ошибка загрузки профиля: {e}")

    return templates.TemplateResponse(request, "profile-edit.html", {"user": user})


# ── Регистрация ──────────────────────────────────────────────────────────────

@app.post("/register")
async def register(
    request: Request,
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
):
    session_id = request.cookies.get("session_id")

    if len(password) < 8:
        return Response("Пароль должен быть не короче 8 символов.")
    if not re.search(r"\d", password):
        return Response("Пароль должен содержать хотя бы одну цифру.")
    if not re.search(r"[A-Z]", password):
        return Response("Пароль должен содержать хотя бы одну заглавную букву.")

    existing = await request_bd("SELECT email FROM users WHERE email = ?", (email,))
    if existing:
        return Response("Email уже привязан к аккаунту")

    verify_code = str(random.randint(100000, 999999))
    print(f"Код верификации: {verify_code}")
    temp[str(session_id)] = {
        "name": name,
        "email": email,
        "password": password,
        "verify-code": verify_code,
    }

    response = Response()
    response.headers["HX-Redirect"] = "/verify"
    return response


@app.post("/resend-code")
async def resend_code(request: Request):
    session_id = request.cookies.get("session_id")
    verify_code = str(random.randint(100000, 999999))
    print(f"Новый код верификации: {verify_code}")
    if str(session_id) in temp:
        temp[str(session_id)]["verify-code"] = verify_code
    response = Response()
    response.headers["HX-Redirect"] = "/verify"
    return response


@app.post("/verify")
async def verify(request: Request, code: str = Form(...)):
    session_id = request.cookies.get("session_id")
    session_key = str(session_id)

    if session_key not in temp:
        return Response("Сессия не найдена. Зарегистрируйтесь заново.")

    if temp[session_key]["verify-code"] != code:
        return Response("Неверный код")

    await request_bd(
        "INSERT INTO users (id, email, password, fio) VALUES (?, ?, ?, ?)",
        (
            session_key,
            temp[session_key]["email"],
            temp[session_key]["password"],
            temp[session_key]["name"],
        ),
    )
    del temp[session_key]

    response = Response()
    response.headers["HX-Redirect"] = "/main"
    return response


# ── Логин ────────────────────────────────────────────────────────────────────

@app.post("/login")
async def login(
    request: Request,
    email: str = Form(...),
    password: str = Form(...),
):
    rows = await request_bd(
        "SELECT id FROM users WHERE email = ? AND password = ?",
        (email, password),
    )
    if rows:
        user_id = rows[0][0]
        response = Response()
        response.headers["HX-Redirect"] = "/main"
        response.set_cookie(key="session_id", value=user_id, httponly=True)
        return response
    return Response("Проверьте почту и пароль.")


# ── Профиль ──────────────────────────────────────────────────────────────────

@app.post("/save-profile")
async def save_profile(
    request: Request,
    name: str = Form(...),
    university: str = Form(...),
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Ошибка: сессия не найдена", status_code=403)

    await request_bd(
        "UPDATE users SET fio = ?, university = ? WHERE id = ?",
        (name, university, session_id),
    )
    return Response("OK")


@app.get("/update-phone")
async def update_phone(request: Request, phone: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Ошибка: сессия не найдена", status_code=403)

    await request_bd(
        "UPDATE users SET number = ? WHERE id = ?",
        (phone, session_id),
    )
    return Response(phone)


@app.get("/add-social")
async def add_social(request: Request, social_url: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Ошибка: сессия не найдена", status_code=403)

    known = {
        "vk.com": "VK",
        "t.me": "Telegram",
        "github.com": "GitHub",
        "linkedin.com": "LinkedIn",
        "instagram.com": "Instagram",
        "twitter.com": "Twitter",
        "x.com": "X",
    }
    name = "Ссылка"
    for domain, label in known.items():
        if domain in social_url:
            name = label
            break

    await request_bd(
        "INSERT INTO socials (user_id, url, name) VALUES (?, ?, ?)",
        (session_id, social_url, name),
    )

    return Response(
        f'<a href="{social_url}" class="profile__detail-link" target="_blank">{name} ↗</a>',
        media_type="text/html",
    )


@app.post("/add-achievement")
async def add_achievement(
    request: Request,
    year: int = Form(...),
    description: str = Form(...),
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Ошибка: сессия не найдена", status_code=403)

    await request_bd(
        "INSERT INTO achievements (user_id, year, description) VALUES (?, ?, ?)",
        (session_id, year, description),
    )
    return Response("OK")


async def send_message(request: Request, name: str = "", email: str = "", message: str = ""):
    """Заглушка для формы обратной связи."""
    if not name or not email or not message:
        return Response("Заполните все поля", media_type="text/html")
    print(f"Сообщение от {name} ({email}): {message}")
    return Response("Сообщение отправлено!", media_type="text/html")


@app.get("/profile/{user_id}")
async def get_user_profile(request: Request, user_id: str):
    user = {
        "name": "", "email": "", "university": "",
        "phone": "", "initials": "?", "socials": [], "achievements": [],
    }
    try:
        rows = await request_bd(
            "SELECT fio, email, university, number FROM users WHERE id = ?",
            (user_id,)
        )
        if rows:
            fio = rows[0][0] or ""
            parts = fio.strip().split()
            initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"

            ach_rows = await request_bd(
                "SELECT year, description FROM achievements WHERE user_id = ? ORDER BY year DESC",
                (user_id,)
            )
            soc_rows = await request_bd(
                "SELECT url, name FROM socials WHERE user_id = ?",
                (user_id,)
            )
            user = {
                "name": fio,
                "email": rows[0][1] or "",
                "university": rows[0][2] or "",
                "phone": rows[0][3] or "",
                "initials": initials,
                "socials": [{"url": r[0], "name": r[1]} for r in soc_rows],
                "achievements": [{"year": r[0], "description": r[1]} for r in ach_rows],
            }
    except Exception as e:
        print(f"Ошибка загрузки профиля: {e}")

    return templates.TemplateResponse(request, "profile-view.html", {"user": user})


# ── WebSocket менеджер ────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str):
        self.active.pop(user_id, None)

    async def send_to(self, user_id: str, data: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(data, ensure_ascii=False))
            except Exception:
                self.disconnect(user_id)

    async def broadcast_to_pair(self, sender_id: str, receiver_id: str, data: dict):
        await self.send_to(sender_id, data)
        await self.send_to(receiver_id, data)


manager = ConnectionManager()


# ── /me — узнать свой ID (нужен фронтенду) ───────────────────────────

@app.get("/me")
async def get_me(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse({"error": "not authenticated"}, status_code=401)
    rows = await request_bd("SELECT id, fio FROM users WHERE id = ?", (session_id,))
    if not rows:
        return JSONResponse({"error": "user not found"}, status_code=404)
    return JSONResponse({"id": rows[0][0], "name": rows[0][1] or ""})


# ── /chats — список диалогов текущего пользователя ───────────────────

@app.get("/chats")
async def get_chats(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse([], status_code=401)

    # Все уникальные собеседники
    rows = await request_bd("""
                            SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
                            FROM messages
                            WHERE sender_id = ?
                               OR receiver_id = ?
                            """, (session_id, session_id, session_id))

    chats = []
    for (partner_id,) in rows:
        user_rows = await request_bd(
            "SELECT fio FROM users WHERE id = ?", (partner_id,)
        )
        if not user_rows:
            continue
        fio = user_rows[0][0] or ""
        parts = fio.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"

        # Последнее сообщение
        last_rows = await request_bd("""
                                     SELECT text, created_at
                                     FROM messages
                                     WHERE (sender_id = ? AND receiver_id = ?)
                                        OR (sender_id = ? AND receiver_id = ?)
                                     ORDER BY created_at DESC LIMIT 1
                                     """, (session_id, partner_id, partner_id, session_id))

        last_message = last_rows[0][0][:40] if last_rows else ""

        # Непрочитанные (сообщения от партнёра, которые пришли последними)
        unread_rows = await request_bd("""
                                       SELECT COUNT(*)
                                       FROM messages
                                       WHERE sender_id = ?
                                         AND receiver_id = ?
                                         AND created_at > (SELECT COALESCE(MAX(created_at), '1970-01-01')
                                                           FROM messages
                                                           WHERE sender_id = ?
                                                             AND receiver_id = ?)
                                       """, (partner_id, session_id, session_id, partner_id))
        unread = unread_rows[0][0] if unread_rows else 0

        chats.append({
            "id": partner_id,
            "name": fio,
            "initials": initials,
            "last_message": last_message,
            "unread": unread,
        })

    return JSONResponse(chats)


# ── /messages/{user_id} — история переписки ──────────────────────────

@app.get("/messages/{with_user_id}")
async def get_messages(request: Request, with_user_id: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse([], status_code=401)

    rows = await request_bd("""
                            SELECT sender_id, receiver_id, text, created_at
                            FROM messages
                            WHERE (sender_id = ? AND receiver_id = ?)
                               OR (sender_id = ? AND receiver_id = ?)
                            ORDER BY created_at ASC LIMIT 200
                            """, (session_id, with_user_id, with_user_id, session_id))

    return JSONResponse([
        {"sender_id": r[0], "receiver_id": r[1], "text": r[2], "created_at": r[3]}
        for r in rows
    ])


# ── /send-message — HTTP fallback отправки ───────────────────────────

@app.post("/send-message")
async def send_message_http(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse({"error": "not authenticated"}, status_code=401)

    body = await request.json()
    receiver_id = body.get("receiver_id", "").strip()
    text = body.get("text", "").strip()

    if not receiver_id or not text:
        return JSONResponse({"error": "bad request"}, status_code=400)

    await request_bd(
        "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
        (session_id, receiver_id, text),
    )
    return JSONResponse({"ok": True})


# ── /search-users — поиск пользователей для нового чата ──────────────

@app.get("/search-users")
async def search_users(request: Request, q: str = ""):
    session_id = request.cookies.get("session_id")
    if not session_id or not q.strip():
        return JSONResponse([])

    rows = await request_bd("""
                            SELECT id, fio
                            FROM users
                            WHERE id != ? AND (fio LIKE ? OR email LIKE ?)
        LIMIT 20
                            """, (session_id, f"%{q}%", f"%{q}%"))

    result = []
    for (uid, fio) in rows:
        fio = fio or ""
        parts = fio.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"
        result.append({"id": uid, "name": fio, "initials": initials, "last_message": "", "unread": 0})

    return JSONResponse(result)


# ── WebSocket эндпоинт ────────────────────────────────────────────────

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    # Простая проверка: пользователь должен существовать
    rows = await request_bd("SELECT id FROM users WHERE id = ?", (user_id,))
    if not rows:
        await websocket.close(code=4001)
        return

    await manager.connect(user_id, websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)

            receiver_id = data.get("receiver_id", "").strip()
            text = data.get("text", "").strip()
            if not receiver_id or not text:
                continue

            # Сохранить в БД
            await request_bd(
                "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
                (user_id, receiver_id, text),
            )

            # Получить created_at только что созданной записи
            ts_rows = await request_bd("""
                                       SELECT created_at
                                       FROM messages
                                       WHERE sender_id = ?
                                         AND receiver_id = ?
                                       ORDER BY id DESC LIMIT 1
                                       """, (user_id, receiver_id))
            created_at = ts_rows[0][0] if ts_rows else ""

            msg = {
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "text": text,
                "created_at": created_at,
            }

            # Доставить обоим участникам (если онлайн)
            await manager.broadcast_to_pair(user_id, receiver_id, msg)

    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WS ошибка ({user_id}): {e}")
        manager.disconnect(user_id)

@app.get("/search-users")
async def search_users(request: Request, q: str = ""):
    session_id = request.cookies.get("session_id")
    if not session_id or not q.strip():
        return JSONResponse([])

    rows = await request_bd("""
        SELECT id, fio FROM users
        WHERE id != ? AND (fio LIKE ? OR email LIKE ?)
        LIMIT 20
    """, (session_id, f"%{q}%", f"%{q}%"))

    result = []
    for (uid, fio) in rows:
        fio = fio or ""
        parts = fio.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"
        result.append({"id": uid, "name": fio, "initials": initials, "last_message": "", "unread": 0})

    return JSONResponse(result)
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8045, reload=True)
