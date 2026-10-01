import platform
import time
from typing import Literal

import coffeemail
from coffeemail import CoffeeMail
from coffeemail.core.errors import CoffeeMailError
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

app = FastAPI(title="CoffeeMail Python SDK Runner", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_runner_info() -> dict[str, str]:
    return {
        "language": "python",
        "runtime": f"Python {platform.python_version()}",
        "sdkVersion": getattr(coffeemail, "__version__", "0.1.0"),
        "status": "online",
    }


def standard_response(
    data: object = None,
    error: dict[str, object] | None = None,
    start_time: float | None = None,
) -> dict[str, object]:
    elapsed_ms = int((time.perf_counter() - start_time) * 1000) if start_time else 0
    return {
        "success": error is None,
        "runner": get_runner_info(),
        "executionTimeMs": elapsed_ms,
        "data": data,
        "error": error,
    }


def get_client(api_key: str | None, base_url: str | None = None) -> CoffeeMail:
    if not api_key or not api_key.strip():
        raise HTTPException(
            status_code=400,
            detail="Chave de API não informada. Defina a API Key no cabeçalho do Workbench.",
        )
    return CoffeeMail(api_key=api_key.strip(), base_url=base_url)


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content=standard_response(
            error={"code": "INTERNAL_ERROR", "message": str(exc), "status": 500}
        ),
    )


@app.get("/api/v1/runner/info")
def runner_info() -> dict[str, object]:
    info = get_runner_info()
    return standard_response(data=info)


@app.post("/api/v1/client/introspect")
def introspect_key(
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    if not x_coffeemail_api_key:
        return standard_response(
            data={"valid": False, "environment": "sandbox", "permissions": [], "keyPreview": ""},
            start_time=start,
        )
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.introspect()
        if res.error or not res.data:
            return standard_response(
                data={
                    "valid": False,
                    "environment": "sandbox",
                    "permissions": [],
                    "keyPreview": f"{x_coffeemail_api_key[:8]}...",
                },
                start_time=start,
            )
        env = "live" if x_coffeemail_api_key.startswith("cm_live_") else "test"
        return standard_response(
            data={
                "valid": True,
                "environment": env,
                "permissions": res.data.scopes,
                "keyPreview": f"{x_coffeemail_api_key[:8]}...",
            },
            start_time=start,
        )
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(
            error={"code": "INTROSPECT_FAILED", "message": str(exc), "status": 400},
            start_time=start,
        )


class SendEmailDTO(BaseModel):
    from_address: str = Field(alias="from")
    to: str | list[str]
    subject: str
    html: str | None = None
    text: str | None = None
    replyTo: str | None = None
    tags: list[dict[str, str]] | None = None


@app.post("/api/v1/emails/send")
def send_email(
    payload: SendEmailDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        target_to = payload.to[0] if isinstance(payload.to, list) and len(payload.to) > 0 else payload.to
        res = client.emails.send({
            "from": payload.from_address,
            "to": target_to,
            "subject": payload.subject,
            "html": payload.html,
            "text": payload.text,
            "replyTo": payload.replyTo,
        })
        if res.error or not res.data:
            return standard_response(
                error={"code": "SEND_ERROR", "message": res.error.message if res.error else "Erro ao enviar", "status": res.status_code or 400},
                start_time=start,
            )
        data = {"id": res.data.id, "status": res.data.status, "createdAt": res.data.created_at or time.strftime("%Y-%m-%dT%H:%M:%SZ")}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(
            error={"code": "EMAIL_SEND_FAILED", "message": str(exc), "status": 400},
            start_time=start,
        )


@app.get("/api/v1/emails")
def list_emails(
    page: int = Query(1),
    limit: int = Query(10),
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.emails.list(limit=limit)
        if res.error or not res.data:
            return standard_response(
                error={"code": "LIST_EMAILS_ERROR", "message": res.error.message if res.error else "Erro ao listar", "status": res.status_code or 400},
                start_time=start,
            )
        items = [
            {
                "id": e.id,
                "from": e.from_address,
                "to": [e.to] if isinstance(e.to, str) else e.to,
                "subject": e.subject,
                "status": e.status,
                "createdAt": e.created_at,
            }
            for e in res.data.emails
        ]
        return standard_response(
            data={"items": items, "total": len(items), "page": page, "limit": limit, "hasMore": bool(res.data.next_cursor)},
            start_time=start,
        )
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(
            error={"code": "LIST_EMAILS_FAILED", "message": str(exc), "status": 400},
            start_time=start,
        )


class CreateDomainDTO(BaseModel):
    name: str


@app.get("/api/v1/domains")
def list_domains(
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.domains.list()
        if res.error or not res.data:
            return standard_response(
                error={"code": "LIST_DOMAINS_ERROR", "message": res.error.message if res.error else "Erro", "status": 400},
                start_time=start,
            )
        items = [
            {"id": d.id, "name": d.name, "status": d.status, "createdAt": d.created_at}
            for d in res.data.domains
        ]
        return standard_response(data=items, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "DOMAINS_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.post("/api/v1/domains")
def create_domain(
    payload: CreateDomainDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.domains.create(payload.name)
        if res.error or not res.data:
            return standard_response(
                error={"code": "CREATE_DOMAIN_ERROR", "message": res.error.message if res.error else "Erro", "status": 400},
                start_time=start,
            )
        data = {"id": res.data.id, "name": res.data.name, "status": res.data.status, "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_DOMAIN_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.post("/api/v1/domains/{domain_id}/verify")
def verify_domain(
    domain_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.domains.verify(domain_id)
        if res.error or not res.data:
            return standard_response(error={"code": "VERIFY_DOMAIN_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        return standard_response(data=res.data.model_dump(by_alias=True), start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "VERIFY_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/domains/{domain_id}/health")
def domain_health(
    domain_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.domains.get(domain_id)
        if res.error or not res.data:
            return standard_response(error={"code": "HEALTH_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        return standard_response(data=res.data.model_dump(by_alias=True), start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "HEALTH_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/templates")
def list_templates(
    page: int = Query(1),
    limit: int = Query(10),
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.templates.list(limit=limit)
        if res.error or not res.data:
            return standard_response(error={"code": "LIST_TEMPLATES_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        items = [
            {"id": t.id, "name": t.name, "subject": t.subject, "format": "html", "createdAt": t.created_at}
            for t in res.data.templates
        ]
        return standard_response(data={"items": items, "total": len(items), "page": page, "limit": limit, "hasMore": False}, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "TEMPLATES_FAILED", "message": str(exc), "status": 400}, start_time=start)


class CreateTemplateDTO(BaseModel):
    name: str
    subject: str | None = None
    html: str
    format: str | None = "html"


@app.post("/api/v1/templates")
def create_template(
    payload: CreateTemplateDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.templates.create(name=payload.name, html=payload.html, subject=payload.subject)
        if res.error or not res.data:
            return standard_response(error={"code": "CREATE_TEMPLATE_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        data = {"id": res.data.id, "name": res.data.name, "subject": res.data.subject, "format": "html", "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_TEMPLATE_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.post("/api/v1/templates/{template_id}/preview")
def preview_template(
    template_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.templates.preview(template_id=template_id)
        if res.error or not res.data:
            return standard_response(error={"code": "PREVIEW_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        return standard_response(data=res.data.model_dump(by_alias=True), start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "PREVIEW_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/audiences")
def list_audiences(
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.audiences.list()
        if res.error or not res.data:
            return standard_response(error={"code": "AUDIENCES_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        items = [
            {"id": a.id, "name": a.name, "totalContacts": a.total_contacts, "createdAt": a.created_at}
            for a in res.data.audiences
        ]
        return standard_response(data=items, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "AUDIENCES_FAILED", "message": str(exc), "status": 400}, start_time=start)


class CreateAudienceDTO(BaseModel):
    name: str
    description: str | None = None


@app.post("/api/v1/audiences")
def create_audience(
    payload: CreateAudienceDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.audiences.create(name=payload.name, description=payload.description)
        if res.error or not res.data:
            return standard_response(error={"code": "CREATE_AUDIENCE_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        data = {"id": res.data.id, "name": res.data.name, "totalContacts": res.data.total_contacts, "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_AUDIENCE_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/audiences/{audience_id}/contacts")
def list_contacts(
    audience_id: str,
    page: int = Query(1),
    limit: int = Query(10),
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.audiences.list_contacts(audience_id, limit=limit)
        if res.error or not res.data:
            return standard_response(error={"code": "CONTACTS_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        items = [
            {"id": c.id, "email": c.email, "firstName": c.name, "createdAt": c.created_at}
            for c in res.data.contacts
        ]
        return standard_response(data={"items": items, "total": res.data.total or len(items), "page": page, "limit": limit, "hasMore": False}, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CONTACTS_FAILED", "message": str(exc), "status": 400}, start_time=start)


class CreateContactDTO(BaseModel):
    email: str
    firstName: str | None = None
    lastName: str | None = None


@app.post("/api/v1/audiences/{audience_id}/contacts")
def create_contact(
    audience_id: str,
    payload: CreateContactDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        name = f"{payload.firstName or ''} {payload.lastName or ''}".strip() or None
        res = client.audiences.create_contact(audience_id, email=payload.email, name=name)
        if res.error or not res.data:
            return standard_response(error={"code": "CREATE_CONTACT_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        data = {"id": res.data.id, "email": res.data.email, "firstName": payload.firstName, "lastName": payload.lastName, "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_CONTACT_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/suppressions")
def list_suppressions(
    page: int = Query(1),
    limit: int = Query(10),
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.suppressions.list(limit=limit)
        if res.error or not res.data:
            return standard_response(error={"code": "SUPPRESSIONS_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        items = [
            {"id": s.id, "email": s.email, "reason": s.reason, "createdAt": s.created_at}
            for s in res.data.suppressions
        ]
        return standard_response(data={"items": items, "total": len(items), "page": page, "limit": limit, "hasMore": False}, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "SUPPRESSIONS_FAILED", "message": str(exc), "status": 400}, start_time=start)


class CreateSuppressionDTO(BaseModel):
    email: str
    reason: Literal["bounce", "complaint", "unsubscribe", "manual"] = "manual"


@app.post("/api/v1/suppressions")
def create_suppression(
    payload: CreateSuppressionDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.suppressions.create(email=payload.email, reason=payload.reason)
        if res.error or not res.data:
            return standard_response(error={"code": "CREATE_SUPPRESSION_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        data = {"id": res.data.id, "email": res.data.email, "reason": res.data.reason, "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_SUPPRESSION_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.delete("/api/v1/suppressions/{email}")
def delete_suppression(
    email: str,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.suppressions.delete(email)
        if res.error:
            return standard_response(error={"code": "DELETE_SUPPRESSION_ERROR", "message": res.error.message, "status": 400}, start_time=start)
        return standard_response(data=True, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "DELETE_SUPPRESSION_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/webhooks")
def list_webhooks(
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.webhooks.list()
        if res.error or not res.data:
            return standard_response(error={"code": "WEBHOOKS_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        items = [
            {"id": w.id, "url": w.url, "events": w.events, "status": "active" if w.active else "inactive", "createdAt": w.created_at}
            for w in res.data.webhooks
        ]
        return standard_response(data=items, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "WEBHOOKS_FAILED", "message": str(exc), "status": 400}, start_time=start)


class CreateWebhookDTO(BaseModel):
    url: str
    events: list[str]


@app.post("/api/v1/webhooks")
def create_webhook(
    payload: CreateWebhookDTO,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.webhooks.create(url=payload.url, events=payload.events)
        if res.error or not res.data:
            return standard_response(error={"code": "CREATE_WEBHOOK_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        data = {"id": res.data.id, "url": res.data.url, "events": res.data.events, "status": "active", "createdAt": res.data.created_at}
        return standard_response(data=data, start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "CREATE_WEBHOOK_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.post("/api/v1/webhooks/{webhook_id}/test")
def test_webhook(
    webhook_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.webhooks.test(webhook_id)
        if res.error or not res.data:
            return standard_response(error={"code": "TEST_WEBHOOK_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        return standard_response(data=res.data.model_dump(by_alias=True), start_time=start)
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "TEST_WEBHOOK_FAILED", "message": str(exc), "status": 400}, start_time=start)


@app.get("/api/v1/stats")
def get_stats(
    startDate: str | None = Query(None),
    endDate: str | None = Query(None),
    x_coffeemail_api_key: str | None = Header(None, alias="x-coffeemail-api-key"),
    x_coffeemail_base_url: str | None = Header(None, alias="x-coffeemail-base-url"),
) -> dict[str, object]:
    start = time.perf_counter()
    try:
        client = get_client(x_coffeemail_api_key, x_coffeemail_base_url)
        res = client.stats.get(from_date=startDate, to_date=endDate)
        if res.error or not res.data:
            return standard_response(error={"code": "STATS_ERROR", "message": res.error.message if res.error else "Erro", "status": 400}, start_time=start)
        d = res.data
        return standard_response(
            data={
                "totalSent": d.total_sent,
                "totalDelivered": d.total_delivered,
                "totalBounced": d.total_bounced,
                "deliveryRate": d.delivery_rate,
            },
            start_time=start,
        )
    except CoffeeMailError as exc:
        return standard_response(
            error={"code": exc.code or "COFFEEMAIL_ERROR", "message": exc.message, "status": exc.status_code or 400},
            start_time=start,
        )
    except Exception as exc:
        return standard_response(error={"code": "STATS_FAILED", "message": str(exc), "status": 400}, start_time=start)
