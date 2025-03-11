from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, DataCenter, Rack
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
    # 创建示例数据中心
    datacenter = DataCenter(
        name="测试机房A区",
        location="北京市海淀区",
        total_area=1000,
        floor_plan={
            "width": 1000,
            "height": 800,
            "grid_size": 50
        }
    )
    db.add(datacenter)
    db.flush()  # 获取datacenter.id

    # 创建示例机柜
    racks = [
        # A列机柜 (每个机柜宽0.6米，深1.0米，对应2.4格和4格)
        Rack(name="A01", datacenter_id=datacenter.id, position_x=8, position_y=8, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="A02", datacenter_id=datacenter.id, position_x=8, position_y=16, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="A03", datacenter_id=datacenter.id, position_x=8, position_y=24, height=42, width=0.6, depth=1.0, max_power=5.0),
        
        # B列机柜
        Rack(name="B01", datacenter_id=datacenter.id, position_x=16, position_y=8, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="B02", datacenter_id=datacenter.id, position_x=16, position_y=16, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="B03", datacenter_id=datacenter.id, position_x=16, position_y=24, height=42, width=0.6, depth=1.0, max_power=5.0),
        
        # C列机柜
        Rack(name="C01", datacenter_id=datacenter.id, position_x=24, position_y=8, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="C02", datacenter_id=datacenter.id, position_x=24, position_y=16, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="C03", datacenter_id=datacenter.id, position_x=24, position_y=24, height=42, width=0.6, depth=1.0, max_power=5.0),
        
        # D列机柜
        Rack(name="D01", datacenter_id=datacenter.id, position_x=32, position_y=8, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="D02", datacenter_id=datacenter.id, position_x=32, position_y=16, height=42, width=0.6, depth=1.0, max_power=5.0),
        Rack(name="D03", datacenter_id=datacenter.id, position_x=32, position_y=24, height=42, width=0.6, depth=1.0, max_power=5.0),
    ]

    for rack in racks:
        db.add(rack)

    # 提交所有更改
    db.commit()
    print("示例数据创建成功！")

except Exception as e:
    print(f"创建示例数据时出错：{str(e)}")
    db.rollback()
finally:
    db.close() 