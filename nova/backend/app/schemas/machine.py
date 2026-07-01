from pydantic import BaseModel, Field
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
    id: int
    system: str
    created_at: datetime

    class Config:
        from_attributes = True

class MachineBaseSchema(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(..., max_length=50) # 'sublimation', 'embroidery', 'vinyl', 'dtf'
    status: MachineStatus = MachineStatus.ACTIVE

class MachineCreateSchema(MachineBaseSchema):
    pass

class MachineResponseSchema(MachineBaseSchema):
    id: int
    system: str
    created_at: datetime
    reservations: List[ReservationResponseSchema] = []

    class Config:
        from_attributes = True
