"""
ingest.py - Ingests 20 NutriAI TXT documents into vector store (Qdrant or FAISS).
Extracts document metadata (document_id, title) and splits into semantic chunks.
"""

import os
import sys
import re
import logging
from typing import List, Tuple
import torch
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
sys.path.insert(0, BACKEND_DIR)

from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nutriai.rag.ingest")

KB_DIR = os.path.join(BACKEND_DIR, settings.KNOWLEDGE_BASE_PATH)
FAISS_INDEX_DIR = os.path.join(BACKEND_DIR, "artifacts", "faiss_index")

def parse_header_metadata(text: str, default_filename: str) -> Tuple[str, str, str]:
    """Extracts DOCUMENT ID, TITLE, and clean body text from document headers."""
    doc_id = default_filename.replace(".txt", "")
    title = default_filename.replace("_", " ").replace(".txt", "").title()
    body_lines = []
    in_header = True

    for line in text.splitlines():
        if in_header:
            if line.startswith("DOCUMENT ID:"):
                doc_id = line.replace("DOCUMENT ID:", "").strip()
            elif line.startswith("TITLE:"):
                title = line.replace("TITLE:", "").strip()
            elif line.startswith("VERSION:") or line.startswith("DOCUMENT TYPE:"):
                pass
            elif not line.strip():
                # blank line after header
                in_header = False
            else:
                in_header = False
                body_lines.append(line)
        else:
            body_lines.append(line)

    body_text = "\n".join(body_lines).strip()
    return doc_id, title, body_text

def load_knowledge_documents() -> List[Document]:
    """Loads all 20 TXT documents and extracts rich metadata."""
    if not os.path.exists(KB_DIR):
        raise FileNotFoundError(f"Knowledge base directory not found at: {KB_DIR}")

    txt_files = sorted([f for f in os.listdir(KB_DIR) if f.endswith(".txt")])
    logger.info(f"Found {len(txt_files)} TXT files in {KB_DIR}")

    docs = []
    for fname in txt_files:
        fpath = os.path.join(KB_DIR, fname)
        with open(fpath, "r", encoding="utf-8") as f:
            raw_text = f.read()

        doc_id, title, body_text = parse_header_metadata(raw_text, fname)
        doc = Document(
            page_content=body_text,
            metadata={
                "source": fname,
                "document_id": doc_id,
                "title": title
            }
        )
        docs.append(doc)

    return docs

def split_documents(docs: List[Document]) -> List[Document]:
    """Splits documents into ~500 token chunks with 75 token overlap."""
    # ~500 tokens is roughly 1800-2000 chars, with 300 char overlap
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1800,
        chunk_overlap=250,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_documents(docs)
    for idx, chunk in enumerate(chunks):
        chunk.metadata["chunk_id"] = f"{chunk.metadata.get('document_id', 'chunk')}_{idx}"
    logger.info(f"Created {len(chunks)} chunks from {len(docs)} documents.")
    return chunks

def build_vector_store(chunks: List[Document]):
    """Builds Qdrant vector store if accessible, else saves FAISS index locally."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    embeddings = HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": device}
    )
    qdrant_ready = False

    if settings.QDRANT_URL:
        try:
            from qdrant_client import QdrantClient
            from langchain_qdrant import QdrantVectorStore

            client = QdrantClient(
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                timeout=5.0
            )
            # Check server
            client.get_collections()
            logger.info("Connected to Qdrant at %s", settings.QDRANT_URL)

            # Recreate or populate collection
            vector_store = QdrantVectorStore.from_documents(
                documents=chunks,
                embedding=embeddings,
                url=settings.QDRANT_URL,
                api_key=settings.QDRANT_API_KEY if settings.QDRANT_API_KEY else None,
                collection_name=settings.QDRANT_COLLECTION,
                force_recreate=True
            )
            logger.info("Successfully populated Qdrant collection '%s'.", settings.QDRANT_COLLECTION)
            qdrant_ready = True
        except Exception as exc:
            logger.warning("Could not connect to Qdrant (%s). Creating FAISS fallback.", exc)

    # Always also create FAISS fallback for offline reliability
    from langchain_community.vectorstores import FAISS
    os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
    faiss_store = FAISS.from_documents(chunks, embeddings)
    faiss_store.save_local(FAISS_INDEX_DIR)
    logger.info("FAISS vector store saved to %s", FAISS_INDEX_DIR)

    return qdrant_ready

def main():
    print("=" * 70)
    print("NutriAI - RAG Knowledge Base Ingestion")
    print("=" * 70)
    docs = load_knowledge_documents()
    print(f"Loaded {len(docs)} documents.")
    for d in docs[:3]:
        print(f" - [{d.metadata['document_id']}] {d.metadata['title']} ({len(d.page_content)} chars)")

    chunks = split_documents(docs)
    print(f"Total Chunks: {len(chunks)}")

    print(f"Embedding model: {settings.EMBEDDING_MODEL}")
    qdrant_ok = build_vector_store(chunks)
    print(f"Qdrant Ingested: {qdrant_ok}")
    print(f"FAISS Fallback Built: True")
    print("RAG Ingestion Complete!")

if __name__ == "__main__":
    main()
