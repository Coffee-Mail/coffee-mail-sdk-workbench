import platform
import time
from collections.abc import Callable
from typing import Any, Literal, TypeVar

import coffeemail
from coffeemail import CoffeeMail, CoffeeMailError, CoffeeMailResponse
from fastapi import FastAPI, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

T = TypeVar("T")
ClientFactory = Callable[[str], CoffeeMail]
Operation = Callable[[CoffeeMail], CoffeeMailResponse[T]]
Presenter = Callable[[T], object]

API_KEY_HEADER = "x-coffeemail-api-key"
EXECUTION_ERROR = "RUNNER_EXECUTION_ERROR"
MISSING_API_KEY_MESSAGE = (
    "Chave de API não informada. Defina a API Key no cabeçalho do Workbench "
    "para executar operações no SDK."
)
DEFAULT_ERROR_STATUS = 400
INTERNAL_ERROR_STATUS = 500
LIVE_KEY_PREFIX = "cm_live_"
KEY_PREVIEW_LENGTH = 8
PERCENT = 100.0
RATE_DECIMALS = 2
TEMPLATE_FORMATS = {"html", "react"}

app = FastAPI(title="CoffeeMail Python SDK Runner", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def default_client_factory(api_key: str) -> CoffeeMail:
    return CoffeeMail(api_key=api_key, locale="pt-BR")


app.state.client_factory = default_client_factory


def get_runner_info() -> dict[str, str]:
    return {
        "language": "python",
        "runtime": f"Python {platform.python_version()}",
        "sdkVersion": coffeemail.__version__,
        "status": "online",
    }


def elapsed_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def standard_response(
    data: object = None,
    error: dict[str, object] | None = None,
    start_time: float | None = None,
) -> dict[str, object]:
    return {
        "success": error is None,
        "runner": get_runner_info(),
        "executionTimeMs": elapsed_ms(start_time) if start_time else 0,
        "data": data,
        "error": error,
    }


def sdk_error(error: CoffeeMailError) -> dict[str, object]:
    return {
        "code": error.code,
        "message": error.message,
        "status": error.status_code or DEFAULT_ERROR_STATUS,
        "details": {**error.details, "apiCode": error.api_code, "requestId": error.request_id},
    }


def execute(
    request: Request,
    api_key: str | None,
    operation: Operation[T],
    present: Presenter[T],
) -> dict[str, object]:
    start = time.perf_counter()
    key = (api_key or "").strip()
    if not key:
        return standard_response(
            error={
                "code": EXECUTION_ERROR,
                "message": MISSING_API_KEY_MESSAGE,
                "status": DEFAULT_ERROR_STATUS,
                "details": None,
            },
            start_time=start,
        )
    factory: ClientFactory = request.app.state.client_factory
    res = operation(factory(key))
    if res.error is not None:
        return standard_response(error=sdk_error(res.error), start_time=start)
    return standard_response(data=present(res.data), start_time=start)  # type: ignore[arg-type]


def now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def key_preview(api_key: str) -> str:
    return f"{api_key[:KEY_PREVIEW_LENGTH]}..." if api_key else ""


def delivery_rate(sent: int, delivered: int) -> float:
    if sent <= 0:
        return 0.0
    return round(delivered * PERCENT / sent, RATE_DECIMALS)


def page_of(
    items: list[dict[str, object]], total: int, page: int, limit: int, has_more: bool
) -> dict[str, object]:
    return {"items": items, "total": total, "page": page, "limit": limit, "hasMore": has_more}


@app.exception_handler(Exception)
async def global_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=INTERNAL_ERROR_STATUS,
        content=standard_response(
            error={"code": "INTERNAL_ERROR", "message": str(exc), "status": INTERNAL_ERROR_STATUS}
        ),
    )


@app.get("/api/v1/runner/info")
def runner_info() -> dict[str, object]:
    return standard_response(data=get_runner_info())


@app.post("/api/v1/client/introspect")
def introspect_key(
    request: Request,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    start = time.perf_counter()
    key = (x_coffeemail_api_key or "").strip()
    invalid = {
        "valid": False,
        "environment": "sandbox",
        "permissions": [],
        "keyPreview": key_preview(key),
    }
    if not key:
        return standard_response(data=invalid, start_time=start)
    res = request.app.state.client_factory(key).introspect()
    if res.error is not None or res.data is None:
        return standard_response(data=invalid, start_time=start)
    return standard_response(
        data={
            "valid": True,
            "environment": "live" if key.startswith(LIVE_KEY_PREFIX) else "test",
            "permissions": res.data.scopes,
            "keyPreview": key_preview(key),
        },
        start_time=start,
    )


class TagDTO(BaseModel):
    name: str
    value: str


class SendEmailDTO(BaseModel):
    from_address: str = Field(alias="from")
    to: str | list[str]
    subject: str
    html: str | None = None
    text: str | None = None
    replyTo: str | None = None
    tags: list[TagDTO] | None = None


@app.post("/api/v1/emails/send")
def send_email(
    request: Request,
    payload: SendEmailDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    body: dict[str, object] = {
        "from": payload.from_address,
        "to": payload.to,
        "subject": payload.subject,
        "html": payload.html,
        "text": payload.text,
        "replyTo": payload.replyTo,
        "tags": [tag.model_dump() for tag in payload.tags] if payload.tags else None,
    }
    clean = {k: v for k, v in body.items() if v is not None}
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.emails.send(clean),
        lambda sent: {
            "id": sent.id,
            "status": sent.status,
            "createdAt": sent.queued_at or now_iso(),
        },
    )


@app.get("/api/v1/emails")
def list_emails(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    def present(data: Any) -> object:
        items = [
            {
                "id": e.id,
                "from": e.from_address,
                "to": e.to,
                "subject": e.subject or "",
                "status": e.status,
                "createdAt": e.created_at,
            }
            for e in data.emails
        ]
        return page_of(items, len(items), page, limit, data.next_cursor is not None)

    return execute(request, x_coffeemail_api_key, lambda c: c.emails.list(limit=limit), present)


class CreateDomainDTO(BaseModel):
    name: str


@app.get("/api/v1/domains")
def list_domains(
    request: Request,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.domains.list(),
        lambda data: [
            {
                "id": d.id,
                "name": d.name,
                "status": d.status,
                "dkimSelector": d.dkim_selector,
                "createdAt": d.created_at,
            }
            for d in data.domains
        ],
    )


@app.post("/api/v1/domains")
def create_domain(
    request: Request,
    payload: CreateDomainDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.domains.create(payload.name),
        lambda d: {
            "id": d.id,
            "name": d.name,
            "status": d.status,
            "createdAt": d.created_at or now_iso(),
        },
    )


@app.post("/api/v1/domains/{domain_id}/verify")
def verify_domain(
    request: Request,
    domain_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.domains.verify(domain_id),
        lambda d: d.model_dump(by_alias=True),
    )


@app.get("/api/v1/domains/{domain_id}/health")
def domain_health(
    request: Request,
    domain_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.domains.get_health(domain_id),
        lambda h: h.model_dump(by_alias=True),
    )


@app.get("/api/v1/templates")
def list_templates(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    def present(data: Any) -> object:
        items = [
            {
                "id": t.id,
                "name": t.name,
                "subject": t.subject,
                "format": t.format,
                "createdAt": t.created_at,
            }
            for t in data.data
        ]
        return page_of(items, len(items), page, limit, False)

    return execute(request, x_coffeemail_api_key, lambda c: c.templates.list(), present)


class CreateTemplateDTO(BaseModel):
    name: str
    subject: str | None = None
    html: str
    format: str | None = "html"


@app.post("/api/v1/templates")
def create_template(
    request: Request,
    payload: CreateTemplateDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    template_format = payload.format if payload.format in TEMPLATE_FORMATS else None
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.templates.create(
            payload.name,
            payload.html,
            subject=payload.subject,
            format=template_format,  # type: ignore[arg-type]
        ),
        lambda t: {
            "id": t.id,
            "name": t.name,
            "subject": t.subject,
            "format": t.format,
            "createdAt": t.created_at,
        },
    )


@app.post("/api/v1/templates/{template_id}/preview")
def preview_template(
    request: Request,
    template_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.templates.preview_by_id(template_id),
        lambda p: p.model_dump(by_alias=True),
    )


def audience_record(audience: Any) -> dict[str, object]:
    return {
        "id": audience.id,
        "name": audience.name,
        "totalContacts": audience.total_contacts,
        "createdAt": audience.created_at,
    }


@app.get("/api/v1/audiences")
def list_audiences(
    request: Request,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.audiences.list(),
        lambda data: [audience_record(a) for a in data.audiences],
    )


class CreateAudienceDTO(BaseModel):
    name: str
    description: str | None = None


@app.post("/api/v1/audiences")
def create_audience(
    request: Request,
    payload: CreateAudienceDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.audiences.create(payload.name, description=payload.description),
        audience_record,
    )


def contact_record(contact: Any) -> dict[str, object]:
    return {
        "id": contact.id,
        "email": contact.email,
        "firstName": contact.first_name,
        "lastName": contact.last_name,
        "createdAt": contact.created_at,
    }


@app.get("/api/v1/audiences/{audience_id}/contacts")
def list_contacts(
    request: Request,
    audience_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    offset = (page - 1) * limit
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.audiences.contacts.list(audience_id, limit=limit, offset=offset),
        lambda data: page_of(
            [contact_record(ct) for ct in data.contacts],
            data.total,
            page,
            limit,
            offset + len(data.contacts) < data.total,
        ),
    )


class CreateContactDTO(BaseModel):
    email: str
    firstName: str | None = None
    lastName: str | None = None


@app.post("/api/v1/audiences/{audience_id}/contacts")
def create_contact(
    request: Request,
    audience_id: str,
    payload: CreateContactDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.audiences.contacts.create(
            audience_id, payload.email, first_name=payload.firstName, last_name=payload.lastName
        ),
        contact_record,
    )


def suppression_record(suppression: Any) -> dict[str, object]:
    return {
        "id": suppression.id,
        "email": suppression.email,
        "reason": suppression.reason,
        "createdAt": suppression.created_at,
    }


@app.get("/api/v1/suppressions")
def list_suppressions(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.suppressions.list(limit=limit),
        lambda data: page_of(
            [suppression_record(s) for s in data.suppressions],
            len(data.suppressions),
            page,
            limit,
            data.next_cursor is not None,
        ),
    )


class CreateSuppressionDTO(BaseModel):
    email: str
    reason: Literal["manual", "bounce", "complaint"] = "manual"


@app.post("/api/v1/suppressions")
def create_suppression(
    request: Request,
    payload: CreateSuppressionDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.suppressions.create(payload.email, payload.reason),
        suppression_record,
    )


@app.delete("/api/v1/suppressions/{email}")
def delete_suppression(
    request: Request,
    email: str,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.suppressions.delete(email),
        lambda _: True,
    )


def webhook_record(webhook: Any) -> dict[str, object]:
    return {
        "id": webhook.id,
        "url": webhook.url,
        "events": webhook.events,
        "status": "active" if webhook.status == "active" else "inactive",
        "createdAt": webhook.created_at,
    }


@app.get("/api/v1/webhooks")
def list_webhooks(
    request: Request,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.webhooks.list(),
        lambda data: [webhook_record(w) for w in data.webhooks],
    )


class CreateWebhookDTO(BaseModel):
    url: str
    events: list[str]


@app.post("/api/v1/webhooks")
def create_webhook(
    request: Request,
    payload: CreateWebhookDTO,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.webhooks.create(payload.url, payload.events),
        webhook_record,
    )


@app.post("/api/v1/webhooks/{webhook_id}/test")
def test_webhook(
    request: Request,
    webhook_id: str,
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.webhooks.test(webhook_id),
        lambda r: r.model_dump(by_alias=True),
    )


STATS_PERIODS = {"last7d", "last30d", "last90d"}


@app.get("/api/v1/stats")
def get_stats(
    request: Request,
    startDate: str | None = Query(None),
    endDate: str | None = Query(None),
    period: str | None = Query(None),
    x_coffeemail_api_key: str | None = Header(None, alias=API_KEY_HEADER),
) -> dict[str, object]:
    stats_period = period if period in STATS_PERIODS else None
    return execute(
        request,
        x_coffeemail_api_key,
        lambda c: c.stats.get(
            start_date=startDate,
            end_date=endDate,
            period=stats_period,  # type: ignore[arg-type]
        ),
        lambda d: {
            "totalSent": d.total_sent,
            "totalDelivered": d.total_delivered,
            "totalBounced": d.total_bounced,
            "deliveryRate": delivery_rate(d.total_sent, d.total_delivered),
        },
    )
