# JWT token blacklist — SQLite implementation (Redis replaced per project requirement)

from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlmodel import select

from app.database.models import TokenBlacklist
from app.database.session import engine

# ---------------------------------------------------------------------------
# OLD REDIS IMPLEMENTATION (commented out — kept for reference)
# ---------------------------------------------------------------------------
# from redis.asyncio import Redis
#
# from app.config import db_settings
#
# #creating connection with the REDIS
# _conn_token_blacklist = Redis(host=db_settings.REDIS_HOST,
#       port=db_settings.REDIS_PORT,
#       db=0)    # using 0 index for redis
#
#
# async def add_jti_to_blacklist(jti:str):
#     await _conn_token_blacklist.set(jti,"blacklisted")
#
# async def is_jti_blacklisted(jti:str):
#     return  await _conn_token_blacklist.exists(jti)
# ---------------------------------------------------------------------------


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _run_with_session(fn):
    async_session = sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False,
    )
    async with async_session() as session:
        return await fn(session)


async def add_jti_to_blacklist(jti: str, expires_at: datetime | None = None) -> None:
    """Store JWT jti in SQLite until token would naturally expire."""
    if expires_at is None:
        expires_at = _utcnow() + timedelta(hours=24)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    async def _add(session: AsyncSession) -> None:
        existing = await session.get(TokenBlacklist, jti)
        if existing is not None:
            existing.expires_at = expires_at
        else:
            session.add(TokenBlacklist(jti=jti, expires_at=expires_at))
        await session.commit()

    await _run_with_session(_add)


async def is_jti_blacklisted(jti: str) -> bool:
    """Return True if jti is still on the blacklist."""

    async def _check(session: AsyncSession) -> bool:
        entry = await session.get(TokenBlacklist, jti)
        if entry is None:
            return False
        exp = entry.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < _utcnow():
            await session.delete(entry)
            await session.commit()
            return False
        return True

    return await _run_with_session(_check)
