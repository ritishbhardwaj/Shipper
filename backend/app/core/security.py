from typing import Annotated
from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer,HTTPBearer

from app.utils import decode_access_token

oauth2_scheme_seller =  OAuth2PasswordBearer(tokenUrl="/seller/token")
oauth2_scheme_delivery_partner =  OAuth2PasswordBearer(tokenUrl="/delivery_partner/token")





''' this is the thing that we use to customize Token storing and fetching..........
For this project we won't be using it . But it is quite helpul'''
class AccessTokenBearer(HTTPBearer):
    async def __call__(self, request):
        # Parse Authorization Header
        # Similar to
        # request.header.get("Authorization") ...
        auth_credentials = await super().__call__(request)
        # Access token
        token = auth_credentials.credentials
        # Validate the token
        token_data = decode_access_token(token)
        # Raise error for invalid token
        if token_data is None:
            raise HTTPException(
                status_code=401,
                detail="Not authorized!",
            )
        # Return token/user data
        return token_data


access_token_bearer = AccessTokenBearer()

# Dependency
AccessTokenDep = Annotated[dict, Depends(access_token_bearer)]