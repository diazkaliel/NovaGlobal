"""La clave y el resultado se guardan en la misma transacción que la operación."""
import hashlib
import json

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.models.idempotency import IdempotencyRecord


async def begin_operation(db, user_id, key, operation, payload):
    if key is None:
        return None
    fingerprint = hashlib.sha256(json.dumps(
        {"operation": operation, "payload": payload},
        sort_keys=True, separators=(",", ":"), ensure_ascii=False,
    ).encode()).hexdigest()
    # El índice único espera a que la petición concurrente confirme o revierta.
    await db.execute(insert(IdempotencyRecord).values(
        user_id=user_id, key=str(key), fingerprint=fingerprint,
    ).on_conflict_do_nothing(index_elements=["user_id", "key"]))
    record = (await db.execute(select(IdempotencyRecord).where(
        IdempotencyRecord.user_id == user_id,
        IdempotencyRecord.key == str(key),
    ).with_for_update())).scalar_one()
    if record.fingerprint != fingerprint:
        raise HTTPException(status_code=409, detail="Esta clave de envío ya se utilizó con otros datos.")
    return record
