from datetime import timedelta

import bcrypt
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.database.models import UserModel
from app.utils import generate_access_token
from .base import BaseService


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        password_hash.encode("utf-8"),
    )


class UserService(BaseService):
    def __init__(self, model: UserModel, session: AsyncSession):
        self.session = session
        self.model = model

    async def _add_user(self, data: dict):
        payload = dict(data)
        password = payload.pop("password")
        user = self.model(
            **payload,
            password_hash=hash_password(password),
        )
        return await self._add(user)

    async def _get_by_email(self, email) -> UserModel | None:
        return await self.session.scalar(
            select(self.model).where(self.model.email == email),
        )

    async def _generate_token(self, mail, password) -> str:
        user = await self._get_by_email(email=mail)

        if user is None or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Email or password is incorrect",
            )

        return generate_access_token(
            data={
                "user": {
                    "name": user.name,
                    "id": str(user.id),
                },
            },
            expiry=timedelta(seconds=9000),
        )
