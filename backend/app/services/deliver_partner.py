from sqlmodel import select,any_
from sqlalchemy import select

# from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from fastapi import HTTPException,status

from app.api.schemas.delivery_partner import DeliveryPartnerCreate
from app.database.models import DeliveryPartner, Shipment

from typing import Any, Sequence

from .user import UserService



#testing purpose 
from sqlalchemy.orm import sessionmaker,Session
from app.database.session import get_session




class DeliverPartnerService(UserService):
    def __init__(self, session: AsyncSession):
        # Get database session to perform database operations
        super().__init__(DeliveryPartner,session)

    async def add(self, delivery_partner_create:DeliveryPartnerCreate)->DeliveryPartner:
        print("creds:", delivery_partner_create)
        print("password value:", delivery_partner_create.password, "type:", type(delivery_partner_create.password))
        print(f"max handling capacity : {delivery_partner_create.max_handling_capacity} ###########\n")
        print(f" delivery partner full data { delivery_partner_create.model_dump()}")
        return await self._add_user(
            delivery_partner_create.model_dump()
            )
    
    async def token(self,mail,password)->str: 
        return await self._generate_token(mail,password)
    
    async def update(self,delivery_partner:DeliveryPartner):
        return await self._update(delivery_partner)
    
    async def get_partners_by_zipcode(self,zipcode) -> Sequence[DeliveryPartner]:



        result = await self.session.execute(
            select(DeliveryPartner)  # we will shift to select(DeliveryPartner).where(zipcode == any_(DeliveryPartner.serviceable_zip_codes)) once we shift to postgres
            
        )
        matched = [
            partner for partner in result.scalars().all()
            if zipcode in partner.serviceable_zip_codes
        ]

        # zipcode_str = str(zipcode)
        
        # result = await self.session.execute(
        #     select(DeliveryPartner).where(
        #         # This is a "brute-force" text search on the JSON column
        #         DeliveryPartner.serviceable_zip_codes.as_string().like(f"%{zipcode_str}%")
        #     )
        # )
        print()
        print(result.scalars(),"\n")
        print(f"matched=====> {matched}")
        print(f"requested zipcode is {zipcode}")
        print(f"  inside services/delivery_partner.py --> get_partner_by_zipcode ---> {result.scalars().all()} \n")
        return matched
    
    async def assign_shipment(self, destination: int) -> DeliveryPartner:
        """Pick a partner for this destination zip who still has capacity."""
        eligible_partners = await self.get_partners_by_zipcode(destination)

        for partner in eligible_partners:
            if partner.current_handling_capacity > 0:
                return partner

        raise HTTPException(
            status_code=status.HTTP_406_NOT_ACCEPTABLE,
            detail="No delivery partner is available for this destination zip",
        )