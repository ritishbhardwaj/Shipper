from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm

from app.api.dependencies import (
    SellerDep,
    ServiceDepSeller,
    get_seller_access_token,
)
from app.api.schemas import seller as seller_schema
from app.database.redis import add_jti_to_blacklist

router = APIRouter(prefix="/seller", tags=["seller"])


@router.get("/me", response_model=seller_schema.SellerRead)
async def get_me(seller: SellerDep):
    return seller


@router.post("/signup", response_model=seller_schema.SellerRead)
async def register_seller(
    request: seller_schema.SellerCreate,
    service: ServiceDepSeller,
):
    return await service.add(request)


@router.post("/token")
async def login_user(
    request_form: Annotated[OAuth2PasswordRequestForm, Depends()],
    service: ServiceDepSeller,
):
    token = await service.token(request_form.username, request_form.password)
    return {"access_token": token, "token_type": "bearer"}


@router.get("/logout")
async def logout_user(
    token_data: Annotated[dict, Depends(get_seller_access_token)],
):
    exp = datetime.fromtimestamp(token_data["exp"], tz=timezone.utc)
    await add_jti_to_blacklist(jti=token_data["jti"], expires_at=exp)
    return {"detail": "Successfully logged out"}


@router.get("/dashboard", response_model=seller_schema.SellerRead)
async def get_dashboard(seller: SellerDep):
    return seller
