import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# 从环境变量中获取数据库连接信息
db_url = os.getenv('DATABASE_URL')
if not db_url:
    raise ValueError("DATABASE_URL not found in environment variables")

# 解析数据库URL
# 格式：mysql+pymysql://user:password@host/dbname
parts = db_url.replace('mysql+pymysql://', '').split('@')
user_pass = parts[0].split(':')
host_db = parts[1].split('/')

user = user_pass[0]
password = user_pass[1]
host = host_db[0]
dbname = host_db[1]

# 连接MySQL服务器（不指定数据库）
conn = pymysql.connect(
    host=host,
    user=user,
    password=password
)

try:
    with conn.cursor() as cursor:
        # 创建数据库
        cursor.execute(f'CREATE DATABASE IF NOT EXISTS {dbname}')
        print(f"Database '{dbname}' created successfully!")
except Exception as e:
    print(f"Error creating database: {e}")
finally:
    conn.close() 