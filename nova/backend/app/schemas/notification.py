from pydantic import BaseModel
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    repair_id: int
    channel: str
    status: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}