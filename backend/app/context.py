import contextvars

# Request-scoped context variables for logging enrichment
request_id_var = contextvars.ContextVar("request_id", default="N/A")
user_id_var = contextvars.ContextVar("user_id", default="N/A")