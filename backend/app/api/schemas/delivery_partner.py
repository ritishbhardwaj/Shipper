from pydantic import BaseModel, ConfigDict, EmailStr, Field
from uuid import UUID

from app.api.schemas.shipment import ShipmentRead


class DeliveryPartnerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    email: EmailStr
    serviceable_zip_codes: list[int]
    max_handling_capacity: int


class DeliveryPartnerUpdate(BaseModel):
    name: str | None = None
    serviceable_zip_codes: list[int] | None = None
    max_handling_capacity: int | None = Field(default=None)


class DeliveryPartnerCreate(DeliveryPartnerBase):
    password: str


class DeliveryPartnerRead(DeliveryPartnerBase):
    id: UUID


class DeliveryPartnerDashboard(BaseModel):
    partner: DeliveryPartnerRead
    assigned_shipments: list[ShipmentRead]
    active_count: int
    available_capacity: int
