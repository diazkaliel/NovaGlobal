from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ColorSchema(BaseModel):
    name: str
    hex: str
    pantone: Optional[str] = None

class TypographySchema(BaseModel):
    usage: str
    font_family: str
    source: Optional[str] = "Google Fonts"

class BrandKitBase(BaseModel):
    client_id: int
    brand_name: str
    colors: List[ColorSchema] = []
    typographies: List[TypographySchema] = []
    guidelines: Optional[str] = Field(None, max_length=500)

class BrandKitCreate(BrandKitBase):
    pass

class BrandKitResponse(BrandKitBase):
    id: int
    system: str
    created_at: datetime

    class Config:
        from_attributes = True
