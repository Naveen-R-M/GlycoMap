import logging
from logging.handlers import RotatingFileHandler
from .context import user_id_var
from .config import settings

class UserContextFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        # Inject user_id from contextvar into log record
        try:
            record.user_id = user_id_var.get()
        except Exception:
            record.user_id = "N/A"
        return True

def setup_logging() -> logging.Logger:
    logger = logging.getLogger("allosmod")
    logger.setLevel(getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO))

    handler = RotatingFileHandler(settings.LOG_FILE, maxBytes=5_000_000, backupCount=3)
    formatter = logging.Formatter(settings.LOG_FORMAT)
    handler.setFormatter(formatter)
    handler.addFilter(UserContextFilter())

    # avoid duplicate handlers when reloading
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False
    return logger