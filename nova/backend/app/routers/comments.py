from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.database import get_db
from app.models.comment import Comment
from app.models.user import User
from app.core.dependencies import get_current_user
from app.schemas.comment import CommentAdminResponse

router = APIRouter(prefix="/comments", tags=["comments"])


@router.get("/admin", response_model=list[CommentAdminResponse])
async def list_comments_admin(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los comentarios de clientes en el sistema (aprobados y pendientes)
    para la interfaz administrativa de moderación.
    """
    # Solo administradores pueden ver todos los comentarios
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )
    
    stmt = select(Comment).order_by(Comment.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/{comment_id}/approve", response_model=CommentAdminResponse)
async def toggle_comment_approval(
    comment_id: int,
    is_approved: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Aprueba o rechaza (desaprueba) un comentario para moderar lo que se ve en la web.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )
        
    stmt = select(Comment).where(Comment.id == comment_id)
    result = await db.execute(stmt)
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comentario no encontrado"
        )
        
    comment.is_approved = is_approved
    await db.commit()
    await db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina permanentemente un comentario de la base de datos.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos suficientes para realizar esta acción"
        )
        
    stmt = select(Comment).where(Comment.id == comment_id)
    result = await db.execute(stmt)
    comment = result.scalar_one_or_none()
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comentario no encontrado"
        )
        
    await db.delete(comment)
    await db.commit()
    return None
