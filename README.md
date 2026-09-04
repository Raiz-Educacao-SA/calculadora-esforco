# Calculadora Inteligente de Esforço e Priorização de Backlog

Ferramenta web para calcular esforço de demandas de desenvolvimento usando IA e parametrização, com priorização automática de backlog baseada na relação ganho/esforço.

## Visão Geral

O sistema permite que times:
1. **Parametrizem** critérios de complexidade por área de atuação
2. **Estimem** esforço automaticamente usando IA que analisa solicitações em linguagem natural
3. **Ajustem** manualmente as sugestões da IA antes de aprovar
4. **Priorizem** o backlog com ranking automático baseado em ganho esperado vs esforço

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Backend | Next.js API Routes |
| Banco de dados | PostgreSQL/Supabase via Prisma ORM |
| Estilização | Tailwind CSS v4 |
| Autenticação | Sessão por cookie, email/senha e Google OAuth |
| IA | Camada desacoplada (Mock / OpenAI / Anthropic) |
| Testes | Jest + ts-jest |
| Validação | Zod |

**Por que esta stack?**
- Next.js unifica frontend e backend em um único projeto
- Prisma centraliza o modelo relacional e migrations para PostgreSQL/Supabase
- Camada de IA desacoplada permite trocar provider sem impacto
- Funções puras para cálculos garantem testabilidade

## Estrutura de Pastas

```
src/
├── app/                          # Pages e API routes (App Router)
│   ├── api/
│   │   ├── areas/                # CRUD áreas
│   │   ├── criterios/            # CRUD critérios
│   │   ├── complexidades/        # CRUD complexidades
│   │   ├── esforcos/             # CRUD esforços
│   │   ├── solicitacoes/         # Solicitações + IA + critérios + aprovação
│   │   │   └── [id]/
│   │   │       ├── analisar/     # POST - análise IA
│   │   │       ├── criterios/    # POST/DELETE - ajuste manual
│   │   │       ├── recalcular/   # POST - recálculo
│   │   │       └── aprovar/      # POST - aprovação
│   │   ├── backlog/              # Backlog priorizado
│   │   ├── alocacoes/            # Calendário de alocação de time
│   │   ├── ferias/               # Gestão de férias
│   │   ├── fornecedores/         # Cadastro de fornecedores
│   │   ├── contratos/            # Contratos e documentos
│   │   ├── pagamentos/           # Pagamentos de fornecedores
│   │   ├── auth/                 # Login, logout, sessão e Google OAuth
│   │   ├── admin/                # Usuários e configuração administrativa
│   │   └── audit-logs/           # Logs de auditoria
│   ├── areas/                    # Página gestão de áreas
│   ├── areas-negocio/            # Página gestão de áreas de negócio
│   ├── componentes/              # Página gestão de componentes
│   ├── criterios/                # Página gestão de critérios
│   ├── complexidades/            # Página gestão de complexidades
│   ├── esforcos/                 # Página gestão de esforços
│   ├── solicitacoes/nova/        # Página calculadora inteligente
│   ├── backlog/                  # Página backlog + detalhe
│   ├── alocacao/                 # Alocação de time e colaboradores
│   ├── ferias/                   # Lista e timeline de férias
│   ├── fornecedores/             # Gestão de fornecedores
│   ├── contratos/                # Gestão de contratos
│   ├── pagamentos/               # Gestão de pagamentos
│   ├── admin/                    # Gestão de usuários
│   ├── auditoria/                # Logs de auditoria
│   ├── login/                    # Autenticação
│   └── page.tsx                  # Dashboard
├── components/
│   ├── Sidebar.tsx               # Navegação lateral
│   └── ui/                       # Componentes reutilizáveis
│       ├── StatusBadge.tsx
│       ├── SourceBadge.tsx       # IA vs Manual
│       ├── ConfidenceBadge.tsx
│       ├── LoadingSpinner.tsx
│       ├── EmptyState.tsx
│       ├── ConfirmDialog.tsx
│       └── PageHeader.tsx
├── lib/
│   ├── ai/                       # Camada de IA
│   │   ├── types.ts              # Interfaces (IAProvider, etc)
│   │   ├── mock-provider.ts      # Provider mock (sem API key)
│   │   ├── openai-provider.ts    # Provider OpenAI
│   │   ├── anthropic-provider.ts # Provider Anthropic
│   │   ├── prompt-builder.ts     # Construção de prompts
│   │   ├── response-validator.ts # Validação de respostas
│   │   └── index.ts              # Factory
│   ├── config/
│   │   ├── gain-weights.ts       # Pesos de normalização
│   │   └── status.ts             # Status das entidades
│   ├── services/
│   │   ├── effort-calculator.ts  # Cálculo de esforço (puro)
│   │   ├── prioritization.ts     # Priorização/ranking (puro)
│   │   └── audit.ts              # Auditoria
│   ├── validators/
│   │   └── schemas.ts            # Schemas Zod
│   └── prisma.ts                 # Singleton Prisma
├── __tests__/
│   ├── effort-calculator.test.ts
│   ├── prioritization.test.ts
│   └── response-validator.test.ts
└── generated/prisma/             # Prisma Client gerado
prisma/
├── schema.prisma                 # Modelo de dados
├── migrations/                   # Migrations
└── seed.ts                       # Dados de exemplo
```

## Modelo de Dados

```
Area 1──N Criterio 1──N Complexidade
                   │
                   └──N Esforco (UNIQUE: criterio+complexidade+componente)

Solicitacao N──M Criterio (via SolicitacaoCriterio)
           │
           └──1 BacklogItem (após aprovação + ganho)

User 1──N Session
User 1──0..1 Funcionario
Funcionario 1──N Alocacao
Funcionario 1──N Ferias
Fornecedor 1──N Contrato
Fornecedor 1──N Pagamento
Contrato 1──N ContratoDocumento

GainWeightConfig  (pesos de normalização por tipo de ganho)
HourlyRateConfig  (valor hora para ganho por redução de horas)
AlocacaoConfig    (percentual e horas padrão de alocação)
AuditLog          (histórico de alterações)
```

**Entidades principais:**
- **Area**: área de atuação (BI, Engenharia de Dados, etc)
- **Criterio**: fator de complexidade vinculado a uma área
- **Complexidade**: nível (Baixa, Média, Alta, Muito Alta) por critério
- **Esforco**: valor parametrizado para cada combinação critério+complexidade
- **Solicitacao**: demanda de desenvolvimento
- **SolicitacaoCriterio**: critérios associados com fonte (IA/Manual)
- **BacklogItem**: demanda aprovada com ganho e score
- **User/Session**: autenticação e autorização por roles
- **Funcionario, Alocacao, Ferias**: capacidade, calendário e indisponibilidades do time
- **Fornecedor, Contrato, ContratoDocumento, Pagamento**: gestão administrativa de fornecedores

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz baseado no `.env.example`:

```env
# Supabase — Transaction pooler (porta 6543)
DATABASE_URL="postgresql://postgres.[ref]:password@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
# Supabase — Direct connection (porta 5432, usado pelo prisma migrate)
DIRECT_URL="postgresql://postgres.[ref]:password@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require"

# Google OAuth (Google Cloud Console)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_ALLOWED_DOMAIN=""  # ex: "suaempresa.com" ou vazio para qualquer conta

# URL pública da aplicação
NEXT_PUBLIC_BASE_URL="https://seu-projeto.vercel.app"

# Provider de IA: "mock" (padrão, sem custo), "openai" ou "anthropic"
AI_PROVIDER="mock"
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
```

## Setup Local

```bash
# 1. Instalar dependências
npm install

# 2. Aplicar migrations no PostgreSQL configurado no .env
npx prisma migrate dev

# 3. Popular com dados de exemplo
npx prisma db seed

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:3000**

## Como Rodar Testes

```bash
npm test
```

Testa: cálculo de esforço, priorização/ranking, normalização de ganho, validação de respostas da IA.

## Fórmulas de Cálculo

### Esforço Total
```
esforco_total = Σ(esforco_por_criterio)
```
Cada esforço vem da parametrização: `Critério + Complexidade → valor_esforco`

### Score de Priorização
```
ganho_normalizado = valor_ganho × peso_tipo_ganho
score = ganho_normalizado / esforco_total
```

### Pesos de Normalização (configuráveis)
| Tipo de Ganho | Peso | Unidade |
|---------------|------|---------|
| Redução de Custo | 1.0 | R$ |
| Aumento de Receita | 1.2 | R$ |
| Redução de Horas | 0.8 | horas/mês |

## Fluxos Funcionais

### Fluxo A: Parametrização
1. Cadastrar **Área** → 2. Cadastrar **Critérios** da área → 3. Cadastrar **Complexidades** por critério → 4. Cadastrar **Esforço** por combinação critério+complexidade

### Fluxo B: Estimativa Automática
1. Criar solicitação (título, descrição, área) → 2. IA analisa e sugere critérios/complexidades → 3. Sistema calcula esforço parcial e total → 4. Exibe memória de cálculo

### Fluxo C: Ajuste Manual
1. Operador adiciona/remove critérios → 2. Altera complexidades → 3. Clica **"Recalcular"** → 4. Aprova esforço final

### Fluxo D: Priorização
1. Após aprovação, informa ganho esperado (tipo + valor) → 2. Sistema normaliza e calcula score → 3. Demanda entra no backlog ranqueado automaticamente

### Fluxo E: Gestão do Backlog
Visualizar ranking → Filtrar por área/status/tipo de ganho → Acompanhar posição e score → Atualizar status

### Fluxo F: Alocação e Férias
Gerenciar colaboradores → Registrar alocações por backlog/tarefa → Registrar férias → Visualizar timeline semanal. Datas de férias são tratadas como datas civis (`YYYY-MM-DD`) para evitar deslocamento de semana por fuso horário.

### Fluxo G: Fornecedores
Cadastrar fornecedor → Registrar contratos e documentos → Controlar pagamentos por vencimento/status.

## API Endpoints

### Parametrização
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/areas` | Listar/criar áreas |
| GET/PUT/DELETE | `/api/areas/[id]` | Área por ID |
| GET/POST | `/api/criterios` | Listar/criar critérios (?areaId) |
| GET/PUT | `/api/criterios/[id]` | Critério por ID |
| GET/POST | `/api/complexidades` | Listar/criar complexidades (?criterioId) |
| GET/PUT | `/api/complexidades/[id]` | Complexidade por ID |
| GET/POST | `/api/esforcos` | Listar/criar esforços (?criterioId) |
| GET/PUT | `/api/esforcos/[id]` | Esforço por ID |

### Solicitações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/solicitacoes` | Listar/criar solicitações |
| GET/PUT | `/api/solicitacoes/[id]` | Solicitação por ID |
| POST | `/api/solicitacoes/[id]/analisar` | Análise IA |
| POST/DELETE | `/api/solicitacoes/[id]/criterios` | Ajuste manual de critérios |
| POST | `/api/solicitacoes/[id]/recalcular` | Recalcular esforço |
| POST | `/api/solicitacoes/[id]/aprovar` | Aprovar esforço |

### Backlog
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/backlog` | Listar ranking / criar item |
| DELETE | `/api/backlog` | Remoção em lote |
| GET/PUT | `/api/backlog/[id]` | Detalhe / atualizar status |
| GET | `/api/audit-logs` | Logs de auditoria |

### Time e Administração
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/funcionarios` | Listar/criar colaboradores |
| GET/PUT/DELETE | `/api/funcionarios/[id]` | Colaborador por ID |
| GET/POST | `/api/alocacoes` | Listar/criar alocações |
| GET/PUT/DELETE | `/api/alocacoes/[id]` | Alocação por ID |
| GET/POST | `/api/ferias` | Listar/criar períodos de férias |
| PUT/DELETE | `/api/ferias/[id]` | Atualizar/remover férias |
| GET/POST | `/api/admin/usuarios` | Listar/criar usuários |
| PUT/DELETE | `/api/admin/usuarios/[id]` | Atualizar/remover usuários |

### Fornecedores
| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/fornecedores` | Listar/criar fornecedores |
| GET/PUT/DELETE | `/api/fornecedores/[id]` | Fornecedor por ID |
| GET/POST | `/api/contratos` | Listar/criar contratos |
| GET/PUT/DELETE | `/api/contratos/[id]` | Contrato por ID |
| GET/POST | `/api/contratos/[id]/documentos` | Listar/criar documentos de contrato |
| DELETE | `/api/contratos/[id]/documentos/[docId]` | Remover documento de contrato |
| GET/POST | `/api/pagamentos` | Listar/criar pagamentos |
| GET/PUT/DELETE | `/api/pagamentos/[id]` | Pagamento por ID |

## Regras de UX

A interface diferencia claramente:
- **Sugestões da IA**: borda azul à esquerda, badge "IA" azul
- **Alterações manuais**: borda verde, badge "Manual" verde
- **Modificações pendentes**: fundo amarelo (até recalcular)
- **Score e ranking**: exibidos de forma proeminente no backlog

## Dados Seed

O seed cria dados realistas para demonstração:
- **5 áreas**: BI, Engenharia de Dados, Dev Backend, Dev Frontend, Analytics
- **25+ critérios** distribuídos por área
- **100+ combinações** complexidade/esforço parametrizadas
- **3 solicitações** já aprovadas e ranqueadas no backlog
- **Pesos de ganho** configurados

## Premissas e Decisões

1. **PostgreSQL/Supabase**: banco relacional principal, com `DATABASE_URL` para aplicação e `DIRECT_URL` para migrations.
2. **Mock provider como padrão**: permite demonstração sem API key de IA.
3. **Recálculo explícito**: operador controla quando recalcular, evitando surpresas.
4. **Pesos globais de ganho**: aplicados a todos os itens igualmente. Extensível para pesos por área.
5. **Autenticação própria**: sessões persistidas no banco e cookie `session_id`; login por senha e Google OAuth.
6. **Roles simples**: `ADMIN`, `OPERATOR` e `VIEWER`, com restrições aplicadas nas rotas sensíveis.
7. **Datas civis em férias**: início/fim de férias são tratados como `YYYY-MM-DD` para evitar deslocamentos por fuso horário na timeline.
8. **Nomenclatura mista**: código em inglês, UI e dados em português.

## Limitações Atuais

- Mock provider usa word matching simples (sem LLM real)
- Sem paginação nas listagens (adequado para volumes moderados)
- Pesos de normalização são globais
- Algumas rotas de leitura dependem do proxy/cookie para proteção geral, enquanto rotas de escrita aplicam role explicitamente

## Próximos Passos Recomendados

1. Integrar provider de IA real (OpenAI/Anthropic)
2. Dashboard com gráficos (Chart.js/Recharts)
3. Exportação de dados (CSV, PDF)
4. Notificações de mudança de status
5. Pesos de normalização configuráveis por área
6. Paginação e busca avançada
7. Revisão de autorização explícita em todas as rotas
8. Docker Compose para ambiente local padronizado
