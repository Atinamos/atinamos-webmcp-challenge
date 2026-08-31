from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DEMO = Path(__file__).resolve().parent

app = FastAPI(title="Atinamos WebMCP Challenge Reference Harness")

CATALOG = {
    "services": [
        {
            "slug": "json-repair",
            "name": "JSON Validate / Repair",
            "status": "live",
            "price_usdc": 0.005,
            "payment": {"protocol": "x402", "network": "base", "demo": True},
            "api": {"method": "POST", "path": "/agent/json-repair"},
            "input_schema": {
                "type": "object",
                "required": ["json"],
                "properties": {
                    "json": {"type": "string"},
                    "mode": {"type": "string", "enum": ["validate", "repair"], "default": "repair"},
                },
                "additionalProperties": False,
            },
            "fulfilment": {"mode": "synchronous", "result": "deterministic JSON"},
            "tags": ["json", "repair", "validation"],
        }
    ]
}


def repair_demo_json(value: str) -> dict[str, Any]:
    """Small deterministic repair used only by the public reference harness."""
    repaired = value.strip()
    repairs: list[str] = []

    if "'" in repaired:
        repaired = repaired.replace("'", '"')
        repairs.append("converted_single_quoted_strings")

    while ",}" in repaired or ",]" in repaired:
        repaired = repaired.replace(",}", "}").replace(",]", "]")
        repairs.append("removed_trailing_commas")

    try:
        parsed = json.loads(repaired)
    except json.JSONDecodeError as exc:
        return {
            "service": "json-repair",
            "price_usdc": 0.005,
            "mode": "repair",
            "status": "unrepairable",
            "valid": False,
            "error": str(exc),
            "repairs": repairs,
        }

    return {
        "service": "json-repair",
        "price_usdc": 0.005,
        "mode": "repair",
        "status": "repaired" if repairs else "valid",
        "valid": True,
        "repairs": repairs,
        "result": parsed,
        "json": json.dumps(parsed, separators=(",", ":")),
        "demo_harness": True,
    }


@app.get("/", response_class=HTMLResponse)
async def index() -> FileResponse:
    return FileResponse(DEMO / "index.html", media_type="text/html")


@app.get("/demo/demo-activity.js")
async def demo_activity() -> FileResponse:
    return FileResponse(DEMO / "demo-activity.js", media_type="text/javascript")


@app.get("/webmcp/agent-shop-webmcp.js")
async def webmcp_bundle() -> FileResponse:
    return FileResponse(SRC / "agent-shop-webmcp.js", media_type="text/javascript")


@app.get("/v1/catalog")
async def catalog() -> dict[str, Any]:
    return CATALOG


@app.post("/agent/json-repair")
async def json_repair(
    request: Request,
    x_atinamos_demo_approval: str | None = Header(default=None),
) -> JSONResponse:
    payload = await request.json()

    if x_atinamos_demo_approval != "approved":
        return JSONResponse(
            status_code=402,
            headers={
                # Presence of this header mirrors the real endpoint's x402 boundary.
                # The local harness intentionally does not impersonate a production
                # Coinbase payment challenge.
                "payment-required": "atinamos-local-demo",
            },
            content={
                "error": "payment_required",
                "service": "json-repair",
                "amount_usdc": 0.005,
                "network": "base",
                "demo": True,
                "message": "Local reference boundary. Human demo approval is required before execution.",
            },
        )

    raw = str(payload.get("json", ""))
    return JSONResponse(status_code=200, content=repair_demo_json(raw))


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "mode": "public-reference-harness"}
