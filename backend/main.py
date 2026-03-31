from fastapi import FastAPI
from routers.router import router

app = FastAPI()

app.include_router(router)