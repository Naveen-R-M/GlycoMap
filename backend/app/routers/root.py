from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def index():
    return {"status": "ok", "service": "glycomap-backend", "docs": "/docs"}