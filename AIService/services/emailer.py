import smtplib
from email.message import EmailMessage
import os

def send_summary_email(to_email: str, summary: str, file_id: str):
    # SMTP server config (Gmail)
    SMTP_SERVER = "smtp.gmail.com"
    SMTP_PORT = 587
    SMTP_USER = os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

    msg = EmailMessage()
    msg["Subject"] = f"Summary for File ID: {file_id}"
    msg["From"] = SMTP_USER
    msg["To"] = to_email
    msg.set_content(f"File ID: {file_id}\n\nSummary:\n{summary}")

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"✅ Email sent to {to_email}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
