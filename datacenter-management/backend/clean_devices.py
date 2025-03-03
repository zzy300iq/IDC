from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Device, Port
from dotenv import load_dotenv
import os

load_dotenv()

# 获取数据库连接URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:123456@localhost/datacenter_management"
)

# 创建数据库引擎
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

try:
    # 首先删除所有端口
    db.query(Port).delete()
    print("已清理所有端口数据")
    
    # 然后删除所有设备
    db.query(Device).delete()
    print("已清理所有设备数据")
    
    # 提交更改
    db.commit()
    print("数据清理完成！")

except Exception as e:
    print(f"清理数据时出错：{str(e)}")
    db.rollback()
finally:
    db.close() 