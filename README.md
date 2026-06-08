# MikroKrédito MZ

> Plataforma multi-tenant de microcrédito para Moçambique  
> **Stack:** Vue 3 · Node.js/Express · PostgreSQL · Redis · Bull  
> **Tema:** Azul `#185FA5` + Vermelho `#A32D2D`

---

## Pré-requisitos

| Ferramenta   | Versão mínima | Verificar                  |
|--------------|---------------|----------------------------|
| Node.js      | **20 LTS**    | `node -v`                  |
| npm          | 10+           | `npm -v`                   |
| PostgreSQL   | 15+           | `psql --version`           |
| Redis        | 7+            | `redis-server --version`   |
| Git          | qualquer      | `git --version`            |

---

## Instalação rápida (Docker — recomendado)

```bash
git clone https://github.com/org/mikrokredito-mz.git
cd mikrokredito-mz
copy backend\.env.example backend\.env    # Windows
# ou: cp backend/.env.example backend/.env  # Linux/Mac
docker compose up -d
```

Aguarde ~40 segundos. Aceda a:
- **Frontend**: http://localhost:5173
- **API**:      http://localhost:3000/api/v1
- **Health**:   http://localhost:3000/health

---

## Instalação manual — Windows (PowerShell)

### 1. Instale Node.js 20 LTS

Descarregue em https://nodejs.org e instale.  
Ou via winget:

```powershell
winget install OpenJS.NodeJS.LTS
```

### 2. Instale PostgreSQL 15

```powershell
winget install PostgreSQL.PostgreSQL
```

Durante a instalação, defina a palavra-passe do utilizador `postgres`.

### 3. Instale Redis

```powershell
winget install Redis.Redis
```

Se Redis não estiver disponível no winget, use a versão Windows:  
https://github.com/tporadowski/redis/releases (descarregue `Redis-x64-*.msi`)

### 4. Clone o repositório

```powershell
git clone https://github.com/org/mikrokredito-mz.git
cd mikrokredito-mz
```

### 5. Configure o backend

```powershell
cd backend
Copy-Item .env.example .env
```

Abra o ficheiro `.env` e edite pelo menos estas linhas:

```env
DB_HOST=localhost
DB_NAME=mikrokredito
DB_USER=postgres
DB_PASS=SUA_PALAVRA_PASSE_POSTGRES
JWT_SECRET=mude-para-valor-seguro-em-producao
REDIS_HOST=localhost
```

### 6. Crie a base de dados

```powershell
psql -U postgres -c "CREATE DATABASE mikrokredito;"
```

### 7. Instale dependências e execute o seed

```powershell
npm install
npm run seed
```

### 8. Inicie o backend

```powershell
npm run dev
```

Deve ver: `MikroKrédito API running on port 3000 [development]`

### 9. Configure e inicie o frontend (novo terminal)

```powershell
cd ..\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Aceda a http://localhost:5173

---

## Instalação manual — Linux / Ubuntu

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15
sudo apt install -y postgresql-15
sudo systemctl start postgresql

# Redis 7
sudo apt install -y redis-server
sudo systemctl enable --now redis-server

# Projecto
git clone https://github.com/org/mikrokredito-mz.git
cd mikrokredito-mz

# Backend
cd backend
cp .env.example .env
# Edite .env
npm install
npm run seed
npm run dev &

# Frontend (novo terminal)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

---

## Instalação manual — macOS

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Dependências
brew install node@20 postgresql@15 redis
brew services start postgresql@15
brew services start redis

# Projecto
git clone https://github.com/org/mikrokredito-mz.git
cd mikrokredito-mz/backend
cp .env.example .env
npm install && npm run seed && npm run dev

# Novo terminal
cd ../frontend
cp .env.example .env && npm install && npm run dev
```

---

## Contas de demonstração

| Papel              | Email                              | Palavra-passe |
|--------------------|------------------------------------|---------------|
| **Super Admin**    | superadmin@mikrokredito.co.mz      | demo1234      |
| **Admin BO**       | admin@bancooportunidade.co.mz      | demo1234      |
| **Cliente**        | maria@cliente.mz                   | demo1234      |

---

## Variáveis de ambiente — Backend

```env
# ── Servidor ──────────────────────────────
NODE_ENV=development
PORT=3000

# ── PostgreSQL ────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mikrokredito
DB_USER=postgres
DB_PASS=SUA_PALAVRA_PASSE

# ── Redis (fila de notificações) ──────────
REDIS_HOST=localhost
REDIS_PORT=6379

# ── JWT ───────────────────────────────────
JWT_SECRET=mude-em-producao-min-32-chars
JWT_EXPIRES_IN=7d

# ── Email (SMTP) ──────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@mikrokredito.co.mz
SMTP_PASS=app_password_gmail

# ── SMS (Moçambique) ──────────────────────
MZ_SMS_GATEWAY_URL=https://api.sms.co.mz/v1/send
MZ_SMS_API_KEY=sua_chave_api

# ── M-Pesa (Vodacom MZ) ───────────────────
MPESA_API_KEY=sua_chave
MPESA_PUBLIC_KEY=sua_chave_publica
MPESA_SERVICE_PROVIDER_CODE=171717
MPESA_CALLBACK_URL=https://api.mikrokredito.co.mz/api/v1/payments/callback/mpesa

# ── e-Mola (Movitel) ──────────────────────
EMOLA_API_KEY=sua_chave
EMOLA_MERCHANT_ID=seu_merchant_id
EMOLA_CALLBACK_URL=https://api.mikrokredito.co.mz/api/v1/payments/callback/emola

# ── Frontend ──────────────────────────────
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173
```

---

## Variáveis de ambiente — Frontend

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

---

## Scripts disponíveis

### Backend

| Comando           | Descrição                                   |
|-------------------|---------------------------------------------|
| `npm run dev`     | Servidor com hot-reload (nodemon)           |
| `npm start`       | Servidor de produção                        |
| `npm run seed`    | Popula a BD com dados de demonstração       |
| `npm run worker`  | Inicia o worker de notificações (separado)  |

### Frontend

| Comando           | Descrição                          |
|-------------------|------------------------------------|
| `npm run dev`     | Servidor de desenvolvimento Vite   |
| `npm run build`   | Build de produção                  |
| `npm run preview` | Pré-visualiza o build              |

---

## Estrutura do projecto

```
mikrokredito-mz/
├── backend/
│   ├── src/
│   │   ├── app.js                    Express app (CORS, helmet, rotas)
│   │   ├── server.js                 Entry point (BD + queues + servidor)
│   │   ├── config/database.js        Sequelize / PostgreSQL
│   │   ├── middleware/
│   │   │   ├── auth.js               JWT authenticate + authorize(roles)
│   │   │   └── audit.js              Registo automático de auditoria
│   │   ├── models/
│   │   │   ├── index.js              11 modelos Sequelize + associações
│   │   │   └── seed.js               Dados demo (4 inst. + 3 users + templates)
│   │   ├── routes/
│   │   │   ├── auth.js               Login · Registo · JWT
│   │   │   ├── institutions.js       CRUD tenants (multi-tenant)
│   │   │   ├── products.js           Produtos de crédito
│   │   │   ├── clients.js            Clientes + KYC
│   │   │   ├── loans.js              Pedidos · Simulador · Regra 1/3
│   │   │   ├── payments.js           M-Pesa · e-Mola · callbacks
│   │   │   ├── documents.js          Upload multer
│   │   │   ├── notifications.js      Templates · Regras · Logs · Retry
│   │   │   ├── audit.js              Logs de auditoria
│   │   │   └── reports.js            Carteira · NPL · Pagamentos
│   │   ├── services/
│   │   │   ├── loanService.js        PMT · regra 1/3 · routing garantias
│   │   │   └── notification/
│   │   │       ├── notificationService.js  Motor (trigger · render · queue)
│   │   │       └── providers/
│   │   │           ├── emailProvider.js    Nodemailer/SMTP
│   │   │           ├── smsProvider.js      MZ gateway + Twilio fallback
│   │   │           └── whatsappProvider.js Twilio / Meta Cloud API
│   │   ├── queues/
│   │   │   ├── index.js              Bull queue (Redis)
│   │   │   └── worker.js             Worker standalone
│   │   └── utils/logger.js           Winston + rotate diário
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── favicon.svg               Ícone azul+vermelho
│   ├── src/
│   │   ├── main.js                   Vue 3 entry (Pinia + Router + Toast)
│   │   ├── App.vue
│   │   ├── router/index.js           Guards por role (3 níveis)
│   │   ├── stores/
│   │   │   ├── auth.js               Login · logout · init
│   │   │   ├── loans.js              Pedidos + simulador local (PMT)
│   │   │   ├── notifications.js      Templates · Regras · Logs · Retry
│   │   │   ├── products.js           Produtos de crédito
│   │   │   ├── payments.js           Transacções + reconciliação
│   │   │   └── documents.js          Upload de documentos
│   │   ├── services/api.js           Axios + interceptors (401/403/500)
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppTopbar.vue     Topbar azul com sino vermelho
│   │   │   │   ├── AppSidebar.vue    Sidebar com destaque azul
│   │   │   │   ├── SuperAdminLayout.vue
│   │   │   │   ├── InstitutionLayout.vue
│   │   │   │   └── ClientLayout.vue
│   │   │   └── common/
│   │   │       ├── StatusBadge.vue   Badges coloridos por estado
│   │   │       ├── LoanSimulator.vue Simulador + elegibilidade 1/3
│   │   │       ├── ConfirmModal.vue  Modal de confirmação
│   │   │       └── LoadingSpinner.vue
│   │   ├── views/
│   │   │   ├── auth/                 Login · Registo · VerifyEmail
│   │   │   ├── super/                8 vistas Super Admin
│   │   │   ├── institution/          11 vistas Admin Instituição
│   │   │   └── client/               7 vistas Cliente
│   │   └── assets/styles/
│   │       ├── main.css              Entry point (imports)
│   │       ├── tokens.css            Variáveis CSS (azul+vermelho)
│   │       ├── base.css              Reset + tipografia Inter
│   │       ├── layout.css            Topbar · Sidebar · Shell
│   │       ├── components.css        Cards · Badges · Tabelas · etc.
│   │       ├── forms.css             Inputs · Selects · Range
│   │       ├── buttons.css           Todas as variantes
│   │       └── modals.css            Modais · Drawers · Tabs
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## API — Rotas principais

```
AUTH
  POST   /api/v1/auth/register
  POST   /api/v1/auth/login
  GET    /api/v1/auth/me
  POST   /api/v1/auth/change-password

INSTITUIÇÕES (multi-tenant)
  GET    /api/v1/institutions
  POST   /api/v1/institutions          [super_admin]
  PATCH  /api/v1/institutions/:id
  GET    /api/v1/institutions/:id/stats

PRODUTOS DE CRÉDITO
  GET    /api/v1/products              [público]
  POST   /api/v1/products              [inst_admin]
  PATCH  /api/v1/products/:id
  DELETE /api/v1/products/:id

CLIENTES + KYC
  GET    /api/v1/clients
  GET    /api/v1/clients/:id
  PATCH  /api/v1/clients/:id
  POST   /api/v1/clients/:id/approve-kyc

EMPRÉSTIMOS
  POST   /api/v1/loans/simulate        [público]
  GET    /api/v1/loans
  POST   /api/v1/loans
  PATCH  /api/v1/loans/:id
  POST   /api/v1/loans/:id/disburse    [inst_admin]
  GET    /api/v1/loans/:id/schedule

PAGAMENTOS
  POST   /api/v1/payments/initiate
  POST   /api/v1/payments/callback/mpesa
  POST   /api/v1/payments/callback/emola
  GET    /api/v1/payments
  POST   /api/v1/payments/reconcile

DOCUMENTOS
  POST   /api/v1/documents/upload
  GET    /api/v1/documents
  PATCH  /api/v1/documents/:id/review
  DELETE /api/v1/documents/:id

NOTIFICAÇÕES
  GET    /api/v1/notifications/templates
  POST   /api/v1/notifications/templates
  PUT    /api/v1/notifications/templates/:id
  DELETE /api/v1/notifications/templates/:id
  GET    /api/v1/notifications/rules
  POST   /api/v1/notifications/rules
  PUT    /api/v1/notifications/rules/:id
  GET    /api/v1/notifications/logs
  POST   /api/v1/notifications/retry
  POST   /api/v1/notifications/retry/:id
  GET    /api/v1/notifications/stats
  POST   /api/v1/notifications/test

RELATÓRIOS
  GET    /api/v1/reports/portfolio
  GET    /api/v1/reports/payments-summary
  GET    /api/v1/reports/npl

AUDITORIA
  GET    /api/v1/audit
```

---

## Lógica da regra do 1/3

```
prestação ≤ ⌊salário_líquido / 3⌋ − outros_encargos
```

| Situação | Resultado |
|---|---|
| Prestação ≤ limite | Aprovação automática elegível |
| Prestação > limite (desconto salarial) | Redireccionado → análise por bens/garantias |
| Sem garantia indicada | Análise manual obrigatória |

Em todos os casos de reencaminhamento são enviadas notificações via **Email + SMS + WhatsApp** ao cliente, agente e administrador.

> **Aviso legal:** A regra do 1/3 é boa prática de prudência financeira. A sua aplicação formal a crédito privado em Moçambique deve ser validada juridicamente. Esta implementação não constitui parecer legal.

---

## Arquitectura de notificações

```
Evento (ex: loan_approved)
    ↓
notificationService.triggerEvent()
    ↓
Lookup NotificationRule activa → filtra canais por preferências inst.
    ↓
Lookup NotificationTemplate (inst. específico > global)
    ↓
Handlebars.compile(template, dados_contexto)
    ↓
NotificationLog criado (status: queued)
    ↓
Bull Queue (Redis) — delay configurável por regra
    ↓
Worker → Provider (emailProvider / smsProvider / whatsappProvider)
    ↓
NotificationLog.status = sent | failed
    ↓
Retry automático até 3 tentativas (backoff exponencial: 30s → 60s → 120s)
```

---

## Resolução de problemas frequentes

### `ECONNREFUSED` ao fazer registo
O backend não está a correr. Execute `npm run dev` na pasta `backend/`.

### `Cannot find path '.env.example'` no Windows
Use `Copy-Item` em vez de `cp`:
```powershell
Copy-Item .env.example .env
```

### Erro de ligação à BD
Verifique se o PostgreSQL está activo:
```powershell
Get-Service postgresql*   # Windows
sudo systemctl status postgresql   # Linux
```

### Redis não arranca
```powershell
Start-Service Redis   # Windows
sudo systemctl start redis-server   # Linux
```

### Vite CJS deprecation warning
Está resolvido no `vite.config.js` com `import.meta.url`. Pode ignorar se aparecer noutras dependências.

### `&&` não funciona no PowerShell
PowerShell usa `;` como separador:
```powershell
cd backend; npm install
```
