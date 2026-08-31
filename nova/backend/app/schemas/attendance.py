from datetime import date, datetime
from pydantic import BaseModel


class ClockInRequest(BaseModel):
    notes: str | None = None
    system: str = "nova"


class ClockOutRequest(BaseModel):
    notes: str | None = None


class AttendanceRecordResponse(BaseModel):
    id: int
    user_id: int
    user_name: str | None = None
    user_email: str | None = None
    date: date
    clock_in: datetime
    clock_out: datetime | None = None
    total_minutes: int | None = None
    system: str
    notes: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AttendanceStatusResponse(BaseModel):
    is_clocked_in: bool
    active_record: AttendanceRecordResponse | None = None
    today_records: list[AttendanceRecordResponse] = []
    today_total_minutes: int = 0


class AttendanceAdminUpdate(BaseModel):
    clock_in: datetime | None = None
    clock_out: datetime | None = None
    notes: str | None = None
