import os
import logging
from typing import Dict, Any

logger = logging.getLogger("nutriai.hardware")

def get_hardware_info() -> Dict[str, Any]:
    info: Dict[str, Any] = {
        "cuda_available": False,
        "device_count": 0,
        "device_name": None,
        "vram_total_gb": 0.0,
        "vram_allocated_gb": 0.0,
        "vram_reserved_gb": 0.0,
        "torch_version": None,
        "bitsandbytes_available": False,
        "supports_bf16": False,
        "recommended_device": "cpu"
    }

    try:
        import torch
        info["torch_version"] = torch.__version__
        if torch.cuda.is_available():
            info["cuda_available"] = True
            info["device_count"] = torch.cuda.device_count()
            info["device_name"] = torch.cuda.get_device_name(0)
            total_mem = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
            info["vram_total_gb"] = round(total_mem, 2)
            info["vram_allocated_gb"] = round(torch.cuda.memory_allocated(0) / (1024 ** 3), 3)
            info["vram_reserved_gb"] = round(torch.cuda.memory_reserved(0) / (1024 ** 3), 3)
            info["supports_bf16"] = torch.cuda.is_bf16_supported()
            info["recommended_device"] = "cuda"
        else:
            info["recommended_device"] = "cpu"
    except Exception as exc:
        logger.warning("Could not check torch cuda status: %s", exc)

    try:
        import bitsandbytes as bnb
        info["bitsandbytes_available"] = True
    except Exception:
        info["bitsandbytes_available"] = False

    return info
