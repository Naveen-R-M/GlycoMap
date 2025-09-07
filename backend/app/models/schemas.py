from pydantic import BaseModel
from typing import List, Optional

class UploadResponse(BaseModel):
    status: str
    message: str
    email: str
    name: str
    files: List[str]
    job_ids: List[str]
    user_id: str