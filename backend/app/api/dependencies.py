from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.database.models import DeliveryPartner, Seller
from app.database.redis import is_jti_blacklisted
from app.database.session import get_session
from app.services.shipment import ShipmentService
from app.services.seller import SellerService
from app.core.security import oauth2_scheme_seller, oauth2_scheme_delivery_partner
from app.utils import decode_access_token
from app.services.deliver_partner import DeliverPartnerService
from app.services.shipment_event import ShipmentEventService

SessionDep = Annotated[AsyncSession, Depends(get_session)]


async def _get_access_token(token: str):
    data = decode_access_token(token=token)

    if data is None or "jti" not in data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    if await is_jti_blacklisted(data["jti"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
        )

    return data


async def get_seller_access_token(token: Annotated[str, Depends(oauth2_scheme_seller)]):
    return await _get_access_token(token=token)


async def get_delivery_partner_access_token(
    token: Annotated[str, Depends(oauth2_scheme_delivery_partner)],
):
    return await _get_access_token(token=token)


async def get_current_seller(
    token_data: Annotated[dict, Depends(get_seller_access_token)],
    session: SessionDep,
):
    seller = await session.get(Seller, UUID(token_data["user"]["id"]))
    if seller is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not Authorised",
        )
    return seller


async def get_current_delivery_partner(
    token_data: Annotated[dict, Depends(get_delivery_partner_access_token)],
    session: SessionDep,
):
    partner = await session.get(DeliveryPartner, UUID(token_data["user"]["id"]))
    if partner is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not Authorised",
        )
    return partner


def get_shipment_service(session: SessionDep):
    return ShipmentService(
        session,
        DeliverPartnerService(session),
        ShipmentEventService(session),
    )


def get_seller_service(session: SessionDep):
    return SellerService(session)


def get_deliver_partner_service(session: SessionDep):
    return DeliverPartnerService(session)


ServiceDep = Annotated[ShipmentService, Depends(get_shipment_service)]
ServiceDepSeller = Annotated[SellerService, Depends(get_seller_service)]
SellerDep = Annotated[Seller, Depends(get_current_seller)]
DeliveryPartnerDep = Annotated[DeliveryPartner, Depends(get_current_delivery_partner)]
DeliverPartnerServiceDep = Annotated[
    DeliverPartnerService,
    Depends(get_deliver_partner_service),
]
