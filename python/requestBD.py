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
                id TEXT PRIMARY KEY,
                header TEXT NOT NULL,
                salary_min TEXT NOT NULL,
                date TEXT NOT NULL,
                description TEXT,
                author_id TEXT NOT NULL,
                photos TEXT,
                responses_count INTEGER DEFAULT 0,
                profession TEXT,
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

        await db.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id TEXT NOT NULL,
                receiver_id TEXT NOT NULL,
                text TEXT NOT NULL,
                created_at TEXT DEFAULT (datetime('now','localtime')),
                FOREIGN KEY (sender_id) REFERENCES users (id),
                FOREIGN KEY (receiver_id) REFERENCES users (id)
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
