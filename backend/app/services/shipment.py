from datetime import datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.database.models import ShipmentEvent

# from app.api.dependencies import SellerDep
from app.api.schemas.shipment import ShipmentCreate,ShipmentUpdate
from app.database.models import DeliveryPartner, Seller, Shipment, ShipmentStatus
from app.services.shipment_event import ShipmentEventService

from .base import BaseService
from .deliver_partner import DeliverPartnerService


class ShipmentService(BaseService):
    def __init__(self, session: AsyncSession, delivery_partner:DeliverPartnerService, event_service:ShipmentEventService):
        # Get database session to perform database operations
        super().__init__(Shipment,session)
        self.delivery_partner_service= delivery_partner
        self.event_service=  event_service

    async def get(self, id: UUID) -> Shipment:
        result = await self.session.execute(
            select(Shipment)
            .where(Shipment.id == id)
            .options(
                selectinload(Shipment.timeline),
                selectinload(Shipment.seller),
            ),
        )
        shipment = result.scalar_one_or_none()
        if shipment is None:
            raise ValueError(f"Shipment with id {id} not found")
        return shipment

    # Add a new shipment
    async def add(self, shipment_create: ShipmentCreate, seller: Seller) -> Shipment:
        partner = await self.delivery_partner_service.assign_shipment(
            shipment_create.destination,
        )
        new_shipment = Shipment(
            **shipment_create.model_dump(),
            estimated_delivery=datetime.now() + timedelta(days=3),
            seller_id=seller.id,
            delivery_partner_id=partner.id,
        )
        shipment = await self._add(new_shipment)

        #adding shipment service
        await self.event_service.add(
            shipment=shipment,
            location=seller.zip_code or shipment.destination,
            shipment_status=ShipmentStatus.placed,
            description=f"assigned to delivery partner - {partner.name}",
        )
        await self.session.commit()
        return await self.get(shipment.id)

    # Update an existing shipment
    async def update(self, id: UUID, shipment_update: ShipmentUpdate |dict ,partner :DeliveryPartner) -> Shipment:
        
        shipment :Shipment  = await self.get(id)
        
        if shipment.delivery_partner_id!=partner.id :
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail = "Not Authorised"
            )
        
        if shipment_update.get("estimated_delivery") is not None:
            shipment.estimated_delivery = shipment_update["estimated_delivery"]

        location = shipment_update.get("location")
        new_status = shipment_update.get("status")
        if location is not None or new_status is not None:
            event = await self.event_service.add(
                shipment=shipment,
                location=location,
                description=shipment_update.get("description"),
                shipment_status=new_status,
            )
            shipment.timeline.append(event)

        await self.session.commit()
        return await self.get(id)

    async def list_for_seller(self, seller_id: UUID) -> list[Shipment]:
        result = await self.session.execute(
            select(Shipment)
            .where(Shipment.seller_id == seller_id)
            .options(selectinload(Shipment.timeline), selectinload(Shipment.seller)),
        )
        return list(result.scalars().all())

    async def list_for_partner(self, partner_id: UUID) -> list[Shipment]:
        result = await self.session.execute(
            select(Shipment)
            .where(Shipment.delivery_partner_id == partner_id)
            .options(selectinload(Shipment.timeline), selectinload(Shipment.seller)),
        )
        return list(result.scalars().all())

    async def delete(self, id: UUID, seller: Seller) -> None:
        shipment = await self.get(id)
        if shipment.seller_id != seller.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorised to delete this shipment",
            )
        # Remove timeline rows first (FK: shipment_event.shipment_id → shipment.id)
        await self.session.execute(
            delete(ShipmentEvent).where(ShipmentEvent.shipment_id == id),
        )
        await self.session.delete(shipment)
        await self.session.commit()