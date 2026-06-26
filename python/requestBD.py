import aiosqlite, asyncio
DB_NAME = "skillforge.db"


async def init_db():
    # эта строка автоматически подключается к бд файлу если его нет то создает его
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                fio TEXT,
                number TEXT,
                networks TEXT,
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

        await db.commit()


async def about_table(user_id):
    async with aiosqlite.connect(DB_NAME) as db:
        await db.execute(
            f"CREATE TABLE IF NOT EXISTS {str(user_id) + "about"} (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, year INTEGER, about_text TEXT, FOREIGN KEY (user_id) REFERENCES users (id))")
        await db.commit()


async def request_bd(zapros):
    async with aiosqlite.connect("skillforge.db") as db:
        async with db.execute(zapros) as cursor:
            tables = await cursor.fetchall()
            await db.commit()
            return tables

# asyncio.run(init_db())

a