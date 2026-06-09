from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.orm import mapped_column, MappedColumn
from sqlalchemy.sql import func

from app.db.database import Base


class TimestampMixin:
    """
    Mixin que agrega created_at y updated_at a cualquier modelo.
    Un mixin es una clase auxiliar que agrega funcionalidad
    sin ser un modelo completo por sí sola.
    """
    created_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
    updated_at: MappedColumn[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )