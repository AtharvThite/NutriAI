from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserSignupRequest(BaseModel):
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, description="Password with at least 6 characters")
    full_name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    dietary_preference: Optional[str] = Field("Vegetarian", description="e.g. Vegetarian, Non-Vegetarian, Vegan, Jain, Eggetarian")
    daily_calorie_target: Optional[int] = Field(2000, ge=800, le=6000, description="Daily target calories in kcal")

class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Password")

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    dietary_preference: Optional[str] = None
    daily_calorie_target: Optional[int] = Field(None, ge=800, le=6000)

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    dietary_preference: str = "Vegetarian"
    daily_calorie_target: int = 2000
    created_at: Optional[str] = None

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    message: Optional[str] = "Authentication successful"
