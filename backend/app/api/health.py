from fastapi import APIRouter
from app.core.database import db_manager
from app.services.rag_service import is_ready as is_rag_ready
from app.utils.hardware import get_hardware_info

router = APIRouter(tags=["Health"])

@router.get("/health")
def get_health():
    mongo_ok = db_manager.is_connected()
    rag_ok = is_rag_ready()
    hw_info = get_hardware_info()

    return {
        "status": "healthy" if mongo_ok else "degraded",
        "database": {
            "mongodb_connected": mongo_ok,
        },
        "rag": {
            "ready": rag_ok
        },
        "hardware": {
            "cuda_available": hw_info["cuda_available"],
            "device": hw_info["device_name"] or "CPU",
            "vram_gb": hw_info["vram_total_gb"],
        }
    }
