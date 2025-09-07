import uuid
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from .context import request_id_var, user_id_var

class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Generate or propagate a request ID
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request_id_var.set(req_id)

        # Default user_id in logs until endpoint sets it explicitly
        user_id_var.set("N/A")
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response