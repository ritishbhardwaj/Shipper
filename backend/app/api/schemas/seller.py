from pydantic import BaseModel, ConfigDict, EmailStr
from uuid import UUID


class SellerBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    email: EmailStr


class SellerCreate(SellerBase):
    password: str
    address: str | None = None
    zip_code: int | None = None


class SellerRead(SellerBase):
    id: UUID
    address: str | None = None
    zip_code: int | None = None
