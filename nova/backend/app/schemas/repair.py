from pydantic import BaseModel, model_validator
from datetime import datetime, date
from decimal import Decimal
from app.schemas.client import ClientResponse
from app.schemas.inventory import RepairInventoryCreate, RepairInventoryResponse


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
    brand: str | None = None
    model: str | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    system: str = "nova"
    design_file_url: str | None = None
    print_technique: str | None = None
    print_location: str | None = None
    print_dimensions: str | None = None

    @model_validator(mode="after")
    def validate_system_fields(self):
        sys = (self.system or "nova").lower()
        if sys == "nova":
            # Para NOVA (Servicio Técnico), Marca, Modelo y Falla son obligatorios
            if not self.brand or not self.brand.strip():
                raise ValueError("La marca del dispositivo es obligatoria para reparaciones de NOVA.")
            if not self.model or not self.model.strip():
                raise ValueError("El modelo del dispositivo es obligatorio para reparaciones de NOVA.")
            if not self.reported_issue or not self.reported_issue.strip():
                raise ValueError("El problema reportado es obligatorio para reparaciones de NOVA.")
        elif sys == "bravo":
            # Para BRAVO (Personalizaciones), asignar fallbacks si vienen vacíos
            if not self.brand or not self.brand.strip():
                self.brand = "Personalizado"
            if not self.model or not self.model.strip():
                self.model = "Estándar"
            if not self.reported_issue or not self.reported_issue.strip():
                self.reported_issue = "Trabajo de Personalización"
        return self


class RepairCreate(RepairBase):
    client_id: int
    technician_id: int | None = None
    device_password: str | None = None
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = None
    deposit: Decimal | None = None
    deposit_payment_method: str | None = None
    warranty_days: int | None = None
    used_items: list[RepairInventoryCreate] | None = None

    @model_validator(mode="after")
    def validate_payments(self):
        cost = self.repair_cost or Decimal(0)
        dep = self.deposit or Decimal(0)
        if dep > cost and cost > Decimal(0):
            raise ValueError("El abono no puede ser mayor al costo total.")
        if dep > Decimal(0) and not self.deposit_payment_method:
            self.deposit_payment_method = "efectivo"
        return self



class RepairUpdate(BaseModel):
    device_type: str | None = None
    brand: str | None = None
    model: str | None = None
    technician_id: int | None = None
    reported_issue: str | None = None
    accessories: str | None = None
    device_password: str | None = None
    estimated_delivery: date | None = None
    repair_cost: Decimal | None = None
    deposit: Decimal | None = None
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None
    warranty_days: int | None = None
    system: str | None = None
    design_file_url: str | None = None
    print_technique: str | None = None
    print_location: str | None = None
    print_dimensions: str | None = None


class RepairStatusUpdate(BaseModel):
    new_status: str
    note: str | None = None
    payment_amount: Decimal | None = None
    payment_method: str | None = None


class RepairResponse(RepairBase):
    id: int
    order_number: str
    client_id: int
    client: ClientResponse | None = None
    technician_id: int | None
    status: str
    estimated_delivery: date | None
    repair_cost: Decimal | None
    deposit: Decimal | None
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None
    warranty_days: int | None = None
    created_at: datetime
    history: list[RepairHistoryResponse] = []
    client_repairs_count: int | None = None
    device_password: str | None = None
    usage_records: list[RepairInventoryResponse] = []

    model_config = {"from_attributes": True}


class RepairListResponse(RepairBase):
    id: int
    order_number: str
    status: str
    client_id: int
    client: ClientResponse | None = None
    estimated_delivery: date | None
    repair_cost: Decimal | None
    deposit: Decimal | None
    deposit_payment_method: str | None = None
    final_payment_method: str | None = None
    warranty_days: int | None = None
    created_at: datetime
    client_repairs_count: int | None = None
    device_password: str | None = None

    model_config = {"from_attributes": True}