"""
quantize_model.py - Utilities to load and export Qwen2.5-0.5B-Instruct in 4-bit NF4 and 8-bit quantization.
"""

import os
import sys
import logging
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("quantize_model")

def get_4bit_nf4_config() -> BitsAndBytesConfig:
    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True
    )

def get_8bit_config() -> BitsAndBytesConfig:
    return BitsAndBytesConfig(load_in_8bit=True)

def load_quantized_model(precision: str = "4bit"):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device != "cuda":
        logger.warning("Bitsandbytes 4-bit / 8-bit quantization requires a CUDA GPU. Falling back to native PyTorch float32 on CPU.")
        model = AutoModelForCausalLM.from_pretrained(settings.BASE_MODEL_NAME, torch_dtype=torch.float32, low_cpu_mem_usage=True)
        tokenizer = AutoTokenizer.from_pretrained(settings.BASE_MODEL_NAME)
        return model, tokenizer

    tokenizer = AutoTokenizer.from_pretrained(settings.BASE_MODEL_NAME)
    if precision == "4bit":
        config = get_4bit_nf4_config()
    elif precision == "8bit":
        config = get_8bit_config()
    else:
        config = None

    model = AutoModelForCausalLM.from_pretrained(
        settings.BASE_MODEL_NAME,
        quantization_config=config,
        device_map="auto"
    )
    return model, tokenizer
