from fastapi import FastAPI
from routers.router import router
from routers.auth import router as auth_router
from routers.rooms import router as rooms_router
from routers.room_detail import router as room_detail_router
from fastapi.middleware.cors import CORSMiddleware
from routers.ai_image_router import router as ai_image_router

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(auth_router)
app.include_router(rooms_router)
app.include_router(room_detail_router)
app.include_router(ai_image_router)