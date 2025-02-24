from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Device, Rack
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

# 示例设备数据
demo_devices = [
    # A01机柜的设备
    {
        "rack_name": "A01",
        "devices": [
            {
                "name": "Web服务器01",
                "device_type": "server",
                "manufacturer": "Dell",
                "model": "PowerEdge R740",
                "serial_number": "DELL-WEB01",
                "position_u": 40,
                "height_u": 2,
                "power_consumption": 500,
                "status": "running",
                "ip_address": "192.168.1.101"
            },
            {
                "name": "核心交换机01",
                "device_type": "switch",
                "manufacturer": "Cisco",
                "model": "Nexus 9300",
                "serial_number": "CISCO-SW01",
                "position_u": 38,
                "height_u": 1,
                "power_consumption": 300,
                "status": "running",
                "ip_address": "192.168.1.1"
            }
        ]
    },
    # B01机柜的设备
    {
        "rack_name": "B01",
        "devices": [
            {
                "name": "存储阵列01",
                "device_type": "storage",
                "manufacturer": "NetApp",
                "model": "FAS8700",
                "serial_number": "NTAP-ST01",
                "position_u": 35,
                "height_u": 4,
                "power_consumption": 800,
                "status": "running",
                "ip_address": "192.168.1.201"
            }
        ]
    },
    # C01机柜的设备
    {
        "rack_name": "C01",
        "devices": [
            {
                "name": "应用服务器01",
                "device_type": "server",
                "manufacturer": "HP",
                "model": "ProLiant DL380",
                "serial_number": "HP-APP01",
                "position_u": 42,
                "height_u": 2,
                "power_consumption": 600,
                "status": "running",
                "ip_address": "192.168.1.102"
            },
            {
                "name": "应用服务器02",
                "device_type": "server",
                "manufacturer": "HP",
                "model": "ProLiant DL380",
                "serial_number": "HP-APP02",
                "position_u": 40,
                "height_u": 2,
                "power_consumption": 600,
                "status": "running",
                "ip_address": "192.168.1.103"
            },
            {
                "name": "接入交换机01",
                "device_type": "switch",
                "manufacturer": "Cisco",
                "model": "Catalyst 9300",
                "serial_number": "CISCO-SW02",
                "position_u": 38,
                "height_u": 1,
                "power_consumption": 200,
                "status": "running",
                "ip_address": "192.168.1.2"
            }
        ]
    }
]

try:
    # 为每个机柜添加设备
    for rack_data in demo_devices:
        # 查找机柜
        rack = db.query(Rack).filter(Rack.name == rack_data["rack_name"]).first()
        if rack:
            print(f"为机柜 {rack_data['rack_name']} 添加设备...")
            # 添加该机柜的所有设备
            for device_data in rack_data["devices"]:
                device = Device(
                    rack_id=rack.id,
                    **device_data
                )
                db.add(device)
            print(f"机柜 {rack_data['rack_name']} 的设备添加完成")
        else:
            print(f"未找到机柜 {rack_data['rack_name']}")

    # 提交所有更改
    db.commit()
    print("\n所有示例设备创建成功！")

except Exception as e:
    print(f"创建示例设备时出错：{str(e)}")
    db.rollback()
finally:
    db.close() 