from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, Form, Response
import os, random, uvicorn, uuid

temp = {"id": ["email", "password", "name", "verify-code"]}
app = FastAPI()

# Путь к корню проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Подключаем статику
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Подключаем шаблоны
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates.env.cache = None


@app.get("/")
async def get_login_page(request: Request):
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
async def get_login_page(request: Request):
    # Здесь НЕТ никаких Form()
    return templates.TemplateResponse(request, "main.html")


@app.get("/about")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "about.html")


@app.get("/applications")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "applications.html")


@app.get("/orders")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "orders.html")


@app.get("/my_profile")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "profile-edit.html", )


@app.get("/verify")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "verify.html")


@app.post("/register")
async def register(request: Request,
                   name: str = Form(...),
                   email: str = Form(...),
                   password: str = Form(...)):
    session_id = request.cookies.get("session_id")
    temp[str(session_id)] = {"name": name, "email": email, "password": password,
                             "verify-code": random.randint(100000, 999999)}

    print(temp)
    response = Response()
    response.headers["HX-Redirect"] = "/verify"
    return response


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
