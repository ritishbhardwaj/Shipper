from datetime import datetime, timedelta
import jwt
from sqlalchemy import Select
from sqlalchemy.engine import Result
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException,status

from app.api.schemas.seller import SellerCreate
from app.database.models import Seller

from passlib.context import CryptContext

from typing import Any

from .user import UserService

# from app.config import security_settings
from ..config import security_settings
from app.utils import generate_access_token,decode_access_token

# password_context=CryptContext(schemes=["bcrypt"],deprecated="auto")



class SellerService(UserService):
    def __init__(self, session: AsyncSession):
        # Get database session to perform database operations
        super().__init__(Seller,session)

    async def add(self, seller_create:SellerCreate)->Seller:
        print("creds:", seller_create)
        print("password value:", seller_create.password, "type:", type(seller_create.password))
        return await self._add_user(
            seller_create.model_dump()
            )
    
    async def token(self,mail,password)->str: 
        return await self._generate_token(mail,password)