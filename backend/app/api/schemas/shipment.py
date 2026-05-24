from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.database.models import Shipment, ShipmentStatus
from .seller import SellerBase


class ShipmentEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    location: int
    status: ShipmentStatus
    description: str | None = None
    shipment_id: UUID


class BaseShipment(BaseModel):
    content: str
    weight: float = Field(le=25)
    destination: int


class ShipmentRead(BaseShipment):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    seller: SellerBase
    timeline: list[ShipmentEventRead] = []
    estimated_delivery: datetime
    status: ShipmentStatus | None = None

    @model_validator(mode="wrap")
    @classmethod
    def compute_status_from_timeline(cls, data, handler):
        result = handler(data)
        if result.timeline:
            latest = max(result.timeline, key=lambda e: e.created_at)
            result.status = latest.status
        return result

    @classmethod
    def from_shipment(cls, shipment: Shipment) -> "ShipmentRead":
        timeline = sorted(shipment.timeline, key=lambda e: e.created_at)
        return cls(
            id=shipment.id,
            content=shipment.content,
            weight=shipment.weight,
            destination=shipment.destination,
            estimated_delivery=shipment.estimated_delivery,
            seller=SellerBase.model_validate(shipment.seller),
            timeline=[ShipmentEventRead.model_validate(e) for e in timeline],
            status=timeline[-1].status if timeline else None,
        )


class ShipmentCreate(BaseShipment):
    pass


class ShipmentUpdate(BaseModel):
    location: int | None = Field(default=None)
    status: ShipmentStatus | None = Field(default=None)
    description: str | None = Field(default=None)
    estimated_delivery: datetime | None = Field(default=None)
