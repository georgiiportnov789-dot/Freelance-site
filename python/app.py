from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Request, Form, Response
from starlette.middleware.base import BaseHTTPMiddleware  # Импортируем Middleware
import os
import uvicorn
import random


# Создаем класс для управления заголовками (Анти-кэш)
class NoCacheMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)

        # Если файл — это CSS или HTML, запрещаем кэширование
        if request.url.path.endswith((".css", ".html")):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"

        return response


app = FastAPI()

# ПОДКЛЮЧАЕМ MIDDLEWARE сразу после создания app
app.add_middleware(NoCacheMiddleware)

# ... (дальше идет ваш код с mount, templates и маршрутами)

# Путь к корню проекта
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Подключаем статику
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

# Подключаем шаблоны
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
templates.env.cache = None


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


@app.get("/verify")
async def get_login_page(request: Request):
    return templates.TemplateResponse(request, "verify.html")


# 2. Маршрут для обработки кнопки (POST)
@app.post("/register")
async def register(request: Request,
                   name: str = Form(...),
                   email: str = Form(...),
                   password: str = Form(...)):
    # 1. Здесь ваша логика обработки данных (например, сохранение в БД)
    print(f"Данные пользователя: {name}, {email}")

    # 2. Создаем ответ
    response = Response()

    # 3. Добавляем заголовок, который HTMX поймет как команду на переход
    response.headers["HX-Redirect"] = "/verify"

    return response


if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
