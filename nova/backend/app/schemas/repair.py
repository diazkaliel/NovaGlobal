from pydantic import BaseModel
from datetime import datetime


# Schema para registrar el historial de cambios
class RepairHistoryResponse(BaseModel):
    id: int
    previous_status: str | None
    new_status: str
    note: str | None
    changed_by_id: int | None
    changed_at: str

    model_config = {"from_attributes": True}


class RepairBase(BaseModel):
    device_type: str
    brand: str
    model: str
    reported_issue: str
    accessories: str | None = None


class RepairCreate(RepairBase):
    client_id: int
    technician_id: int | None = None
    # Contraseña en texto plano — el servicio la encriptará antes de guardar
    device_password: str | None = None


class RepairUpdate(BaseModel):
    technician_id: int | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    device_password: str | None = None


# Schema para cambiar el estado — separado porque es una operación específica
class RepairStatusUpdate(BaseModel):
    new_status: str
    note: str | None = None

    # Validación manual del estado
    def validate_status(self) -> bool:
        valid = {"recibido", "diagnostico", "en_reparacion", "listo", "entregado"}
        return self.new_status in valid


class RepairResponse(RepairBase):
    id: int
    order_number: str
    client_id: int
    technician_id: int | None
    status: str
    created_at: datetime
    # Incluimos el historial completo en la respuesta de detalle
    history: list[RepairHistoryResponse] = []

    model_config = {"from_attributes": True}


# Versión resumida para listas — sin historial para no sobrecargar
class RepairListResponse(RepairBase):
    id: int
    order_number: str
    status: str
    client_id: int
    created_at: datetime

    model_config = {"from_attributes": True}