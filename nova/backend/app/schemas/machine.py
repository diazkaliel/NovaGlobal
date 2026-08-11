from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List, Optional
from app.models.machine import MachineStatus

class ReservationBaseSchema(BaseModel):
    machine_id: int
    order_id: int
    start_time: datetime
    end_time: datetime

class ReservationCreateSchema(ReservationBaseSchema):
    pass

class ReservationResponseSchema(ReservationBaseSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    system: str
    created_at: datetime

class MachineBaseSchema(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=50) # 'sublimation', 'embroidery', 'vinyl', 'dtf'
    status: MachineStatus = MachineStatus.ACTIVE
    
    # Nuevos campos de mantenimiento
    last_maintenance_date: Optional[datetime] = None
    maintenance_comments: Optional[str] = None
    maintenance_incidents: Optional[str] = None
    needs_supplies: bool = False

class MachineCreateSchema(MachineBaseSchema):
    pass

class MachineUpdateSchema(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[MachineStatus] = None
    last_maintenance_date: Optional[datetime] = None
    maintenance_comments: Optional[str] = None
    maintenance_incidents: Optional[str] = None
    needs_supplies: Optional[bool] = None

class MachineResponseSchema(MachineBaseSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    system: str
    created_at: datetime
    reservations: List[ReservationResponseSchema] = []

