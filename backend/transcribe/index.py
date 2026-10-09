"""Расшифровка голосового сообщения в текст через Whisper"""
import json
import os
import urllib.request
import uuid

import psycopg2

SCHEMA = "t_p64541051_serge_chat_app"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Session-Id",
}


def reply(status: int, payload: dict) -> dict:
    return {"statusCode": status, "headers": CORS, "body": json.dumps(payload)}


def build_multipart(file_bytes: bytes, filename: str) -> tuple:
    boundary = uuid.uuid4().hex
    parts = []
    for name, value in (("model", "whisper-1"), ("language", "ru")):
        parts.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        )
    parts.append(
        (
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode()
        + file_bytes
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def handler(event: dict, context) -> dict:
    """Скачивает аудио сообщения, расшифровывает и сохраняет текст"""
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    message_id = body.get("message_id")
    if not message_id:
        return reply(400, {"error": "Не передан message_id"})

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return reply(503, {"error": "Расшифровка пока не настроена"})

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    try:
        cur.execute(
            f"SELECT media_url, transcript FROM {SCHEMA}.messages WHERE id = %s AND kind = 'voice'",
            (message_id,),
        )
        row = cur.fetchone()
        if not row or not row[0]:
            return reply(404, {"error": "Голосовое сообщение не найдено"})
        if row[1]:
            return reply(200, {"transcript": row[1]})

        audio = urllib.request.urlopen(row[0], timeout=15).read()
        filename = "voice." + row[0].rsplit(".", 1)[-1]
        data, content_type = build_multipart(audio, filename)
        req = urllib.request.Request(
            "https://api.openai.com/v1/audio/transcriptions",
            data=data,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": content_type},
        )
        result = json.loads(urllib.request.urlopen(req, timeout=60).read())
        text = (result.get("text") or "").strip() or "Речь не распознана"

        cur.execute(f"UPDATE {SCHEMA}.messages SET transcript = %s WHERE id = %s", (text, message_id))
        conn.commit()
        return reply(200, {"transcript": text})
    finally:
        cur.close()
        conn.close()
