from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import uvicorn
import random

app = FastAPI()

# Путь к корню проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Подключаем статику
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Подключаем шаблоны
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))


@app.get("/")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "index.html")


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
    return templates.TemplateResponse(request, "profile-edit.html")


# 2. Маршрут для обработки кнопки (POST)
@app.post("/register")
async def register(
        name: str = Form(...),
        email: str = Form(...),
        password: str = Form(...)
):
    # Этот код сработает ТОЛЬКО когда пользователь нажмет кнопку
    print(f"Данные получены: {name}, {email}, {password}")

    # Возвращаем ответ для HTMX (он вставится в <div id="register-result">)
    return HTMLResponse(f"<h3>Привет, {name}! Данные успешно отправлены.</h3>")


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=random.randint(49152, 65535), reload=True)
