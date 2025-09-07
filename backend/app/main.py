from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .middleware import RequestContextMiddleware
from .routers import root, uploads

app = FastAPI(title="Allosmod Uploader", version="1.0.0")

# Middleware
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ORIGINS == ["*"] else settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"]
    ,allow_headers=["*"]
)

# Routers
app.include_router(root.router)
app.include_router(uploads.router)