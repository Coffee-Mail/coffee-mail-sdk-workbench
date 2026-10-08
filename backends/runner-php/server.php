<?php

declare(strict_types=1);

require_once __DIR__ . '/vendor/autoload.php';

use CoffeeMail\CoffeeMail;
use CoffeeMail\Exceptions\CoffeeMailException;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, x-coffeemail-api-key, x-coffeemail-base-url');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$startTime = microtime(true);

/**
 * @return array{language: string, runtime: string, sdkVersion: string, status: string}
 */
function getRunnerInfo(): array
{
    return [
        'language' => 'php',
        'runtime' => 'PHP ' . PHP_VERSION,
        'sdkVersion' => '0.1.0',
        'status' => 'online',
    ];
}

/**
 * @param mixed $data
 * @param CoffeeMailException|null $error
 */
function respond(mixed $data, ?CoffeeMailException $error, float $startTime, int $httpStatus = 200): void
{
    http_response_code($httpStatus);
    $elapsedMs = (int) round((microtime(true) - $startTime) * 1000);

    $errorPayload = null;
    if ($error !== null) {
        $errorPayload = [
            'code' => $error->errorCode,
            'message' => $error->getMessage(),
            'status' => $error->status,
            'details' => $error->details,
        ];
    }

    echo json_encode([
        'success' => $error === null,
        'runner' => getRunnerInfo(),
        'executionTimeMs' => $elapsedMs,
        'data' => $data,
        'error' => $errorPayload,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function getApiKey(): ?string
{
    $headerKey = $_SERVER['HTTP_X_COFFEEMAIL_API_KEY'] ?? null;
    if (is_string($headerKey) && trim($headerKey) !== '') {
        return trim($headerKey);
    }

    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
    if (is_string($auth) && str_starts_with($auth, 'Bearer ')) {
        return trim(substr($auth, 7));
    }

    return null;
}

function getClient(float $startTime): CoffeeMail
{
    $apiKey = getApiKey();
    if ($apiKey === null) {
        respond(
            data: null,
            error: new \CoffeeMail\Exceptions\AuthenticationError('Chave de API não informada. Defina a API Key no cabeçalho x-coffeemail-api-key.'),
            startTime: $startTime,
            httpStatus: 400,
        );
    }

    return new CoffeeMail($apiKey);
}

/**
 * @return array<string, mixed>
 */
function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    /** @var mixed $parsed */
    $parsed = json_decode($raw, true);
    return is_array($parsed) ? $parsed : [];
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

try {
    // 1. Info do Runner
    if ($method === 'GET' && $uri === '/api/v1/runner/info') {
        respond(data: getRunnerInfo(), error: null, startTime: $startTime);
    }

    // 2. Introspect
    if ($method === 'POST' && $uri === '/api/v1/client/introspect') {
        $client = getClient($startTime);
        [$data, $error] = $client->introspect();
        respond($data, $error, $startTime);
    }

    // 3. Emails Send
    if ($method === 'POST' && $uri === '/api/v1/emails/send') {
        $client = getClient($startTime);
        $body = getJsonBody();
        [$data, $error] = $client->emails->send($body);
        respond($data, $error, $startTime);
    }

    // 4. Emails List
    if ($method === 'GET' && $uri === '/api/v1/emails') {
        $client = getClient($startTime);
        [$data, $error] = $client->emails->list($_GET);
        respond($data, $error, $startTime);
    }

    // 5. Domains List / Create
    if ($uri === '/api/v1/domains') {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->domains->list($_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->domains->create(getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 6. Domains Verify
    if ($method === 'POST' && preg_match('#^/api/v1/domains/([^/]+)/verify$#', $uri, $matches)) {
        $client = getClient($startTime);
        [$data, $error] = $client->domains->verify($matches[1]);
        respond($data, $error, $startTime);
    }

    // 7. Domains Health
    if ($method === 'GET' && preg_match('#^/api/v1/domains/([^/]+)/health$#', $uri, $matches)) {
        $client = getClient($startTime);
        [$data, $error] = $client->domains->get($matches[1]);
        respond($data, $error, $startTime);
    }

    // 8. Templates List / Create
    if ($uri === '/api/v1/templates') {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->templates->list($_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->templates->create(getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 9. Templates Preview
    if ($method === 'POST' && preg_match('#^/api/v1/templates/([^/]+)/preview$#', $uri, $matches)) {
        $client = getClient($startTime);
        $body = getJsonBody();
        $vars = isset($body['variables']) && is_array($body['variables']) ? $body['variables'] : [];
        [$data, $error] = $client->templates->preview($matches[1], $vars);
        respond($data, $error, $startTime);
    }

    // 10. Audiences List / Create
    if ($uri === '/api/v1/audiences') {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->audiences->list($_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->audiences->create(getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 11. Audience Contacts List / Add
    if (preg_match('#^/api/v1/audiences/([^/]+)/contacts$#', $uri, $matches)) {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->audiences->listContacts($matches[1], $_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->audiences->addContact($matches[1], getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 12. Suppressions List / Create
    if ($uri === '/api/v1/suppressions') {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->suppressions->list($_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->suppressions->create(getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 13. Suppressions Delete
    if ($method === 'DELETE' && preg_match('#^/api/v1/suppressions/([^/]+)$#', $uri, $matches)) {
        $client = getClient($startTime);
        [$data, $error] = $client->suppressions->delete(urldecode($matches[1]));
        respond($data, $error, $startTime);
    }

    // 14. Webhooks List / Create
    if ($uri === '/api/v1/webhooks') {
        $client = getClient($startTime);
        if ($method === 'GET') {
            [$data, $error] = $client->webhooks->list($_GET);
            respond($data, $error, $startTime);
        }
        if ($method === 'POST') {
            [$data, $error] = $client->webhooks->create(getJsonBody());
            respond($data, $error, $startTime);
        }
    }

    // 15. Webhooks Test
    if ($method === 'POST' && preg_match('#^/api/v1/webhooks/([^/]+)/test$#', $uri, $matches)) {
        $client = getClient($startTime);
        [$data, $error] = $client->webhooks->test($matches[1]);
        respond($data, $error, $startTime);
    }

    // 16. Stats
    if ($method === 'GET' && $uri === '/api/v1/stats') {
        $client = getClient($startTime);
        [$data, $error] = $client->stats->get($_GET);
        respond($data, $error, $startTime);
    }

    // Rota não encontrada
    respond(
        data: null,
        error: new \CoffeeMail\Exceptions\NotFoundError("Rota não mapeada no runner PHP: {$method} {$uri}"),
        startTime: $startTime,
        httpStatus: 404,
    );
} catch (\Throwable $e) {
    respond(
        data: null,
        error: new \CoffeeMail\Exceptions\InternalServerError($e->getMessage()),
        startTime: $startTime,
        httpStatus: 500,
    );
}
