# CoffeeMail SDK Workbench

Monorepo oficial para testes, validação funcional e auditoria multiplataforma dos SDKs da **CoffeeMail**, construído sob a metodologia **Spec-Driven Development (SDD)**.

---

## 🎯 Arquitetura e Filosofia

A bancada foi projetada com base em desacoplamento e paridade de contratos:
- **Spec Unificada**: A especificação OpenAPI e o documento SDD em [`specs/`](file:///Users/joaoneto/Developer/SaaS/coffee-mail-sdk-workbench/specs) definem a **Runner Specification API**.
- **Runners Independentes**: Cada ecossistema de SDK (Node.js, Python, Go, Java) possui seu próprio mini-backend que implementa rigorosamente a mesma especificação HTTP.
- **Front-end Agnóstico**: Uma única interface de usuário em React conecta-se dinamicamente a qualquer runner apenas alternando o endpoint de destino (porta 4001 para Node, 4002 para Python, 4003 para Go, etc.).

---

## 🏗️ Estrutura do Repositório

```text
coffee-mail-sdk-workbench/
├── specs/                          # Contratos e especificação formal SDD
│   ├── SPEC.md                     # Documento de arquitetura e requisitos funcionais
│   └── openapi.json                # Contrato OpenAPI 3.1 da Runner API
├── packages/
│   └── contracts/                  # Pacote TypeScript compartilhado (@coffeemail/workbench-contracts)
├── backends/
│   └── runner-node/                # Mini-backend Node.js consumindo @coffeemail/node
└── apps/
    └── web/                        # Interface funcional React + Vite
```

---

## 🚀 Como Executar

### 1. Instalação de Dependências
Na raiz deste repositório:
```bash
pnpm install
```

### 2. Iniciar o Mini-Backend (Runner Node)
```bash
pnpm run dev:backend
```
*O Runner Node iniciará em `http://localhost:4001`.*

### 3. Iniciar o Front-end
```bash
pnpm run dev:web
```
*O Workbench abrirá em `http://localhost:5173`.*

### 4. Executar Ambos Simultaneamente
```bash
pnpm run dev
```

---

## 🧪 Testes Unitários

Execução dos testes unitários com Vitest:
```bash
pnpm run test
```

---

## 🔌 Adicionando um Novo Runner (ex: Python ou Go)

1. Crie uma pasta sob `backends/runner-<linguagem>` (ex: `backends/runner-python`).
2. Implemente os endpoints descritos em [`specs/openapi.json`](file:///Users/joaoneto/Developer/SaaS/coffee-mail-sdk-workbench/specs/openapi.json).
3. Inicie o runner em uma porta dedicada (ex: `4002`).
4. Selecione o runner no dropdown do front-end ou informe a URL correspondente para testar todas as features do SDK sem alterar uma única linha do front-end.
