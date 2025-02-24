from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class DataCenter(Base):
    __tablename__ = "datacenters"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True)
    location = Column(String(200))
    floor_plan = Column(JSON)  # 存储机房平面图数据
    total_area = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    racks = relationship("Rack", back_populates="datacenter")

class Rack(Base):
    __tablename__ = "racks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    datacenter_id = Column(Integer, ForeignKey("datacenters.id"))
    position_x = Column(Float)  # 机柜在机房中的X坐标
    position_y = Column(Float)  # 机柜在机房中的Y坐标
    height = Column(Integer)    # 机柜高度（U数）
    width = Column(Float)       # 机柜宽度（米）
    depth = Column(Float)       # 机柜深度（米）
    max_power = Column(Float)   # 最大承载功率（kW）
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    datacenter = relationship("DataCenter", back_populates="racks")
    devices = relationship("Device", back_populates="rack")

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    rack_id = Column(Integer, ForeignKey("racks.id"))
    device_type = Column(String(50))  # 服务器、交换机、存储等
    manufacturer = Column(String(100))
    model = Column(String(100))
    serial_number = Column(String(100), unique=True)
    position_u = Column(Integer)      # 在机柜中的U位
    height_u = Column(Integer)        # 设备高度（U数）
    power_consumption = Column(Float) # 功率消耗（W）
    status = Column(String(20))      # 运行状态
    ip_address = Column(String(15))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    rack = relationship("Rack", back_populates="devices") 