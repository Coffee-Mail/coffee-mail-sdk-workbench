from collections.abc import Callable, Iterator

import coffeemail
import httpx
import pytest
from coffeemail import CoffeeMail
from fastapi.testclient import TestClient

from server import app, default_client_factory

KEY = "cm_live_0123456789abcdef"
Handler = Callable[[httpx.Request], httpx.Response]


class FakeApi:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []
        self.status = 200
        self.body: object = {}

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return httpx.Response(self.status, json=self.body)

    def respond(self, status: int, body: object) -> None:
        self.status = status
        self.body = body


@pytest.fixture
def api() -> Iterator[FakeApi]:
    fake = FakeApi()

    def factory(api_key: str) -> CoffeeMail:
        transport = httpx.MockTransport(fake.handle)
        return CoffeeMail(api_key, http_client=httpx.Client(transport=transport))

    app.state.client_factory = factory
    yield fake
    app.state.client_factory = default_client_factory


client = TestClient(app)


def post(path: str, body: object | None = None, key: str | None = KEY) -> dict[str, object]:
    headers = {"x-coffeemail-api-key": key} if key else {}
    response = client.post(path, json=body, headers=headers)
    return response.json()  # type: ignore[no-any-return]


def get(path: str, key: str | None = KEY) -> dict[str, object]:
    headers = {"x-coffeemail-api-key": key} if key else {}
    return client.get(path, headers=headers).json()  # type: ignore[no-any-return]


def test_runner_info_reports_the_sdk_version() -> None:
    body = get("/api/v1/runner/info", key=None)
    assert body["success"] is True
    assert body["runner"]["language"] == "python"  # type: ignore[index]
    assert body["runner"]["sdkVersion"] == coffeemail.__version__  # type: ignore[index]


def test_introspect_missing_key() -> None:
    body = post("/api/v1/client/introspect", key=None)
    assert body["data"] == {
        "valid": False,
        "environment": "sandbox",
        "permissions": [],
        "keyPreview": "",
    }


def test_introspect_with_key(api: FakeApi) -> None:
    api.respond(
        200, {"id": "k1", "name": "prod", "organisationId": "o1", "scopes": ["full_access"]}
    )
    body = post("/api/v1/client/introspect")
    assert body["data"] == {
        "valid": True,
        "environment": "live",
        "permissions": ["full_access"],
        "keyPreview": "cm_live_...",
    }


def test_missing_key_is_reported_without_calling_the_api(api: FakeApi) -> None:
    body = get("/api/v1/domains", key=None)
    assert body["success"] is False
    assert body["error"]["code"] == "RUNNER_EXECUTION_ERROR"  # type: ignore[index]
    assert api.requests == []


def test_send_email_sends_all_recipients_and_tags(api: FakeApi) -> None:
    api.respond(202, {"id": "eml_1", "status": "queued", "queuedAt": "2026-10-14T12:00:00Z"})
    body = post(
        "/api/v1/emails/send",
        {
            "from": "a@b.com",
            "to": ["c@d.com", "e@f.com"],
            "subject": "Oi",
            "text": "Oi",
            "tags": [{"name": "plano", "value": "pro"}],
        },
    )
    assert body["data"] == {"id": "eml_1", "status": "queued", "createdAt": "2026-10-14T12:00:00Z"}
    sent = httpx.Response(200, content=api.requests[0].content).json()
    assert sent["to"] == [{"email": "c@d.com"}, {"email": "e@f.com"}]
    assert sent["tags"] == [{"name": "plano", "value": "pro"}]


def test_sdk_errors_keep_the_canonical_code(api: FakeApi) -> None:
    api.respond(404, {"error": {"code": "WEBHOOK_NOT_FOUND", "message": "Webhook não encontrado"}})
    body = post("/api/v1/webhooks/w1/test")
    assert body["success"] is False
    assert body["data"] is None
    error = body["error"]
    assert error["code"] == "NOT_FOUND"  # type: ignore[index]
    assert error["status"] == 404  # type: ignore[index]
    assert error["details"]["apiCode"] == "WEBHOOK_NOT_FOUND"  # type: ignore[index]


def test_create_contact_uses_first_and_last_name(api: FakeApi) -> None:
    api.respond(
        201,
        {
            "id": "c1",
            "email": "ana@gmail.com",
            "firstName": "Ana",
            "lastName": "Lima",
            "createdAt": "2026-10-14",
        },
    )
    body = post(
        "/api/v1/audiences/a1/contacts",
        {"email": "ana@gmail.com", "firstName": "Ana", "lastName": "Lima"},
    )
    sent = httpx.Response(200, content=api.requests[0].content).json()
    assert sent == {"email": "ana@gmail.com", "firstName": "Ana", "lastName": "Lima"}
    assert body["data"]["firstName"] == "Ana"  # type: ignore[index]


def test_list_contacts_paginates_by_offset(api: FakeApi) -> None:
    contact = {"id": "c1", "email": "a@b.com", "createdAt": "2026-10-14"}
    api.respond(200, {"contacts": [contact] * 5, "total": 25})
    body = get("/api/v1/audiences/a1/contacts?page=3&limit=10")
    assert dict(api.requests[0].url.params) == {"limit": "10", "offset": "20"}
    assert body["data"]["hasMore"] is False  # type: ignore[index]


def test_stats_use_start_and_end_date(api: FakeApi) -> None:
    api.respond(200, {"totalSent": 3, "totalDelivered": 2, "totalBounced": 1})
    body = get("/api/v1/stats?startDate=2026-10-01&endDate=2026-10-14&period=last7d")
    assert dict(api.requests[0].url.params) == {
        "startDate": "2026-10-01",
        "endDate": "2026-10-14",
        "period": "last7d",
    }
    assert body["data"]["deliveryRate"] == 66.67  # type: ignore[index]


def test_delete_suppression_uses_the_id(api: FakeApi) -> None:
    api.respond(200, {})
    body = client.delete("/api/v1/suppressions/sup_1", headers={"x-coffeemail-api-key": KEY}).json()
    assert body["data"] is True
    assert api.requests[0].url.path == "/v1/product/suppressions/sup_1"


def test_delete_suppression_with_email_is_rejected_locally(api: FakeApi) -> None:
    body = client.delete(
        "/api/v1/suppressions/x@y.com", headers={"x-coffeemail-api-key": KEY}
    ).json()
    assert body["error"]["code"] == "VALIDATION_ERROR"
    assert api.requests == []


def test_forbidden_keeps_the_canonical_code(api: FakeApi) -> None:
    api.respond(403, {"error": {"code": "FORBIDDEN"}})
    body = get("/api/v1/webhooks")
    assert body["error"]["code"] == "FORBIDDEN"  # type: ignore[index]
