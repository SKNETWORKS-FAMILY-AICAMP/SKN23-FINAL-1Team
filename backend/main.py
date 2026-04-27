from fastapi import FastAPI
import os
from routers.router import router
from routers.auth import router as auth_router
from routers.rooms import router as rooms_router
from routers.room_detail import router as room_detail_router
from fastapi.middleware.cors import CORSMiddleware

from routers.ai_image_router import router as ai_image_router
from routers.favorite import router as favorite_router
from routers.gallery_router import router as gallery_router


app = FastAPI()

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://3.37.97.17",
    "http://52.78.235.88",
]

configured_origins = os.getenv("FRONTEND_ORIGINS", "")
origins = [
    origin.strip()
    for origin in configured_origins.split(",")
    if origin.strip()
] or default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router, prefix="/api")
app.include_router(rooms_router, prefix="/api")
app.include_router(room_detail_router, prefix="/api")
app.include_router(ai_image_router)
app.include_router(favorite_router, prefix="/api")
app.include_router(gallery_router, prefix="/api")

