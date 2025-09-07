import requests
from typing import Optional
from app.config import settings

def upload_to_fileio(file_path: str) -> Optional[str]:
    url = settings.FILEIO_API_URL
    with open(file_path, "rb") as fh:
        resp = requests.post(url, files={"file": fh}, timeout=60)
    if resp.ok:
        data = resp.json()
        return data.get("link")
    return None