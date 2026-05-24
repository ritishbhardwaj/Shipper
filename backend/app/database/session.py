from uuid import UUID

from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from typing import Annotated

from app.config import db_settings

engine = create_async_engine(
    url=db_settings.SQLITE_URL,
    echo=True,
)


def _normalize_uuid_string(value: str) -> str:
    """Ensure UUID FK values use the same dashed format as GUID columns."""
    if "-" in value:
        return value
    return str(UUID(value))


async def _repair_legacy_uuid_fks(connection) -> None:
    """Fix shipment_event rows saved with 32-char hex ids (no dashes)."""
    result = await connection.execute(
        text("SELECT id, shipment_id FROM shipment_event"),
    )
    rows = result.fetchall()
    for row_id, shipment_id in rows:
        fixed = _normalize_uuid_string(shipment_id)
        if fixed != shipment_id:
            await connection.execute(
                text(
                    "UPDATE shipment_event SET shipment_id = :fixed WHERE id = :id",
                ),
                {"fixed": fixed, "id": row_id},
            )


async def create_db_tables():
    async with engine.begin() as connection:
        from app.database.models import (  # noqa: F401
            DeliveryPartner,
            Seller,
            Shipment,
            ShipmentEvent,
            TokenBlacklist,
        )
        await connection.run_sync(SQLModel.metadata.create_all)
        await _repair_legacy_uuid_fks(connection)


async def get_session():
    async_session = sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
