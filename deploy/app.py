import importlib.util
import json
import os
import sys
import uuid

from flask import Flask, Response, request

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def load_env_file(path: str) -> None:
    if not os.path.isfile(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_env_file(os.environ.get("ENV_FILE") or os.path.join(BASE_DIR, ".env"))
BACKEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "backend")
FUNCTIONS = ["auth", "chats", "send-message", "transcribe", "push"]

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024


class Context:
    def __init__(self):
        self.request_id = uuid.uuid4().hex
        self.function_name = ""


def load_handler(name: str):
    folder = os.path.join(BACKEND_DIR, name)
    if folder not in sys.path:
        sys.path.insert(0, folder)
    spec = importlib.util.spec_from_file_location(f"fn_{name.replace('-', '_')}", os.path.join(folder, "index.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.handler


HANDLERS = {name: load_handler(name) for name in FUNCTIONS}


@app.route("/api/<name>", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])
def call(name):
    handler = HANDLERS.get(name)
    if not handler:
        return Response(json.dumps({"error": "Функция не найдена"}), status=404, mimetype="application/json")

    event = {
        "httpMethod": request.method,
        "headers": {k: v for k, v in request.headers.items()},
        "queryStringParameters": request.args.to_dict() or None,
        "body": request.get_data(as_text=True),
        "isBase64Encoded": False,
        "requestContext": {"identity": {"sourceIp": request.headers.get("X-Real-IP", request.remote_addr)}},
    }
    result = handler(event, Context())

    response = Response(result.get("body", ""), status=result.get("statusCode", 200))
    for key, value in (result.get("headers") or {}).items():
        response.headers[key] = value
    if "Content-Type" not in response.headers:
        response.headers["Content-Type"] = "application/json"
    return response


@app.route("/api/health")
def health():
    return {"status": "ok", "functions": FUNCTIONS}
