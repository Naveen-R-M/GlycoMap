import os
from app.config import settings

def ensure_directory_structure() -> None:
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(settings.LOGS_DIR, exist_ok=True)

    # Write permission probe
    test_file = os.path.join(settings.UPLOAD_FOLDER, ".test_write_permissions")
    with open(test_file, "w") as f:
        f.write("ok")
    os.remove(test_file)