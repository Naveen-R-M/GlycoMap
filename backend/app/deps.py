from fastapi import Depends, Request
from .context import user_id_var

# Dependency that updates the logging user_id context if present in form/query
async def bind_user_id(request: Request) -> str:
    # Try to read user_id from query first, then from headers; form is handled in endpoint
    uid = request.headers.get("X-User-ID") or request.query_params.get("user_id")
    if uid:
        user_id_var.set(uid)
    return uid or "N/A"