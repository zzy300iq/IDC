from sqlalchemy import create_engine
from models import Base
from database import SQLALCHEMY_DATABASE_URL

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # 删除所有现有表
    Base.metadata.drop_all(bind=engine)
    
    # 创建新表
    Base.metadata.create_all(bind=engine)
    
    print("数据库迁移完成！")

if __name__ == "__main__":
    migrate() 