from datetime import datetime, timezone

from app.database.models import Shipment, ShipmentEvent, ShipmentStatus
from app.services.base import BaseService


class ShipmentEventService(BaseService):
    def __init__(self, session):
        super().__init__(ShipmentEvent, session)

    async def add(
        self,
        shipment: Shipment,
        location: int | None = None,
        shipment_status: ShipmentStatus | str | None = None,
        description: str | None = None,
    ):
        if shipment_status is not None and isinstance(shipment_status, str):
            shipment_status = ShipmentStatus(shipment_status)

        if location is None or shipment_status is None:
            last_event = self._latest_event(shipment)
            if last_event is None:
                shipment_status = shipment_status or ShipmentStatus.placed
                location = location or shipment.destination
            else:
                if shipment_status is None:
                    shipment_status = last_event.status
                if location is None:
                    location = last_event.location

        new_event = ShipmentEvent(
            location=location,
            status=shipment_status,
            description=description
            or self._get_description(shipment_status, location),
            shipment_id=shipment.id,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(new_event)
        await self.session.flush()
        await self.session.refresh(new_event)
        return new_event

    def _latest_event(self, shipment: Shipment) -> ShipmentEvent | None:
        if not shipment.timeline:
            return None
        return max(shipment.timeline, key=lambda e: (e.created_at, str(e.id)))

    def _get_description(self, status: ShipmentStatus, location: int):
        match status:
            case ShipmentStatus.placed:
                return "assigned delivery partner"
            case ShipmentStatus.delivered:
                return "successfully delivered"
            case ShipmentStatus.out_for_delivery:
                return "shipment out for delivery"
            case _:
                return f"scanned at {location}"
