from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import models
import schemas
from database import engine, get_db

# 创建数据库表
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="数据中心设备管理系统")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 机房相关接口
@app.post("/datacenters/", response_model=schemas.DataCenter)
def create_datacenter(datacenter: schemas.DataCenterCreate, db: Session = Depends(get_db)):
    db_datacenter = models.DataCenter(**datacenter.dict())
    db.add(db_datacenter)
    db.commit()
    db.refresh(db_datacenter)
    return db_datacenter

@app.get("/datacenters/", response_model=List[schemas.DataCenter])
def get_datacenters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.DataCenter).offset(skip).limit(limit).all()

@app.get("/datacenters/{datacenter_id}", response_model=schemas.DataCenter)
def get_datacenter(datacenter_id: int, db: Session = Depends(get_db)):
    datacenter = db.query(models.DataCenter).filter(models.DataCenter.id == datacenter_id).first()
    if datacenter is None:
        raise HTTPException(status_code=404, detail="机房未找到")
    return datacenter

@app.delete("/datacenters/{datacenter_id}")
def delete_datacenter(datacenter_id: int, db: Session = Depends(get_db)):
    # 首先删除该机房下的所有设备
    db.query(models.Device).filter(
        models.Device.rack_id.in_(
            db.query(models.Rack.id).filter(models.Rack.datacenter_id == datacenter_id)
        )
    ).delete(synchronize_session=False)
    
    # 删除该机房的所有机柜
    db.query(models.Rack).filter(models.Rack.datacenter_id == datacenter_id).delete()
    
    # 删除机房
    datacenter = db.query(models.DataCenter).filter(models.DataCenter.id == datacenter_id).first()
    if datacenter is None:
        raise HTTPException(status_code=404, detail="机房未找到")
    
    db.delete(datacenter)
    db.commit()
    return {"message": "机房及其所有设备已成功删除"}

# 机柜相关接口
@app.post("/racks/", response_model=schemas.Rack)
def create_rack(rack: schemas.RackCreate, db: Session = Depends(get_db)):
    db_rack = models.Rack(**rack.dict())
    db.add(db_rack)
    db.commit()
    db.refresh(db_rack)
    return db_rack

@app.get("/racks/", response_model=List[schemas.Rack])
def get_racks(datacenter_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Rack)
    if datacenter_id:
        query = query.filter(models.Rack.datacenter_id == datacenter_id)
    return query.offset(skip).limit(limit).all()

@app.get("/racks/{rack_id}", response_model=schemas.Rack)
def get_rack(rack_id: int, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if rack is None:
        raise HTTPException(status_code=404, detail="机柜未找到")
    return rack

@app.put("/racks/{rack_id}", response_model=schemas.Rack)
def update_rack(rack_id: int, rack: schemas.RackCreate, db: Session = Depends(get_db)):
    db_rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if db_rack is None:
        raise HTTPException(status_code=404, detail="机柜未找到")
    
    # 更新机柜信息
    for key, value in rack.dict().items():
        setattr(db_rack, key, value)
    
    db.commit()
    db.refresh(db_rack)
    return db_rack

@app.put("/racks/{rack_id}/position")
def update_rack_position(rack_id: int, position: schemas.RackPosition, db: Session = Depends(get_db)):
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if rack is None:
        raise HTTPException(status_code=404, detail="机柜未找到")
    
    # 检查新位置是否已被占用
    existing_rack = db.query(models.Rack).filter(
        models.Rack.datacenter_id == rack.datacenter_id,
        models.Rack.position_x == position.position_x,
        models.Rack.position_y == position.position_y,
        models.Rack.id != rack_id
    ).first()
    
    if existing_rack:
        raise HTTPException(status_code=400, detail="该位置已被其他机柜占用")
    
    rack.position_x = position.position_x
    rack.position_y = position.position_y
    db.commit()
    return {"status": "success"}

@app.delete("/racks/{rack_id}")
def delete_rack(rack_id: int, db: Session = Depends(get_db)):
    # 首先删除机柜中的所有设备
    db.query(models.Device).filter(models.Device.rack_id == rack_id).delete()
    
    # 删除机柜
    rack = db.query(models.Rack).filter(models.Rack.id == rack_id).first()
    if rack is None:
        raise HTTPException(status_code=404, detail="机柜未找到")
    
    datacenter_id = rack.datacenter_id  # 保存数据中心ID用于返回
    db.delete(rack)
    db.commit()
    
    return {"message": "机柜及其所有设备已成功删除", "datacenter_id": datacenter_id}

# 设备相关接口
@app.post("/devices/", response_model=schemas.Device)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = models.Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@app.get("/devices/", response_model=List[schemas.Device])
def get_devices(rack_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Device)
    if rack_id:
        query = query.filter(models.Device.rack_id == rack_id)
    return query.offset(skip).limit(limit).all()

@app.get("/devices/{device_id}", response_model=schemas.Device)
def get_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="设备未找到")
    return device

@app.put("/devices/{device_id}", response_model=schemas.Device)
def update_device(device_id: int, device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if db_device is None:
        raise HTTPException(status_code=404, detail="设备未找到")
    
    # 更新设备信息
    for key, value in device.dict().items():
        setattr(db_device, key, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device

@app.put("/devices/{device_id}/position")
def update_device_position(device_id: int, position: schemas.DevicePosition, db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="设备未找到")
    
    device.rack_id = position.rack_id
    device.position_u = position.position_u
    db.commit()
    return {"status": "success"}

@app.delete("/devices/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db)):
    device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if device is None:
        raise HTTPException(status_code=404, detail="设备未找到")
    
    db.delete(device)
    db.commit()
    return {"message": "设备已成功删除"}

# 端口相关接口
@app.post("/ports/", response_model=schemas.Port)
def create_port(port: schemas.PortCreate, db: Session = Depends(get_db)):
    db_port = models.Port(**port.dict())
    db.add(db_port)
    db.commit()
    db.refresh(db_port)
    return db_port

@app.get("/ports/", response_model=List[schemas.Port])
def get_ports(device_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    query = db.query(models.Port)
    if device_id:
        query = query.filter(models.Port.device_id == device_id)
    return query.offset(skip).limit(limit).all()

@app.get("/ports/{port_id}", response_model=schemas.Port)
def get_port(port_id: int, db: Session = Depends(get_db)):
    port = db.query(models.Port).filter(models.Port.id == port_id).first()
    if port is None:
        raise HTTPException(status_code=404, detail="端口未找到")
    return port

@app.put("/ports/{port_id}", response_model=schemas.Port)
def update_port(port_id: int, port: schemas.PortCreate, db: Session = Depends(get_db)):
    db_port = db.query(models.Port).filter(models.Port.id == port_id).first()
    if db_port is None:
        raise HTTPException(status_code=404, detail="端口未找到")
    
    for key, value in port.dict().items():
        setattr(db_port, key, value)
    
    db.commit()
    db.refresh(db_port)
    return db_port

@app.delete("/ports/{port_id}")
def delete_port(port_id: int, db: Session = Depends(get_db)):
    port = db.query(models.Port).filter(models.Port.id == port_id).first()
    if port is None:
        raise HTTPException(status_code=404, detail="端口未找到")
    
    db.delete(port)
    db.commit()
    return {"message": "端口已成功删除"}

@app.put("/ports/{port_id}/connect")
def connect_ports(
    port_id: int, 
    remote_port_id: int,
    db: Session = Depends(get_db)
):
    # 获取两个端口
    port1 = db.query(models.Port).filter(models.Port.id == port_id).first()
    port2 = db.query(models.Port).filter(models.Port.id == remote_port_id).first()
    
    if not port1 or not port2:
        raise HTTPException(status_code=404, detail="端口未找到")
    
    if port1.is_occupied or port2.is_occupied:
        raise HTTPException(status_code=400, detail="端口已被占用")
    
    # 建立连接
    port1.remote_device_id = port2.device_id
    port1.remote_port_id = port2.id
    port1.is_occupied = True
    
    port2.remote_device_id = port1.device_id
    port2.remote_port_id = port1.id
    port2.is_occupied = True
    
    db.commit()
    return {"message": "端口连接成功"}

@app.put("/ports/{port_id}/disconnect")
def disconnect_port(port_id: int, db: Session = Depends(get_db)):
    port = db.query(models.Port).filter(models.Port.id == port_id).first()
    if not port:
        raise HTTPException(status_code=404, detail="端口未找到")
    
    if port.remote_port_id:
        remote_port = db.query(models.Port).filter(models.Port.id == port.remote_port_id).first()
        if remote_port:
            remote_port.remote_device_id = None
            remote_port.remote_port_id = None
            remote_port.is_occupied = False
    
    port.remote_device_id = None
    port.remote_port_id = None
    port.is_occupied = False
    
    db.commit()
    return {"message": "端口断开连接成功"} 