from pydantic import BaseModel, Field
from datetime import datetime


class CommentCreate(BaseModel):
    client_name: str = Field(..., min_length=2, max_length=100)
    rating: int = Field(..., ge=1, le=5)
    comment: str = Field(..., min_length=5, max_length=1000)


class CommentResponse(BaseModel):
    id: int
    client_name: str
    rating: int
    comment: str
    created_at: datetime

    model_config = {"from_attributes": True}


class CommentAdminResponse(CommentResponse):
    is_approved: bool

    model_config = {"from_attributes": True}
