from datetime import datetime
from enum import Enum

from sqlmodel import Field, SQLModel,Relationship, Column

from pydantic import EmailStr

from sqlalchemy import JSON, TypeDecorator, String, ARRAY,INTEGER ,  ForeignKey,String
from sqlalchemy.dialects import sqlite

from uuid import UUID
from uuid import uuid4, UUID as py_uuid # Rename to avoid confusion


class GUID(TypeDecorator):
    """
    Platform-independent GUID type.

    Uses CHAR(36) for storage and handles Python UUID objects.
    """
    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        # This is called when WRITING to the database
        if value is None:
            return value
        if not isinstance(value, py_uuid):
            return str(value) # Handle strings if they are passed
        return str(value)

    def process_result_value(self, value, dialect):
        # This is called when READING from the database
        if value is None:
            return value
        if not isinstance(value, py_uuid):
            try:
                return py_uuid(value)
            except (TypeError, ValueError):
                return None
        return value

    @property
    def python_type(self):
        return py_uuid


class ShipmentStatus(str, Enum):
    placed = "placed"
    in_transit = "in_transit"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"


class Shipment(SQLModel, table = True):
    __tablename__ = "shipment"

    id: UUID = Field(
        default_factory=uuid4,
        sa_column=Column(GUID(), primary_key=True, index=True)   # ✅ store UUID as string
    )

    created_at: datetime= Field(
        sa_column=Column(
            sqlite.TIMESTAMP,
            default=datetime.now,
        )
    )

    content: str
    weight: float = Field(le=25)
    destination: int
    # status: ShipmentStatus  #change into the here in new commit. now we will done things using the timeline 
    estimated_delivery: datetime

    timeline: list["ShipmentEvent"] = Relationship(
        back_populates="shipment",
        sa_relationship_kwargs={
            "lazy": "selectin",
            "order_by": "ShipmentEvent.created_at",
            "cascade": "all, delete-orphan",
        },
    )

    seller_id : UUID = Field(sa_column=Column(GUID(), ForeignKey("seller.id")))
    seller : "Seller" = Relationship(
                            back_populates="shipments",
                            sa_relationship_kwargs={"lazy":"selectin"},
                            )
    

    delivery_partner_id: UUID = Field(
        sa_column=Column(GUID(), ForeignKey("delivery_partner.id")),
    )
    delivery_partner : "DeliveryPartner" =  Relationship(back_populates="shipments",
                                                         sa_relationship_kwargs={"lazy":"selectin"})
    
    @property
    def status(self):
        if not self.timeline:
            return None
        latest = max(self.timeline, key=lambda e: (e.created_at, str(e.id)))
        return latest.status
    



class ShipmentEvent(SQLModel,table=True):
    __tablename__='shipment_event'

    id:UUID = Field(
        default_factory=uuid4,
        sa_column=Column(GUID(), primary_key=True, index=True)   # ✅ store UUID as string
    )
    created_at: datetime= Field(
        sa_column=Column(
            sqlite.TIMESTAMP,
            default=datetime.now,
        )
    )

    location:int
    status:ShipmentStatus
    description :str |None =Field(default=None)

    shipment_id: UUID = Field(
        sa_column=Column(GUID(), ForeignKey("shipment.id"), nullable=False),
    )

    shipment : Shipment =Relationship(back_populates='timeline',
                                      sa_relationship_kwargs={"lazy":"selectin"})



class TokenBlacklist(SQLModel, table=True):
    """SQLite-backed JWT logout blacklist (replaces Redis)."""

    __tablename__ = "token_blacklist"

    jti: str = Field(primary_key=True, max_length=64)
    expires_at: datetime = Field(
        sa_column=Column(sqlite.TIMESTAMP, nullable=False),
    )


class UserModel(SQLModel):
    name:str
    email:EmailStr
    password_hash : str = Field(exclude=True)


class Seller(UserModel,table=True):
    __tablename__="seller"

    id:UUID = Field(
        default_factory=uuid4,
        sa_column=Column(GUID(), primary_key=True, index=True)   # ✅ store UUID as string
    )
    created_at: datetime= Field(
        sa_column=Column(
            sqlite.TIMESTAMP,
            default=datetime.now,
        )
    )
    shipments: list[Shipment] = Relationship(
                                        back_populates="seller",
                                        sa_relationship_kwargs={"lazy":"selectin"},
                                        )

    address : str |None = Field(default=None)
    zip_code: int |None = Field(default=None)



class DeliveryPartner(UserModel,table=True):
    __tablename__="delivery_partner"
    
    id:UUID = Field(
        default_factory=uuid4,
        sa_column=Column(GUID(), primary_key=True, index=True)   # ✅ store UUID as string
    )

    created_at: datetime= Field(
        sa_column=Column(
            sqlite.TIMESTAMP,
            default=datetime.now,
        )
    )
    serviceable_zip_codes : list[int] = Field(sa_column=Column(JSON))

    #foollowing will show how much shipment a delivery partner can handle
    max_handling_capacity: int 


    # assigned_zip_codes : list[int] = Field(foreign_key="shipment")
    shipments: list[Shipment] = Relationship(back_populates="delivery_partner",
                                             sa_relationship_kwargs={"lazy":"selectin"},
                                             )
    
    @property
    def active_shipments(self):
        return [shipment for shipment in self.shipments
            if shipment.status!=ShipmentStatus.delivered]
    
    @property
    def current_handling_capacity(self):
        return self.max_handling_capacity - len(self.active_shipments)


'''
sa means sql_alchemy
'''

