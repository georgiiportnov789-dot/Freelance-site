from fastapi import FastAPI, Request, Form, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, Response, RedirectResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import os, random, uvicorn, uuid, asyncio, re, shutil, json, smtplib
from email.mime.text import MIMEText
from email.message import EmailMessage
from typing import Optional, List
from .requestBD import request_bd, init_db

app = FastAPI()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates.env.cache = None

# Временное хранилище для незавершённых регистраций (до верификации)
temp = {}

# ------------------------------------------------------------------
# НАСТРОЙКА SMTP (исправлено: порт 587 + STARTTLS)
# ------------------------------------------------------------------
SMTP_USER = "georgiiportnov789@gmail.com"
SMTP_PASSWORD = "vafihcvoyqljvvcx"  # ЗАМЕНИТЕ НА ВАШ ПАРОЛЬ ПРИЛОЖЕНИЯ, ЕСЛИ НУЖНО


async def send_verification_email(to_email: str, code: str):
    """Отправляет письмо с кодом подтверждения через STARTTLS (порт 587)."""
    msg = MIMEText(f"Ваш код для активации аккаунта: {code}")
    msg["Subject"] = "Код подтверждения SKILLFORGE"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()                     # Включаем шифрование
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print("✅ Письмо успешно отправлено")
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")
        raise


# ------------------------------------------------------------------
# СТАРТОВОЕ СОБЫТИЕ – инициализация БД
# ------------------------------------------------------------------
@app.on_event("startup")
async def startup():
    await init_db()


# ------------------------------------------------------------------
# ВСЕ ОБРАБОТЧИКИ (без изменений)
# ------------------------------------------------------------------
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
    vacancies = []
    try:
        k = 0
        for i in (await request_bd("SELECT * FROM jobs")):
            avtor = (await request_bd("SELECT fio FROM users"))[k][0]
            responses_count = json.loads(i[7]) if i[7] else []
            vacancies.append({
                "id": i[0],
                "title": i[1],
                "avtor": avtor,
                "dedline": i[3],
                "cost": i[2],
                "otcklick": str(len(responses_count)),
            })
            k += 1
        return templates.TemplateResponse(request, "main.html", {"vacancies": vacancies})
    except:
        return templates.TemplateResponse(request, "main.html", )


@app.get("/about")
async def get_about_page(request: Request):
    return templates.TemplateResponse(request, "about.html")


@app.get("/applications")
async def get_appl_page(request: Request):
    vacancies = []
    session_id = request.cookies.get("session_id")
    if not session_id:
        return templates.TemplateResponse(request, "applications.html", {"vacancies": vacancies})
    try:
        rows = await request_bd("SELECT * FROM jobs WHERE executor_id = ?", (session_id,))
        for row in rows:
            responses_json = row[7] or "[]"
            try:
                responses = json.loads(responses_json)
                if not isinstance(responses, list):
                    responses = []
            except:
                responses = []
            user_responded = any(entry.get("user_id") == session_id for entry in responses)
            if user_responded:
                author_rows = await request_bd("SELECT fio FROM users WHERE id = ?", (row[5],))
                avtor = author_rows[0][0] if author_rows else "Неизвестный"
                vacancies.append({
                    "id": row[0],
                    "title": row[1],
                    "avtor": avtor,
                    "dedline": row[3],
                    "cost": row[2],
                    "otcklick": str(len(responses)),
                })
        return templates.TemplateResponse(request, "applications.html", {"vacancies": vacancies})
    except Exception as e:
        print(f"Ошибка в /applications: {e}")
        return templates.TemplateResponse(request, "applications.html", {"vacancies": vacancies})


@app.get("/orders")
async def get_ord_page(request: Request):
    vacancies = []
    try:
        session_id = request.cookies.get("session_id")
        rows = await request_bd("SELECT * FROM jobs WHERE author_id = ?", (session_id,))
        for i in rows:
            avtor = (await request_bd("SELECT fio FROM users WHERE id = ?", (session_id,)))[0][0]
            responses_count = json.loads(i[7]) if i[7] else []
            vacancies.append({
                "id": i[0],
                "title": i[1],
                "avtor": avtor,
                "dedline": i[3],
                "cost": i[2],
                "otcklick": str(len(responses_count)),
            })
        return templates.TemplateResponse(request, "orders.html", {"vacancies": vacancies})
    except:
        return templates.TemplateResponse(request, "orders.html", )


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
                    "id": session_id,
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

    # ---- ОТПРАВКА ПИСЬМА С КОДОМ ----
    try:
        await send_verification_email(email, verify_code)
    except Exception as e:
        return Response(f"Не удалось отправить код на почту: {e}")

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
    session_key = str(session_id)
    if session_key not in temp:
        return Response("Сессия не найдена. Зарегистрируйтесь заново.")

    verify_code = str(random.randint(100000, 999999))
    print(f"Новый код верификации: {verify_code}")

    # ---- ОТПРАВКА НОВОГО КОДА ----
    try:
        await send_verification_email(temp[session_key]["email"], verify_code)
    except Exception as e:
        return Response(f"Не удалось отправить код на почту: {e}")

    temp[session_key]["verify-code"] = verify_code
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
                "id": user_id,
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


# --------------------------- СОЗДАНИЕ ЗАДАЧИ ---------------------------
@app.post("/tasks/create")
async def create_task(
        request: Request,
        title: str = Form(...),
        profession: str = Form(...),
        cost: str = Form(...),
        deadline: str = Form(...),
        description: str = Form(...),
        photos: Optional[List[UploadFile]] = File(None),
):
    jobs_id = str(uuid.uuid4())
    len_photo = len(photos) if photos else 1
    await request_bd(
        "INSERT INTO jobs (id, header, salary_min, date, description, author_id, photos, profession) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (jobs_id, title, cost, deadline, description, request.cookies.get("session_id"), str(len_photo), profession)
    )
    upload_dir = os.path.join(BASE_DIR, "static", "media", "jobs_photo", str(jobs_id))
    os.makedirs(upload_dir, exist_ok=True)

    if photos and any(p.filename for p in photos):
        k = 0
        for photo in photos:
            if photo.filename:
                k += 1
                ext = ".png"
                filename = f"{k}{ext}"
                file_path = os.path.join(upload_dir, filename)
                content = await photo.read()
                with open(file_path, "wb") as f:
                    f.write(content)
    else:
        default_source = os.path.join(BASE_DIR, "static", "media", "sistem-media", "Image.png")
        if os.path.exists(default_source):
            default_dest = os.path.join(upload_dir, "1.png")
            shutil.copy2(default_source, default_dest)
        else:
            print("Дефолтное изображение не найдено!")

    response = Response()
    response.headers["Location"] = "/orders"
    response.status_code = 302
    return response


# --------------------------- ФИЛЬТРЫ ---------------------------
@app.post("/filters/mytasks")
async def filter_mytasks(request: Request, salary_from: str = Form(None), salary_to: str = Form(None),
                         professions: Optional[List[str]] = Form(None, alias="professions[]")):
    query = """
        SELECT j.id, j.header, u.fio, j.date, j.salary_min, j.responses_count
        FROM jobs j
        LEFT JOIN users u ON j.author_id = u.id
        WHERE j.author_id = ?
    """
    params = [request.cookies.get("session_id")]
    if professions:
        placeholders = ",".join(["?"] * len(professions))
        query += f" AND j.profession IN ({placeholders})"
        params.extend(professions)
    if salary_from is not None:
        query += " AND j.salary_min >= ?"
        params.append(salary_from)
    if salary_to is not None:
        query += " AND j.salary_min <= ?"
        params.append(salary_to)
    query += " ORDER BY j.date DESC"
    rows = await request_bd(query, tuple(params))
    vacancies = []
    try:
        for i in rows:
            vacancies.append({
                "id": i[0],
                "title": i[1],
                "avtor": i[2],
                "dedline": i[3],
                "cost": i[4],
                "otcklick": len(list(i[5])),
            })
        return templates.TemplateResponse(request, "orders.html", {"vacancies": vacancies, "fragment": True})
    except:
        return templates.TemplateResponse(request, "orders.html", )


@app.post("/filters")
async def filter_tasks(request: Request, salary_from: str = Form(None), salary_to: str = Form(None),
                       professions: Optional[List[str]] = Form(None, alias="professions[]")):
    query = """
        SELECT j.id, j.header, u.fio, j.date, j.salary_min, j.responses_count
        FROM jobs j
        LEFT JOIN users u ON j.author_id = u.id
        WHERE executor_id IS NULL
    """
    params = []
    if professions:
        placeholders = ",".join(["?"] * len(professions))
        query += f" AND j.profession IN ({placeholders})"
        params.extend(professions)
    if salary_from is not None:
        query += " AND j.salary_min >= ?"
        params.append(salary_from)
    if salary_to is not None:
        query += " AND j.salary_min <= ?"
        params.append(salary_to)
    query += " ORDER BY j.date DESC"
    rows = await request_bd(query, tuple(params))
    vacancies = []
    try:
        for i in rows:
            vacancies.append({
                "id": i[0],
                "title": i[1],
                "avtor": i[2],
                "dedline": i[3],
                "cost": i[4],
                "otcklick": len(list(i[5])),
            })
        return templates.TemplateResponse(request, "main.html", {"vacancies": vacancies, "fragment": True})
    except:
        return templates.TemplateResponse(request, "main.html", )


@app.post("/filters/myapplication")
async def filter_myapplication(request: Request, salary_from: str = Form(None), salary_to: str = Form(None),
                               professions: Optional[List[str]] = Form(None, alias="professions[]")):
    query = """
        SELECT j.id, j.header, u.fio, j.date, j.salary_min, j.responses_count
        FROM jobs j
        LEFT JOIN users u ON j.author_id = u.id
        WHERE j.executor_id = ?
    """
    params = [request.cookies.get("session_id")]
    if professions:
        placeholders = ",".join(["?"] * len(professions))
        query += f" AND j.profession IN ({placeholders})"
        params.extend(professions)
    if salary_from is not None:
        query += " AND j.salary_min >= ?"
        params.append(salary_from)
    if salary_to is not None:
        query += " AND j.salary_min <= ?"
        params.append(salary_to)
    query += " ORDER BY j.date DESC"
    rows = await request_bd(query, tuple(params))
    vacancies = []
    try:
        for i in rows:
            responses_count = json.loads(i[5]) if i[5] else []
            vacancies.append({
                "id": i[0],
                "title": i[1],
                "avtor": i[2],
                "dedline": i[3],
                "cost": i[4],
                "otcklick": str(len(responses_count)),
            })
        return templates.TemplateResponse(request, "orders.html", {"vacancies": vacancies, "fragment": True})
    except:
        return templates.TemplateResponse(request, "orders.html", )


@app.get("/task/{vacancy_id}")
async def get_task_detail(request: Request, vacancy_id: str):
    rows = await request_bd("SELECT * FROM jobs WHERE id = ?", (vacancy_id,))
    if not rows:
        return Response("Задача не найдена", status_code=404)
    vacancy = rows[0]
    job_id = vacancy[0]
    title = vacancy[1]
    price = vacancy[2]
    deadline = vacancy[3]
    description = vacancy[4]
    author_id = vacancy[5]
    photos_count_str = vacancy[6] or "0"
    responses_json = vacancy[7] or "[]"
    profession = vacancy[8] or "Не указана"
    executor_id = vacancy[9]

    author_rows = await request_bd("SELECT fio FROM users WHERE id = ?", (author_id,))
    author_name = author_rows[0][0] if author_rows else "Неизвестный"
    parts = author_name.strip().split()
    initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"
    session_id = request.cookies.get("session_id")
    is_author = (session_id == author_id)

    try:
        photos_count = int(photos_count_str) if photos_count_str else 0
    except:
        photos_count = 0
    images = []
    if photos_count > 0:
        for i in range(1, photos_count + 1):
            images.append(f"/static/media/jobs_photo/{job_id}/{i}.png")
    else:
        images.append("/static/media/sistem-media/Image.png")

    try:
        responses = json.loads(responses_json) if responses_json else []
        if not isinstance(responses, list):
            responses = []
    except:
        responses = []

    my_cost = None
    for entry in responses:
        if entry.get("user_id") == session_id:
            my_cost = entry.get("cost")
            break

    task_data = {
        "id": job_id,
        "title": title,
        "price": price,
        "price_prefix": "до" if is_author else "от",
        "deadline": deadline,
        "description": description,
        "profession": profession,
        "author_name": author_name,
        "author_id": author_id,
        "initials": initials,
        "is_author": is_author,
        "images": images,
        "responses": responses,
        "responses_count": len(responses),
        "my_cost": my_cost,
        "executor_id": executor_id,
    }
    if is_author:
        return templates.TemplateResponse(request, "task-detail.html", {"task": task_data})
    elif executor_id == session_id:
        return templates.TemplateResponse(request, "task-open.html", {"task": task_data})
    else:
        return templates.TemplateResponse(request, "view-application.html", {"task": task_data})


@app.post("/task/delete")
async def delete_task(request: Request):
    form = await request.form()
    task_id = form.get("task_id")
    if not task_id:
        return Response("ID задачи не передан", status_code=400)
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Не авторизован", status_code=403)
    rows = await request_bd("SELECT author_id FROM jobs WHERE id = ?", (task_id,))
    if not rows:
        return Response("Задача не найдена", status_code=404)
    author_id = rows[0][0]
    if author_id != session_id:
        return Response("Вы не автор этой задачи", status_code=403)
    await request_bd("DELETE FROM jobs WHERE id = ?", (task_id,))
    upload_dir = os.path.join(BASE_DIR, "static", "media", "jobs_photo", task_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    response = Response()
    response.headers["HX-Redirect"] = "/orders"
    return response


@app.post("/task/cost/{task_id}")
async def update_task_cost(request: Request, task_id: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Не авторизован", status_code=401)
    form = await request.form()
    offer_price = form.get("offer_price")
    if offer_price is None:
        return Response("Цена не указана", status_code=400)
    try:
        price = int(offer_price)
    except ValueError:
        return Response("Некорректная цена", status_code=400)
    rows = await request_bd("SELECT * FROM jobs WHERE id = ?", (task_id,))
    if not rows:
        return Response("Задача не найдена", status_code=404)
    vacancy = rows[0]
    responses_json = vacancy[7] or "[]"
    try:
        responses = json.loads(responses_json)
        if not isinstance(responses, list):
            responses = []
    except:
        responses = []
    index = None
    for i, entry in enumerate(responses):
        if entry.get("user_id") == session_id:
            index = i
            break
    if price == 0:
        if index is not None:
            responses.pop(index)
    else:
        if index is not None:
            responses[index]["cost"] = price
        else:
            user_rows = await request_bd("SELECT fio FROM users WHERE id = ?", (session_id,))
            fio = user_rows[0][0] if user_rows else "Неизвестный"
            parts = fio.strip().split()
            initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"
            responses.append({
                "user_id": session_id,
                "cost": price,
                "initials": initials
            })
    await request_bd(
        "UPDATE jobs SET responses_count = ? WHERE id = ?",
        (json.dumps(responses, ensure_ascii=False), task_id)
    )
    response = Response()
    response.headers["HX-Redirect"] = f"/task/{task_id}"
    return response


@app.post("/task/hire/{task_id}")
async def hire_user(request: Request, task_id: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Не авторизован", status_code=401)
    form = await request.form()
    user_id = form.get("user_id")
    if not user_id:
        return Response("user_id не указан", status_code=400)
    rows = await request_bd("SELECT author_id FROM jobs WHERE id = ?", (task_id,))
    if not rows:
        return Response("Задача не найдена", status_code=404)
    author_id = rows[0][0]
    if author_id != session_id:
        return Response("Только автор может нанимать", status_code=403)
    await request_bd("UPDATE jobs SET executor_id = ? WHERE id = ?", (user_id, task_id))
    response = Response()
    response.headers["HX-Redirect"] = f"/task/{task_id}"
    return response


@app.post("/task/complete/{task_id}")
async def complete_task(request: Request, task_id: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return Response("Не авторизован", status_code=401)
    rows = await request_bd("SELECT author_id FROM jobs WHERE id = ?", (task_id,))
    if not rows:
        return Response("Задача не найдена", status_code=404)
    author_id = rows[0][0]
    if author_id != session_id:
        return Response("Только автор может завершить", status_code=403)
    await request_bd("DELETE FROM jobs WHERE id = ?", (task_id,))
    upload_dir = os.path.join(BASE_DIR, "static", "media", "jobs_photo", task_id)
    if os.path.exists(upload_dir):
        shutil.rmtree(upload_dir)
    response = Response()
    response.headers["HX-Redirect"] = "/orders"
    return response


# ------------------------------------------------------------------
# WebSocket менеджер и эндпоинты
# ------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
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


@app.get("/me")
async def get_me(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse({"error": "not authenticated"}, status_code=401)
    rows = await request_bd("SELECT id, fio FROM users WHERE id = ?", (session_id,))
    if not rows:
        return JSONResponse({"error": "user not found"}, status_code=404)
    return JSONResponse({"id": rows[0][0], "name": rows[0][1] or ""})


@app.get("/chats")
async def get_chats(request: Request):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse([], status_code=401)
    rows = await request_bd("""
        SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS partner_id
        FROM messages
        WHERE sender_id = ? OR receiver_id = ?
    """, (session_id, session_id, session_id))
    chats = []
    for (partner_id,) in rows:
        user_rows = await request_bd("SELECT fio FROM users WHERE id = ?", (partner_id,))
        if not user_rows:
            continue
        fio = user_rows[0][0] or ""
        parts = fio.strip().split()
        initials = "".join(p[0].upper() for p in parts[:2] if p) or "?"
        last_rows = await request_bd("""
            SELECT text, created_at
            FROM messages
            WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            ORDER BY created_at DESC LIMIT 1
        """, (session_id, partner_id, partner_id, session_id))
        last_message = last_rows[0][0][:40] if last_rows else ""
        unread_rows = await request_bd("""
            SELECT COUNT(*)
            FROM messages
            WHERE sender_id = ? AND receiver_id = ?
            AND created_at > (SELECT COALESCE(MAX(created_at), '1970-01-01')
                              FROM messages
                              WHERE sender_id = ? AND receiver_id = ?)
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


@app.get("/messages/{with_user_id}")
async def get_messages(request: Request, with_user_id: str):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return JSONResponse([], status_code=401)
    rows = await request_bd("""
        SELECT sender_id, receiver_id, text, created_at
        FROM messages
        WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
        ORDER BY created_at ASC LIMIT 200
    """, (session_id, with_user_id, with_user_id, session_id))
    return JSONResponse([
        {"sender_id": r[0], "receiver_id": r[1], "text": r[2], "created_at": r[3]}
        for r in rows
    ])


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
        result.append({
            "id": uid,
            "name": fio,
            "initials": initials,
            "last_message": "",
            "unread": 0,
        })
    return JSONResponse(result)


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
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
            await request_bd(
                "INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)",
                (user_id, receiver_id, text),
            )
            ts_rows = await request_bd("""
                SELECT created_at
                FROM messages
                WHERE sender_id = ? AND receiver_id = ?
                ORDER BY id DESC LIMIT 1
            """, (user_id, receiver_id))
            created_at = ts_rows[0][0] if ts_rows else ""
            msg = {
                "sender_id": user_id,
                "receiver_id": receiver_id,
                "text": text,
                "created_at": created_at,
            }
            await manager.broadcast_to_pair(user_id, receiver_id, msg)
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        print(f"WS ошибка ({user_id}): {e}")
        manager.disconnect(user_id)


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8016, reload=True)
