"""
llm_service.py - Unified LLM inference manager for NutriAI.
Supports both:
1. Local Fine-Tuned LoRA model (Qwen2.5-0.5B-Instruct + NutriAI LoRA adapter).
2. Groq cloud-hosted API (when configured and online).
"""

import os
import sys
import logging
from typing import Optional

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

from app.core.config import settings

logger = logging.getLogger("nutriai.llm_service")

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_ADAPTER_PATH = os.path.join(BASE_DIR, "artifacts", "lora_adapter", "qwen_lora_r8_lr2e4")

# Singleton local model instances
_local_model = None
_local_tokenizer = None

def load_local_lora_model():
    """Loads base model and attaches the fine-tuned LoRA adapter."""
    global _local_model, _local_tokenizer

    if _local_model is not None:
        return _local_model, _local_tokenizer

    adapter_path = DEFAULT_ADAPTER_PATH
    if not os.path.exists(os.path.join(adapter_path, "adapter_model.safetensors")):
        # Check r=4 fallback
        fallback = os.path.join(BASE_DIR, "artifacts", "lora_adapter", "qwen_lora_r4_lr2e4")
        if os.path.exists(os.path.join(fallback, "adapter_model.safetensors")):
            adapter_path = fallback
        else:
            logger.warning("No LoRA adapter found at %s. Local inference unavailable.", adapter_path)
            return None, None

    logger.info("Loading base model '%s' for local LoRA inference...", settings.BASE_MODEL_NAME)
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if device == "cuda":
        if getattr(settings, "MODEL_QUANTIZATION", "none").lower() == "4bit":
            from transformers import BitsAndBytesConfig
            bnb_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_compute_dtype=torch.float16,
                bnb_4bit_use_double_quant=True
            )
            base_model = AutoModelForCausalLM.from_pretrained(
                settings.BASE_MODEL_NAME,
                quantization_config=bnb_config,
                device_map="auto"
            )
        else:
            base_model = AutoModelForCausalLM.from_pretrained(
                settings.BASE_MODEL_NAME,
                torch_dtype=torch.float16,
                device_map="auto"
            )
    else:
        base_model = AutoModelForCausalLM.from_pretrained(
            settings.BASE_MODEL_NAME,
            torch_dtype=torch.float32,
            low_cpu_mem_usage=True
        )

    _local_tokenizer = AutoTokenizer.from_pretrained(adapter_path)
    if _local_tokenizer.pad_token is None:
        _local_tokenizer.pad_token = _local_tokenizer.eos_token

    logger.info("Attaching trained LoRA adapter from: %s", adapter_path)
    _local_model = PeftModel.from_pretrained(base_model, adapter_path)
    _local_model.eval()

    logger.info("Local Fine-Tuned LoRA Model is ready for GPU/CPU inference on %s.", device)
    return _local_model, _local_tokenizer

def generate_with_local_lora(prompt: str, max_new_tokens: int = 512) -> str:
    """Generates nutrition text using the locally fine-tuned LoRA adapter."""
    model, tokenizer = load_local_lora_model()
    if model is None or tokenizer is None:
        raise RuntimeError("Local fine-tuned LoRA model could not be loaded.")

    formatted_prompt = (
        f"<|im_start|>system\nYou are NutriAI, an Indian clinical nutrition expert. "
        f"Answer evidence-based queries using verified Indian dietary principles.<|im_end|>\n"
        f"<|im_start|>user\n{prompt}<|im_end|>\n"
        f"<|im_start|>assistant\n"
    )

    inputs = tokenizer(formatted_prompt, return_tensors="pt")
    target_device = getattr(model, "device", None) or next(model.parameters()).device
    inputs = {k: v.to(target_device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=False,
            repetition_penalty=1.1,
            pad_token_id=tokenizer.eos_token_id
        )

    gen_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    response = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
    return response

def is_local_lora_available() -> bool:
    adapter_file = os.path.join(DEFAULT_ADAPTER_PATH, "adapter_model.safetensors")
    fallback = os.path.join(BASE_DIR, "artifacts", "lora_adapter", "qwen_lora_r4_lr2e4", "adapter_model.safetensors")
    return os.path.exists(adapter_file) or os.path.exists(fallback)
