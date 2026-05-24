from fastapi import FastAPI, Request, Response 
from fastapi.middleware.cors import CORSMiddleware
import time



app= FastAPI()


@app.get("/hello")
async def hello():
    time.sleep(10)
    return {"message":"Hello World"}


@app.get("/hello2")
async def hello2():
    time.sleep(10)
    return {"message":"Hello World 2"}


@app.middleware("http")
async def middleware(request:Request, call_next):
    print("Before Request")
    print(request.url.path)
    print(dir(request))
    print(request.url)
    response = await call_next(request)
    print("After Request")
    return response
