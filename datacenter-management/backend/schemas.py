from pydantic import BaseModel
from typing import Optional, Dict, List, Union
from datetime import datetime

# Port schemas
class PortBase(BaseModel):
    name: str
    type: str
    speed: int
    is_occupied: bool = False
    business_info: Optional[str] = None
    remote_device_id: Optional[int] = None
    remote_port_id: Optional[int] = None

class PortCreate(PortBase):
    device_id: int

class DeviceInfo(BaseModel):
    name: str
    device_type: str
    manufacturer: str
    model: str

    class Config:
        from_attributes = True

class Port(PortBase):
    id: int
    device_id: int
    created_at: datetime
    updated_at: datetime
    device: Optional[DeviceInfo] = None

    class Config:
        from_attributes = True

# Device schemas
class DeviceBase(BaseModel):
    name: str
    device_type: str
    manufacturer: str
    model: str
    serial_number: str
    position_u: int
    height_u: int
    power_consumption: int
    ip_address: Optional[str] = None
    rack_id: int
    status: str = "active"

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    ports: List[Port] = []

    class Config:
        from_attributes = True

# DataCenter schemas
class DataCenterBase(BaseModel):
    name: str
    location: str
    floor_plan: Optional[Dict] = None
    facilities_data: Optional[Dict] = None
    total_area: float

class DataCenterCreate(DataCenterBase):
    pass

class DataCenter(DataCenterBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Rack schemas
class RackBase(BaseModel):
    name: str
    datacenter_id: int
    position_x: float
    position_y: float
    height: int
    width: float
    depth: float
    max_power: float

class RackCreate(RackBase):
    pass

class RackPosition(BaseModel):
    position_x: int
    position_y: int

class Rack(RackBase):
    id: int
    devices: List[Device] = []

    class Config:
        from_attributes = True

# Device position update schema
class DevicePosition(BaseModel):
    rack_id: int
    position_u: int
    horizontal_position: Optional[int] = None

class FacilityBase(BaseModel):
    name: str
    facility_type: str
    position_x: float
    position_y: float
    rotation: float = 0
    width: float
    height: float
    properties: Optional[Dict] = None

class FacilityCreate(FacilityBase):
    datacenter_id: int

class Facility(FacilityBase):
    id: int
    datacenter_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 