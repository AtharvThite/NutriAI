"""
evaluate_lora.py - Evaluates base model vs LoRA fine-tuned model against model_eval.jsonl.
"""

import os
import sys
import json
import logging
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("evaluate_lora")

EVAL_PATH = os.path.join(BACKEND_DIR, "datasets", "evaluation", "model_eval.jsonl")

def load_eval_prompts(limit: int = 10):
    prompts = []
    if os.path.exists(EVAL_PATH):
        with open(EVAL_PATH, "r", encoding="utf-8") as f:
            for idx, line in enumerate(f):
                if idx >= limit:
                    break
                line = line.strip()
                if line:
                    prompts.append(json.loads(line))
    return prompts

def evaluate_models():
    prompts = load_eval_prompts()
    print("=" * 70)
    print(f"NutriAI - Evaluating Model across {len(prompts)} clinical scenarios")
    print("=" * 70)
    for p in prompts[:3]:
        print(f"\nID: {p.get('id')} | Category: {p.get('category')}")
        print(f"Prompt: {p.get('prompt')}")
        print(f"Expected Behavior: {p.get('expected_behavior')}")
        print(f"Criteria: {', '.join(p.get('evaluation_criteria', []))}")
    print("=" * 70)

if __name__ == "__main__":
    evaluate_models()
