from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Device, Rack, Port
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
                "ip_address": "192.168.1.101",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            },
            {
                "name": "Web服务器02",
                "device_type": "server",
                "manufacturer": "Dell",
                "model": "PowerEdge R740",
                "serial_number": "DELL-WEB02",
                "position_u": 38,
                "height_u": 2,
                "power_consumption": 500,
                "status": "running",
                "ip_address": "192.168.1.102",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            },
            {
                "name": "核心交换机01",
                "device_type": "switch",
                "manufacturer": "Cisco",
                "model": "Nexus 9300",
                "serial_number": "CISCO-SW01",
                "position_u": 36,
                "height_u": 1,
                "power_consumption": 300,
                "status": "running",
                "ip_address": "192.168.1.1",
                "ports": [
                    {"name": "Ten1/0/1", "type": "10GE", "speed": 10000, "business_info": "上联端口"},
                    {"name": "Ten1/0/2", "type": "10GE", "speed": 10000, "business_info": "下联端口"}
                ]
            }
        ]
    },
    # A02机柜的设备
    {
        "rack_name": "A02",
        "devices": [
            {
                "name": "数据库服务器01",
                "device_type": "server",
                "manufacturer": "HP",
                "model": "ProLiant DL380",
                "serial_number": "HP-DB01",
                "position_u": 40,
                "height_u": 2,
                "power_consumption": 600,
                "status": "running",
                "ip_address": "192.168.1.201",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            },
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
                "ip_address": "192.168.1.202",
                "ports": [
                    {"name": "FC1", "type": "FC", "speed": 32000, "business_info": "存储网络"},
                    {"name": "FC2", "type": "FC", "speed": 32000, "business_info": "存储网络"}
                ]
            }
        ]
    },
    # B01机柜的设备
    {
        "rack_name": "B01",
        "devices": [
            {
                "name": "应用服务器01",
                "device_type": "server",
                "manufacturer": "Dell",
                "model": "PowerEdge R750",
                "serial_number": "DELL-APP01",
                "position_u": 42,
                "height_u": 2,
                "power_consumption": 550,
                "status": "running",
                "ip_address": "192.168.1.103",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            },
            {
                "name": "应用服务器02",
                "device_type": "server",
                "manufacturer": "Dell",
                "model": "PowerEdge R750",
                "serial_number": "DELL-APP02",
                "position_u": 40,
                "height_u": 2,
                "power_consumption": 550,
                "status": "running",
                "ip_address": "192.168.1.104",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            }
        ]
    },
    # B02机柜的设备
    {
        "rack_name": "B02",
        "devices": [
            {
                "name": "接入交换机01",
                "device_type": "switch",
                "manufacturer": "Cisco",
                "model": "Catalyst 9300",
                "serial_number": "CISCO-SW02",
                "position_u": 42,
                "height_u": 1,
                "power_consumption": 200,
                "status": "running",
                "ip_address": "192.168.1.2",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "服务器连接"},
                    {"name": "Ten1/0/1", "type": "10GE", "speed": 10000, "business_info": "上联端口"}
                ]
            },
            {
                "name": "接入交换机02",
                "device_type": "switch",
                "manufacturer": "Cisco",
                "model": "Catalyst 9300",
                "serial_number": "CISCO-SW03",
                "position_u": 41,
                "height_u": 1,
                "power_consumption": 200,
                "status": "running",
                "ip_address": "192.168.1.3",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "服务器连接"},
                    {"name": "Ten1/0/1", "type": "10GE", "speed": 10000, "business_info": "上联端口"}
                ]
            }
        ]
    },
    # C01机柜的设备
    {
        "rack_name": "C01",
        "devices": [
            {
                "name": "备份服务器01",
                "device_type": "server",
                "manufacturer": "HP",
                "model": "ProLiant DL360",
                "serial_number": "HP-BK01",
                "position_u": 42,
                "height_u": 1,
                "power_consumption": 400,
                "status": "running",
                "ip_address": "192.168.1.105",
                "ports": [
                    {"name": "GE1/0/1", "type": "GE", "speed": 1000, "business_info": "业务网络"},
                    {"name": "GE1/0/2", "type": "GE", "speed": 1000, "business_info": "管理网络"}
                ]
            },
            {
                "name": "备份存储01",
                "device_type": "storage",
                "manufacturer": "Dell",
                "model": "PowerVault ME4",
                "serial_number": "DELL-ST01",
                "position_u": 38,
                "height_u": 4,
                "power_consumption": 700,
                "status": "running",
                "ip_address": "192.168.1.106",
                "ports": [
                    {"name": "FC1", "type": "FC", "speed": 16000, "business_info": "存储网络"},
                    {"name": "FC2", "type": "FC", "speed": 16000, "business_info": "存储网络"}
                ]
            }
        ]
    }
]

try:
    # 为每个机柜添加设备和端口
    for rack_data in demo_devices:
        # 查找机柜
        rack = db.query(Rack).filter(Rack.name == rack_data["rack_name"]).first()
        if rack:
            print(f"为机柜 {rack_data['rack_name']} 添加设备...")
            # 添加该机柜的所有设备
            for device_data in rack_data["devices"]:
                # 提取端口数据并移除，因为Device模型中没有这个字段
                ports_data = device_data.pop("ports", [])
                
                # 创建设备
                device = Device(
                    rack_id=rack.id,
                    **device_data
                )
                db.add(device)
                db.flush()  # 获取device.id
                
                # 为设备添加端口
                for port_data in ports_data:
                    port = Port(
                        device_id=device.id,
                        **port_data
                    )
                    db.add(port)
                
            print(f"机柜 {rack_data['rack_name']} 的设备和端口添加完成")
        else:
            print(f"未找到机柜 {rack_data['rack_name']}")

    # 提交所有更改
    db.commit()
    print("\n所有示例设备和端口创建成功！")

except Exception as e:
    print(f"创建示例数据时出错：{str(e)}")
    db.rollback()
finally:
    db.close() 