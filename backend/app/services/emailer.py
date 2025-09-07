from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from typing import Optional
from ..config import settings

def send_email(email: str, download_link: Optional[str], name: str, job_id: str) -> None:
    if not (settings.SMTP_SERVER and settings.SMTP_USER and settings.SMTP_PASSWORD):
        return  # emailing disabled if creds not set

    msg = MIMEMultipart()
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    msg["To"] = email
    msg["Subject"] = settings.EMAIL_SUBJECT

    results_page_url = f"{settings.FRONTEND_URL}/results?jobId={job_id}&resultUrl={download_link or ''}"
    body = f"""Hello {name},

Your file has been successfully processed.

Direct download: {download_link or 'N/A'}
Viewer: {results_page_url}

Best regards,
SimBioSys Lab, Northeastern University"""
    msg.attach(MIMEText(body, "plain"))

    with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], [email], msg.as_string())