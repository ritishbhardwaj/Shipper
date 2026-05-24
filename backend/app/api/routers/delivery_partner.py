from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import (
    DeliverPartnerServiceDep,
    DeliveryPartnerDep,
    ServiceDep,
    get_delivery_partner_access_token,
)
from app.api.schemas import delivery_partner as partner_schema
from app.api.schemas.shipment import ShipmentRead
from app.database.models import ShipmentStatus
from app.database.redis import add_jti_to_blacklist

router = APIRouter(prefix="/delivery_partner", tags=["Delivery Partner"])


@router.post("/signup", response_model=partner_schema.DeliveryPartnerRead)
async def register_delivery_partner(
    request: partner_schema.DeliveryPartnerCreate,
    service: DeliverPartnerServiceDep,
):
    return await service.add(request)


@router.post("/token")
async def login_delivery_partner(
    request_form: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: DeliverPartnerServiceDep,
):
    token = await service.token(request_form.username, request_form.password)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/logout")
async def logout_delivery_partner(
    token_data: Annotated[dict, Depends(get_delivery_partner_access_token)],
):
    exp = datetime.fromtimestamp(token_data["exp"], tz=timezone.utc)
    await add_jti_to_blacklist(jti=token_data["jti"], expires_at=exp)
    return {"detail": "Successfully logged out"}


@router.get("/me", response_model=partner_schema.DeliveryPartnerRead)
async def get_me(partner: DeliveryPartnerDep):
    return partner


@router.get("/dashboard", response_model=partner_schema.DeliveryPartnerDashboard)
async def get_dashboard(
    partner: DeliveryPartnerDep,
    service: ServiceDep,
):
    shipments = await service.list_for_partner(partner.id)
    active = [
        s for s in shipments
        if s.status is not None and s.status != ShipmentStatus.delivered
    ]
    return partner_schema.DeliveryPartnerDashboard(
        partner=partner_schema.DeliveryPartnerRead.model_validate(partner),
        assigned_shipments=[ShipmentRead.from_shipment(s) for s in shipments],
        active_count=len(active),
        available_capacity=partner.current_handling_capacity,
    )


@router.post("/update", response_model=partner_schema.DeliveryPartnerRead)
async def update_delivery_partner(
    partner_update: partner_schema.DeliveryPartnerUpdate,
    partner: DeliveryPartnerDep,
    service: DeliverPartnerServiceDep,
):
    for key, value in partner_update.model_dump(exclude_unset=True).items():
        setattr(partner, key, value)
    return await service.update(partner)
