from fastapi import FastAPI
from routers.router import router
from routers.auth import router as auth_router

app = FastAPI()

app.include_router(router)
app.include_router(auth_router)