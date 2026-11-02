import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.database import get_users_collection
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.schemas.auth import (
    UserSignupRequest,
    UserLoginRequest,
    UserProfileUpdate,
    UserResponse,
    AuthResponse
)

logger = logging.getLogger("nutriai.api.auth")
router = APIRouter(prefix="/auth", tags=["Authentication"])

security_scheme = HTTPBearer(auto_error=False)

# In-memory user store fallback if MongoDB is in offline mode
_memory_users: Dict[str, Dict[str, Any]] = {}

def _format_user_doc(doc: Dict[str, Any]) -> UserResponse:
    user_id = doc.get("user_id") or str(doc.get("_id", ""))
    created_at = doc.get("created_at")
    if isinstance(created_at, datetime):
        created_str = created_at.isoformat()
    elif isinstance(created_at, str):
        created_str = created_at
    else:
        created_str = datetime.now(timezone.utc).isoformat()

    return UserResponse(
        id=user_id,
        email=doc.get("email", ""),
        full_name=doc.get("full_name", ""),
        dietary_preference=doc.get("dietary_preference", "Vegetarian"),
        daily_calorie_target=doc.get("daily_calorie_target", 2000),
        created_at=created_str
    )

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    clean_email = email.strip().lower()
    col = get_users_collection()
    if col is not None:
        try:
            return col.find_one({"email": clean_email})
        except Exception as exc:
            logger.warning("Error fetching user from MongoDB: %s. Checking memory store.", exc)
    return _memory_users.get(clean_email)

def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    col = get_users_collection()
    if col is not None:
        try:
            doc = col.find_one({"user_id": user_id})
            if doc:
                return doc
        except Exception as exc:
            logger.warning("Error fetching user by ID from MongoDB: %s", exc)
    
    for u in _memory_users.values():
        if u.get("user_id") == user_id:
            return u
    return None

def save_new_user(user_doc: Dict[str, Any]) -> None:
    col = get_users_collection()
    clean_email = user_doc["email"]
    _memory_users[clean_email] = user_doc
    if col is not None:
        try:
            col.insert_one(user_doc)
        except Exception as exc:
            logger.warning("MongoDB insert user failed: %s. Cached in memory.", exc)

def update_user_record(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    col = get_users_collection()
    updated_doc = None
    if col is not None:
        try:
            col.update_one({"user_id": user_id}, {"$set": updates})
            updated_doc = col.find_one({"user_id": user_id})
        except Exception as exc:
            logger.warning("MongoDB update user failed: %s", exc)
    
    for k, v in _memory_users.items():
        if v.get("user_id") == user_id:
            v.update(updates)
            if not updated_doc:
                updated_doc = v
            break

    return updated_doc

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> UserResponse:
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing subject identifier",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    user_doc = get_user_by_id(user_id)
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return _format_user_doc(user_doc)

@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(data: UserSignupRequest):
    """Register a new user account."""
    clean_email = data.email.strip().lower()
    
    existing = get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    hashed_pwd = hash_password(data.password)
    now = datetime.now(timezone.utc)

    user_doc = {
        "user_id": user_id,
        "email": clean_email,
        "full_name": data.full_name.strip(),
        "hashed_password": hashed_pwd,
        "dietary_preference": data.dietary_preference or "Vegetarian",
        "daily_calorie_target": data.daily_calorie_target or 2000,
        "is_active": True,
        "created_at": now
    }

    save_new_user(user_doc)
    
    # Generate JWT
    token = create_access_token(data={"sub": user_id, "email": clean_email, "name": data.full_name.strip()})
    user_resp = _format_user_doc(user_doc)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp,
        message="Account created successfully"
    )

@router.post("/login", response_model=AuthResponse)
def login(data: UserLoginRequest):
    """Authenticate existing user credentials and return access token."""
    clean_email = data.email.strip().lower()
    user_doc = get_user_by_email(clean_email)

    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )
    
    if not verify_password(data.password, user_doc.get("hashed_password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    user_id = user_doc["user_id"]
    token = create_access_token(data={"sub": user_id, "email": clean_email, "name": user_doc.get("full_name", "")})
    user_resp = _format_user_doc(user_doc)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=user_resp,
        message="Welcome back!"
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: UserResponse = Depends(get_current_user)):
    """Retrieve details of the authenticated user."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(data: UserProfileUpdate, current_user: UserResponse = Depends(get_current_user)):
    """Update user personal preferences and targets."""
    updates = {}
    if data.full_name is not None:
        updates["full_name"] = data.full_name.strip()
    if data.dietary_preference is not None:
        updates["dietary_preference"] = data.dietary_preference
    if data.daily_calorie_target is not None:
        updates["daily_calorie_target"] = data.daily_calorie_target

    if not updates:
        return current_user

    updated_doc = update_user_record(current_user.id, updates)
    if not updated_doc:
        raise HTTPException(status_code=404, detail="User not found")

    return _format_user_doc(updated_doc)

@router.post("/logout")
def logout(current_user: UserResponse = Depends(get_current_user)):
    """Acknowledge user sign out."""
    return {
        "success": True,
        "message": f"Successfully logged out {current_user.email}"
    }
