from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import (
    DeliveryPartnerDep,
    SellerDep,
    ServiceDep,
)
from app.api.schemas.shipment import (
    ShipmentCreate,
    ShipmentRead,
    ShipmentUpdate,
)

router = APIRouter(prefix="/shipment", tags=["Shipment"])


@router.get("/", response_model=ShipmentRead)
async def get_shipment(
    id: UUID,
    service: ServiceDep,
    _: SellerDep,
):
    return await service.get(id=id)


@router.get("/mine", response_model=list[ShipmentRead])
async def list_my_shipments(service: ServiceDep, seller: SellerDep):
    shipments = await service.list_for_seller(seller.id)
    return [ShipmentRead.from_shipment(s) for s in shipments]


@router.get("/assigned", response_model=list[ShipmentRead])
async def list_assigned_shipments(
    service: ServiceDep,
    partner: DeliveryPartnerDep,
):
    shipments = await service.list_for_partner(partner.id)
    return [ShipmentRead.from_shipment(s) for s in shipments]


@router.post("/", response_model=ShipmentRead)
async def submit_shipment(
    shipment: ShipmentCreate,
    service: ServiceDep,
    seller: SellerDep,
):
    created = await service.add(shipment, seller)
    return ShipmentRead.from_shipment(created)


@router.patch("/", response_model=ShipmentRead)
async def update_shipment(
    id: UUID,
    shipment_update: ShipmentUpdate,
    delivery_partner: DeliveryPartnerDep,
    service: ServiceDep,
):
    update = shipment_update.model_dump(exclude_none=True)
    if not update:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided to update",
        )
    shipment = await service.update(id, update, delivery_partner)
    return ShipmentRead.from_shipment(shipment)


@router.delete("/")
async def delete_shipment(
    id: UUID,
    service: ServiceDep,
    seller: SellerDep,
) -> dict[str, str]:
    await service.delete(id, seller)
    return {"detail": f"Shipment with id #{id} is deleted!"}
