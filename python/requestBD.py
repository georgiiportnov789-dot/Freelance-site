import aiosqlite
import asyncio

DB_NAME = "skillforge.db"


async def init_db():
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fio TEXT,
                number TEXT,
                networks TEXT,
                university TEXT,
                responses TEXT
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                header TEXT NOT NULL,
                salary_min INTEGER NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                author_id INTEGER NOT NULL,
                photos TEXT,
                responses_count INTEGER DEFAULT 0,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS socials (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                url TEXT NOT NULL,
                name TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        await db.execute('''
            CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                year INTEGER NOT NULL,
                description TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        await db.commit()


async def request_bd(zapros, params=()):
    """
    Выполняет запрос к БД.
    Для SELECT возвращает список строк.
    Для INSERT/UPDATE/DELETE возвращает пустой список.

    Пример: await request_bd("SELECT fio FROM users WHERE id = ?", (session_id,))
    """
    async with aiosqlite.connect(DB_NAME) as db:
        async with db.execute(zapros, params) as cursor:
            tables = await cursor.fetchall()
            await db.commit()
            return tables
