# CoffeeMail SDK Workbench — Especificação Técnica (SDD)

## 1. Visão Geral e Objetivo

O **CoffeeMail SDK Workbench** é um ambiente monorepo projetado para validar, testar interativamente e auditar todas as funcionalidades dos SDKs do CoffeeMail.

A arquitetura baseia-se em **Spec-Driven Development (SDD)**:
- A camada de interface (**Front-end**) consome um contrato HTTP agnóstico de linguagem (**Runner Specification API**).
- Cada linguagem suportada pelo ecossistema CoffeeMail (Node.js, Python, Go, Java) possui seu próprio **SDK Runner** (mini-backend) que implementa rigorosamente a mesma especificação de contrato.
- A alternância entre linguagens ocorre via seleção do Runner no front-end (ex: apontando para a porta do runner desejado ou via header de roteamento), permitindo testar a paridade exata de recursos e comportamento entre diferentes SDKs.

---

## 2. Princípios Arquiteturais e Metodologia

- **Spec-First (SDD)**: Nenhuma implementação em back-end ou front-end é iniciada sem definição prévia no contrato OpenAPI e nos schemas de dados.
- **SOLID & Clean Architecture**:
  - **Single Responsibility**: Controladores apenas gerenciam transporte HTTP; serviços orquestram regras do runner; adaptadores encapsulam o SDK.
  - **Open/Closed & Liskov**: Criação de novos runners (Python, Go, etc.) estende o ecossistema sem alterar o front-end.
  - **Interface Segregation**: Contratos tipados e específicos por domínio de recurso.
  - **Dependency Inversion**: Serviços dependem de abstrações (`ICoffeeMailSdkAdapter`), não de implementações concretas acopladas.
- **Isolamento de Credenciais**: A chave de API do CoffeeMail (`x-coffeemail-api-key`) e a URL base opcional (`x-coffeemail-base-url`) são transmitidas por requisição, possibilitando testar chaves com diferentes permissões e ambientes sem reiniciar serviços.

---

## 3. Matriz de Cobertura de Features do SDK

| Domínio de Recurso | Operações Cobertas pela Spec | Paridade Node.js | Paridade Futura (Python/Go) |
| :--- | :--- | :--- | :--- |
| **Client / Auth** | Introspecção de chave (`introspect`), invalidação de cache | Sim | Planejada |
| **Emails** | Envio individual, envio em lote (batch), consulta por ID, listagem paginada, tags, eventos | Sim | Planejada |
| **Domains** | Listagem, busca por ID, criação, verificação DNS (SPF/DKIM/DMARC), health check, exclusão | Sim | Planejada |
| **Templates** | Listagem, busca por ID, criação, atualização, exclusão, preview, format, test-render, test-send | Sim | Planejada |
| **Audiences & Contacts** | Gestão de audiências, listagem paginada de contatos, inclusão individual, bulk add, remoção | Sim | Planejada |
| **Broadcasts** | Listagem paginada, criação de campanha, disparo, cancelamento, exclusão | Sim | Planejada |
| **Suppressions** | Listagem paginada, consulta de endereço, criação de supressão, remoção | Sim | Planejada |
| **Webhooks** | Listagem, criação, atualização de eventos, alternância ativo/inativo, rotação de secret, teste, logs de entrega | Sim | Planejada |
| **Stats** | Agregação temporal de métricas com filtros por período | Sim | Planejada |

---

## 4. Estrutura do Monorepo

```text
coffee-mail-sdk-workbench/
├── specs/                          # Contratos e especificações SDD
│   ├── SPEC.md                     # Documentação de arquitetura e requisitos
│   └── openapi.json                # Contrato OpenAPI 3.1 da Runner Specification API
├── packages/
│   └── contracts/                  # Tipos TypeScript compartilhados (DTOs, contratos, schemas)
│       ├── src/
│       │   ├── dtos.ts
│       │   ├── endpoints.ts
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── backends/
│   └── runner-node/                # Mini-backend em Node.js consumindo @coffeemail/node
│       ├── src/
│       │   ├── adapters/           # Implementação concreta do adapter para @coffeemail/node
│       │   ├── controllers/        # Controllers magros
│       │   ├── services/           # Service layer com inversão de dependência
│       │   ├── middlewares/        # Tratamento global de erros e CORS
│       │   ├── routes/             # Definição e registro de rotas
│       │   ├── server.ts           # Inicialização do servidor HTTP
│       │   └── index.ts
│       ├── __tests__/              # Testes unitários com Vitest
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   └── web/                        # Front-end funcional (React + Vite + TypeScript)
│       ├── src/
│       │   ├── constants/          # Constantes e abstrações de strings
│       │   ├── hooks/              # Custom hooks para chamadas de API e estado
│       │   ├── components/         # Componentes funcionais acessíveis (UI funcional)
│       │   ├── modules/            # Módulos por feature do SDK
│       │   ├── types/              # Tipos específicos da interface
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## 5. Especificação do Contrato de Comunicação (Runner API)

### 5.1. Headers Obrigatórios / Opcionais por Requisição
- `x-coffeemail-api-key` (obrigatório para operações autenticadas): Chave do CoffeeMail a ser utilizada pela chamada do SDK.
- `x-coffeemail-base-url` (opcional): Endpoint alternativo da API do CoffeeMail (ex: `http://localhost:3000`).

### 5.2. Formato Padronizado de Resposta
```json
{
  "success": true,
  "runner": {
    "language": "node",
    "runtime": "v22.x",
    "sdkVersion": "0.1.6"
  },
  "executionTimeMs": 42,
  "data": {}
}
```

Em caso de falha:
```json
{
  "success": false,
  "runner": {
    "language": "node",
    "runtime": "v22.x",
    "sdkVersion": "0.1.6"
  },
  "executionTimeMs": 15,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Mensagem padronizada de erro retornada pelo SDK",
    "status": 400,
    "details": null
  }
}
```
