"""Отправка email через SMTP для мессенджера Трынделка"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def send_email(to_email: str, subject: str, html_body: str) -> None:
    """Отправляет HTML-письмо через SMTP, используя настройки из переменных окружения"""
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT") or "465")
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_email = os.environ.get("SMTP_FROM_EMAIL") or user

    if not host or not user or not password:
        raise RuntimeError("SMTP не настроен")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=10) as server:
            server.login(user, password)
            server.sendmail(from_email, [to_email], msg.as_string())
    else:
        with smtplib.SMTP(host, port, timeout=10) as server:
            server.starttls()
            server.login(user, password)
            server.sendmail(from_email, [to_email], msg.as_string())
