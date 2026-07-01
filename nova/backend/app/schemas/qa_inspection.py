from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime

class QAInspectionBase(BaseModel):
    order_id: int
    checklist_results: Dict[str, bool] # {"hilos_cortados": True, "sin_manchas": True...}
    passed: bool = False
    comments: Optional[str] = Field(None, max_length=255)

class QAInspectionCreate(QAInspectionBase):
    pass

class QAInspectionResponse(QAInspectionBase):
    id: int
    operator_id: int
    inspected_at: datetime
    system: str

    class Config:
        from_attributes = True
