from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, Form, Response
import os, random, uvicorn, uuid, requestBD, asyncio

temp = {"id": ["email", "password", "name", "verify-code"]}
app = FastAPI()

# Путь к корню проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Подключаем статику
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Подключаем шаблоны
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates.env.cache = None


# asyncio.run(requestBD("")) копируешь этот вызов функции внутрь ставишь любой нужный запрос и возвращается ответ

@app.get("/")
async def get_reg_page(request: Request):
    session_id = request.cookies.get("session_id")

    # 2. Если нет, создаем новый
    response = templates.TemplateResponse(request, "index.html")
    if not session_id:
        new_session_id = str(uuid.uuid4())
        # Отправляем куку браузеру
        response.set_cookie(key="session_id", value=new_session_id, httponly=True)

    return response


@app.get("/login")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "login.html")


@app.get("/main")
async def get_main_page(request: Request):
    # Здесь НЕТ никаких Form()
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


@app.get("/my_profile")
async def get_myp_page(request: Request):
    return templates.TemplateResponse(request, "profile-edit.html", )


@app.get("/verify")
async def get_ver_page(request: Request):
    return templates.TemplateResponse(request, "verify.html")


@app.post("/register")
async def register(request: Request,
                   name: str = Form(...),
                   email: str = Form(...),
                   password: str = Form(...)):
    session_id = request.cookies.get("session_id")
    verify_code = random.randint(100000, 999999)
    print(verify_code)
    temp[str(session_id)] = {"name": name, "email": email, "password": password, "verify-code": str(verify_code)}
    response = Response()
    response.headers["HX-Redirect"] = "/verify"
    return response


@app.post("/resend-code")
async def resend_code(request: Request):
    session_id = request.cookies.get("session_id")
    verify_code = random.randint(100000, 999999)
    print(verify_code)
    temp[str(session_id)]["verify-code"] = str(verify_code)
    response = Response()
    response.headers["HX-Redirect"] = "/verify"
    return response


@app.post("/verify")
async def verify(request: Request,
                 code: str = Form(...)):
    session_id = request.cookies.get("session_id")
    print(code)
    if temp[str(session_id)]["verify-code"] == code:
        response = Response()
        response.headers["HX-Redirect"] = "/main"
        return response
    return Response('Не верный код')


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
