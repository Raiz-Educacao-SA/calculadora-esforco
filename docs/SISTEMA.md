# Documentação Técnica — Calculadora de Esforço / Transformação Backlog

**Data**: 2026-09-16

**URL de Produção**: https://transformacao-raiz-backlog.vercel.app  
**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS v4, Prisma ORM (PostgreSQL/Supabase)  
**Autenticação**: Google OAuth + Email/Senha  
**Roles**: ADMIN, OPERATOR, VIEWER

---

## Visão Geral

Sistema de gestão de backlog e cálculo inteligente de esforço para a Raiz Educação. Permite priorizar solicitações de desenvolvimento através de uma matriz de ganho vs. esforço, com suporte a IA para estimativa automática de complexidade.

O planejamento considera a jornada do responsável (6h para estagiários), o percentual
de capacidade para projetos, as atividades paralelas e as férias. A previsão é
calculada automaticamente ao salvar uma atividade em andamento. A conclusão registra
a data da transição para Concluído. Consulte as [regras, arquivos e validações desta
atualização](ALTERACOES-2026-09-15.md) e o [registro de publicação](RETOMADA.md).

O [Manual do Usuário](https://transformacao-raiz-backlog.vercel.app/manual) inclui
os passos de operação atualizados. Em 16/09/2026 foram revisados os cadastros de
estagiários e recalculadas as atividades existentes em andamento; consulte o
[resultado e o comando de manutenção](ALTERACOES-2026-09-16.md).

As ações individuais das listas utilizam `ListActionButton`/`ListActionLink`,
com ícones, dicas por mouse/teclado e nomes acessíveis. O [registro da atualização
visual](ALTERACOES-2026-09-16-ACOES.md) relaciona as telas, o componente e a validação.

---

## Módulos e Páginas

| Rota | Arquivo | Acesso | Descrição |
|------|---------|--------|-----------|
| `/` | `src/app/page.tsx` | Todos | Dashboard com KPIs totais e Top 5 prioridades (exclui itens CONCLUÍDO/CANCELADO) |
| `/backlog` | `src/app/backlog/page.tsx` | Todos | Listagem do backlog: ativos no topo, concluídos/cancelados ao final com separador visual |
| `/backlog/[id]` | `src/app/backlog/[id]/page.tsx` | Todos | Página de detalhe de um item do backlog |
| `/solicitacoes/nova` | `src/app/solicitacoes/nova/page.tsx` | Admin+Operator | Calculadora inteligente: formulário → IA → ajuste manual → aprovação |
| `/parametrizacao` | `src/app/parametrizacao/page.tsx` | Admin+Operator | Tabela unificada: critério × complexidade × esforço por área/componente |
| `/areas` | `src/app/areas/page.tsx` | Admin+Operator | CRUD de áreas técnicas (BI, Backend, Frontend, etc.) |
| `/areas-negocio` | `src/app/areas-negocio/page.tsx` | Admin+Operator | CRUD de áreas de negócio (solicitantes) |
| `/componentes` | `src/app/componentes/page.tsx` | Admin+Operator | CRUD de componentes técnicos agrupados por área |
| `/alocacao` | `src/app/alocacao/page.tsx` | Admin+Operator | Calendário de alocação de colaboradores |
| `/alocacao/funcionarios` | `src/app/alocacao/funcionarios/page.tsx` | Admin | CRUD de colaboradores e seus dados |
| `/ferias` | `src/app/ferias/page.tsx` | Admin+Operator | Gestão de períodos de férias, com lista e timeline semanal |
| `/fornecedores` | `src/app/fornecedores/page.tsx` | Admin+Operator | Cadastro e manutenção de fornecedores |
| `/contratos` | `src/app/contratos/page.tsx` | Admin+Operator | Gestão de contratos de fornecedores |
| `/contratos/[id]` | `src/app/contratos/[id]/page.tsx` | Admin+Operator | Detalhe do contrato e documentos vinculados |
| `/pagamentos` | `src/app/pagamentos/page.tsx` | Admin+Operator | Controle de pagamentos por fornecedor/contrato |
| `/admin/usuarios` | `src/app/admin/usuarios/page.tsx` | Admin | Gestão de usuários e atribuição de roles |
| `/auditoria` | `src/app/auditoria/page.tsx` | Admin | Logs de auditoria (entidade, ação, usuário, timestamp) |
| `/login` | `src/app/login/page.tsx` | Público | Autenticação por email/senha ou Google OAuth |

---

## Modelo de Dados (Prisma)

### Area
```
id              String   @id @default(cuid())
nome            String   @unique
descricao       String?
ativo           Boolean  @default(true)
```
Representa uma área técnica (ex: BI, Backend, Frontend).

### AreaNegocio
```
id              String   @id @default(cuid())
nome            String   @unique
cor             String   @default("#6366f1")
```
Representa áreas de negócio (solicitantes/stakeholders).

### Componente
```
id              String   @id @default(cuid())
nome            String
areaId          String
ativo           Boolean  @default(true)
```
Subcomponente dentro de uma área técnica. Ex: "API REST" dentro de "Backend".

### Criterio
```
id              String   @id @default(cuid())
areaId          String
nome            String
descricao       String?
ativo           Boolean  @default(true)
```
Fator de complexidade específico de uma área. Ex: "Integração Externa" em Backend.

### Complexidade
```
id              String   @id @default(cuid())
criterioId      String
nome            String   (Baixa, Média, Alta, Muito Alta)
ordem           Int
ativo           Boolean  @default(true)
```
Nível de complexidade dentro de um critério.

### Esforco
```
id              String   @id @default(cuid())
criterioId      String
complexidadeId  String
componenteId    String?
valorEsforco    Decimal  (em horas)
unidadeEsforco  String   @default("horas")
```
Valor paramétrico: quantas horas uma combinação critério+complexidade+componente demanda.

### Solicitacao
```
id              String   @id @default(cuid())
titulo          String
descricao       String
areaId          String
contexto        String?
urgencia        String   (BAIXA, MÉDIA, ALTA)
status          String   (RASCUNHO, SUBMETIDA, APROVADA, REJEITADA)
esforcoTotal    Decimal
esforcoAprovado Decimal?
solicitante     String
areaSolicitante String?
zeevNumber      String?
createdAt       DateTime
updatedAt       DateTime
```
Registro de uma solicitação de desenvolvimento enviada.

### SolicitacaoCriterio
```
id              String   @id @default(cuid())
solicitacaoId   String
criterioId      String
complexidadeId  String
componenteId    String?
valorEsforco    Decimal
fonte           String   (IA, Manual)
justificativa   String?
confianca       Decimal? (0-1, da IA)
```
Mapeamento de critério+complexidade selecionado para uma solicitação (pode vir da IA ou ser manual).

### BacklogItem
```
id              String   @id @default(cuid())
solicitacaoId   String   @unique
tipoGanho       String   (AUMENTO_RECEITA, REDUCAO_CUSTO, REDUCAO_HORAS)
valorGanho      Decimal
ganhoNormalizado Decimal
scorePriorizacao Decimal
status          String   (NAO_INICIADO, PRIORIZADO, EM_ANDAMENTO, CONCLUIDO, CANCELADO)
dataInicio      DateTime?
previsaoConclusao DateTime?
dataConclusao   DateTime?
responsavelId   String?  (FK Funcionario, onDelete: SetNull)
createdAt       DateTime
updatedAt       DateTime
```
Aprovação da solicitação gera um BacklogItem. O status governa a ordem de exibição (ativos antes, concluídos/cancelados ao final).

O responsável pode ser salvo antes do início. Para Em Andamento, são obrigatórios
início válido, responsável ativo e esforço positivo. O servidor calcula a previsão.
A conclusão usa a data civil de São Paulo, preserva salvamentos posteriores e é
limpa quando a atividade é reaberta.

### Funcionario
```
id              String   @id @default(cuid())
nome            String
cargo           String
estagiario      Boolean  @default(false)
ativo           Boolean  @default(true)
areaId          String?
userId          String?
createdAt       DateTime
```
Colaborador do time com vinculação opcional a uma área técnica.

`estagiario = true` aplica jornada de 6h/dia; os demais usam a jornada global
parametrizada. O percentual de projetos incide sobre a jornada de cada colaborador.

### Alocacao
```
id              String   @id @default(cuid())
funcionarioId   String
backlogItemId   String?
titulo          String
dataInicio      DateTime
dataFim         DateTime
areaSolicitante String?
cor             String   @default("#3b82f6")
horasDiarias    Float?
```
Período de alocação de um funcionário em um backlog item ou tarefa.

Nas reservas fixas, horas vazias reservam toda a capacidade para projetos. Nas
atividades em andamento, o valor informado limita as horas da atividade; sem valor,
ela participa da divisão da capacidade disponível. A previsão e o período da
alocação vinculada são sincronizados pelo servidor.

### Ferias
```
id              String   @id @default(cuid())
funcionarioId   String
dataInicio      DateTime
dataFim         DateTime
observacao      String?
createdAt       DateTime
```
Período de férias de um funcionário. Na interface e nas APIs, `dataInicio` e `dataFim` são tratados como datas civis (`YYYY-MM-DD`), não como instantes de horário. A timeline semanal compara intervalos por número de dia e usa semanas de segunda a domingo, evitando que uma férias iniciada em uma segunda-feira apareça na semana anterior por conversão de fuso horário.

### Fornecedor
```
id         String   @id @default(cuid())
nome       String
cnpj       String?  @unique
email      String?
telefone   String?
site       String?
categoria  String?
contato    String?
observacao String?
ativo      Boolean  @default(true)
createdAt  DateTime
updatedAt  DateTime
```
Fornecedor de software, serviço, consultoria, hardware ou outra categoria.

### Contrato
```
id            String   @id @default(cuid())
fornecedorId  String
numero        String?
titulo        String
descricao     String?
valorTotal    Float?
periodicidade String?
dataInicio    DateTime?
dataFim       DateTime?
status        String   @default("ATIVO")
observacao    String?
createdAt     DateTime
updatedAt     DateTime
```
Contrato vinculado a um fornecedor. Pode ter documentos e pagamentos associados.

### ContratoDocumento
```
id         String   @id @default(cuid())
contratoId String
nome       String
tipo       String?
url        String?
observacao String?
createdAt  DateTime
```
Documento de apoio do contrato, como nota fiscal, aditivo, certidão ou contrato original.

### Pagamento
```
id             String   @id @default(cuid())
fornecedorId   String
contratoId     String?
descricao      String
valor          Float
dataVencimento DateTime
dataPagamento  DateTime?
status         String   @default("PENDENTE")
observacao     String?
createdAt      DateTime
updatedAt      DateTime
```
Pagamento vinculado a um fornecedor e, opcionalmente, a um contrato.

### User
```
id              String   @id @default(cuid())
email           String   @unique
nome            String
senha           String?  (hash)
googleId        String?
role            String   (ADMIN, OPERATOR, VIEWER)
ativo           Boolean  @default(true)
createdAt       DateTime
```
Usuário do sistema com autenticação por email/senha ou Google OAuth.

### GainWeightConfig
```
tipoGanho       String   @id
peso            Decimal
```
Pesos para normalização de ganho. Valores padrão:
- AUMENTO_RECEITA: 1.2
- REDUCAO_CUSTO: 1.0
- REDUCAO_HORAS: 0.8

### HourlyRateConfig
```
id              String   @id @default(cuid())
valorHora       Decimal  @default(150.00) (R$/h)
```
Taxa horária padrão para cálculos de ganho (tipo REDUCAO_HORAS).

### AlocacaoConfig
```
id              String   @id @default(cuid())
percentualAlocacao Float @default(80) (%)
horasDiarias    Float   @default(8)
```
Configurações padrão de alocação de colaboradores.

O percentual deve ser maior que zero e até 100; a jornada padrão, maior que zero e
até 24 horas. A jornada de estagiários permanece em 6 horas. Alterar a configuração
recalcula as previsões das atividades em andamento.

### AuditLog
```
id              String   @id @default(cuid())
entidade        String
entidadeId      String
acao            String
dadosAnteriores Json?
dadosNovos      Json?
usuario         String
timestamp       DateTime @default(now())
```
Log completo de todas as alterações no sistema para auditoria.

---

## Fórmulas de Cálculo

### Esforço Total
```
esforco_total = Σ(valorEsforco por critério selecionado)
```
Soma dos valores de esforço (em horas) para todos os critérios/complexidades selecionados na solicitação.

### Ganho Normalizado
```
ganho_normalizado = valorGanho × peso_tipo_ganho
                  × (valorHora se tipo = REDUCAO_HORAS, caso contrário 1)
```

Exemplos:
- **AUMENTO_RECEITA**: R$ 50.000 × 1.2 = R$ 60.000
- **REDUCAO_CUSTO**: R$ 30.000 × 1.0 = R$ 30.000
- **REDUCAO_HORAS**: 100 h × 0.8 × R$ 150/h = R$ 12.000

### Score de Priorização (ROI)
```
score_priorizacao = ganho_normalizado / esforco_total
```
Maior score = maior retorno por hora investida. Ordena o backlog do topo para baixo.

---

## Camada de IA (src/lib/ai/)

Provedor configurável via variável `AI_PROVIDER`.

### Provedores Disponíveis

#### mock-provider.ts
- **Uso**: Development / teste sem custo
- **Implementação**: word matching simples
- **Exemplo**: se descricao contém "integração", retorna complexidade "Alta"
- **Sem custo**: ideal para CI/CD e testes

#### openai-provider.ts
- **Modelo**: GPT (via SDK OpenAI)
- **Requer**: `OPENAI_API_KEY`
- **Latência**: ~2-5s
- **Custo**: ~$0.01-0.05 por requisição

#### anthropic-provider.ts
- **Modelo**: Claude (via SDK Anthropic)
- **Requer**: `ANTHROPIC_API_KEY`
- **Latência**: ~3-7s
- **Custo**: ~$0.01-0.05 por requisição

### Estrutura

- **index.ts**: Factory que instancia o provider correto baseado em `AI_PROVIDER`
- **prompt-builder.ts**: Constrói prompts com contexto da solicitação (área, critérios existentes, histórico)
- **response-validator.ts**: Valida e normaliza resposta da IA, garantindo que complexidades e valores existem no banco

### Fluxo

1. Usuário submete solicitação via `/solicitacoes/nova`
2. `prompt-builder` monta prompt com descrição, área, contexto
3. Provider (mock/OpenAI/Anthropic) processa e retorna sugestões
4. `response-validator` valida se critérios/complexidades existem
5. Usuário revê no form, ajusta manualmente se necessário
6. Admin aprova ou rejeita

---

## Sidebar Colapsável (UX — 2026-06-12)

- **Componente**: `src/components/Sidebar.tsx`
- **Estado**: localStorage chave `sidebar-collapsed`
- **Desktop apenas**: `hidden lg:flex` no componente colapsado
- **Animação**: CSS `transition-all 200ms ease-in-out`
- **Ícones com tooltip**: quando colapsado (width-16), exibe apenas ícone + tooltip hover
- **Comportamento**:
  - Expandido: menu lateral com labels
  - Colapsado: apenas ícones
  - Toggle via botão no cabeçalho

---

## Dashboard — Top 5 Melhorado (UX — 2026-06-12)

- **KPIs**: contam **todos** os itens (incl. concluídos/cancelados)
- **Top 5 ranking**: exclui itens com status CONCLUÍDO ou CANCELADO antes do slice
- **Implementação**: filter antes do map, mantém JSX limpo

```typescript
const activeBacklogItems = backlogItems
  .filter(item => !['CONCLUIDO', 'CANCELADO'].includes(item.status))
  .sort((a, b) => b.scorePriorizacao - a.scorePriorizacao)
  .slice(0, 5);
```

---

## Backlog — Concluídas no Final (UX — 2026-06-12)

- **Ordem**: 
  1. Itens ativos (NAO_INICIADO, PRIORIZADO, EM_ANDAMENTO) ordenados por score DESC
  2. Separador visual com texto "Concluídas / Canceladas"
  3. Itens concluídos/cancelados com `opacity-60` para indicar inatividade

- **Implementação**: React Fragment para não duplicar JSX, funciona mobile e desktop

```typescript
const activeItems = items.filter(i => !['CONCLUIDO', 'CANCELADO'].includes(i.status));
const inactiveItems = items.filter(i => ['CONCLUIDO', 'CANCELADO'].includes(i.status));

return (
  <>
    {activeItems.map(item => <BacklogItemCard key={item.id} item={item} />)}
    {inactiveItems.length > 0 && (
      <>
        <div className="border-t-2 border-gray-300 py-4 text-center text-sm font-semibold text-gray-500">
          Concluídas / Canceladas
        </div>
        {inactiveItems.map(item => (
          <BacklogItemCard key={item.id} item={item} className="opacity-60" />
        ))}
      </>
    )}
  </>
);
```

---

## Deploy em Produção

### Plataforma
- **Vercel**
- **Projeto**: `transformacao-raiz-backlog`
- **Org ID**: `team_TMKJ6Jpmld4uNpkdU08al14z`
- **URL**: https://transformacao-raiz-backlog.vercel.app
- **Banco**: Supabase PostgreSQL

### Procedimento de Deploy

1. Na raiz do repositório, conferir o vínculo de `.vercel/project.json` com
   `transformacao-raiz-backlog` (`prj_WDs3of4w2BwoLv4G0yEzHDtTgyTZ`) usando
   `vercel project inspect transformacao-raiz-backlog`.
2. Validar o código: `npx prisma generate`, `npx prisma validate`,
   `npx tsc --noEmit`, `npm test -- --runInBand`, ESLint dos arquivos alterados e
   `npx next build`.
3. Registrar as alterações e a documentação em commit e enviar para `origin/main`.
4. Executar `vercel --prod --yes`. O build definido em `package.json` gera o
   Prisma Client, aplica migrations com as variáveis de produção e compila o Next.js.
5. Confirmar status Ready e o alias `transformacao-raiz-backlog.vercel.app` com
   `vercel inspect https://transformacao-raiz-backlog.vercel.app`. Neste ambiente,
   o CLI promove automaticamente os aliases alternativos, incluindo
   `1-11-calculadora-de-esforco.vercel.app`; em 15/09/2026 foi necessário atualizar
   explicitamente o endereço principal:

   ```powershell
   vercel alias set <url-do-deployment> transformacao-raiz-backlog.vercel.app
   vercel inspect https://transformacao-raiz-backlog.vercel.app
   ```

   A inspeção pelo endereço principal deve resolver para o ID do novo deployment.
6. Conferir os logs de migration, a resposta HTTP de produção e registrar o
   resultado em [RETOMADA.md](RETOMADA.md).

O comando `npm run build` inclui `prisma migrate deploy` e altera o banco
configurado. Para conferir somente a compilação, usar `npx next build`.

### Banco de Dados

- **URL de Conexão (prod)**:
  - `DATABASE_URL`: Supabase transaction pooler (porta 6543) — uso aplicação
  - `DIRECT_URL`: Supabase direct (porta 5432) — uso Prisma migrations apenas
  
- **Migrations**:
  ```powershell
  npx prisma migrate deploy
  ```
  Sempre usar `DIRECT_URL` para migrations em produção.

### Keep-Alive (Anti Cold-Start)

- **Endpoint**: `/api/keepalive`
- **Frequência**: a cada 6 dias ao meio-dia UTC
- **Objetivo**: evitar cold start da aplicação
- **Implementação**: Webhook externo (ex: Uptime Robot, GitHub Actions) fazendo GET para `https://transformacao-raiz-backlog.vercel.app/api/keepalive`

---

## Variáveis de Ambiente

### Banco de Dados (Supabase)
```
DATABASE_URL=postgresql://...@db.supabase.co:6543/postgres?...
DIRECT_URL=postgresql://...@db.supabase.co:5432/postgres?...
```

### Autenticação (Google OAuth)
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_ALLOWED_DOMAIN=raizeducacao.com.br
```

### Aplicação
```
NEXT_PUBLIC_BASE_URL=https://transformacao-raiz-backlog.vercel.app
```

### IA (opcional)
```
AI_PROVIDER=mock                    # mock | openai | anthropic
OPENAI_API_KEY=...                  # se AI_PROVIDER=openai
ANTHROPIC_API_KEY=...               # se AI_PROVIDER=anthropic
```

---

## Estrutura de Diretórios

```
1.11 - Calculadora de Esforço/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # Dashboard
│   │   ├── login/                  # Autenticação
│   │   ├── backlog/                # Listagem e detalhe
│   │   ├── solicitacoes/nova/      # Calculadora
│   │   ├── parametrizacao/         # Tabela de esforço
│   │   ├── areas/                  # Gestão de áreas
│   │   ├── areas-negocio/          # Gestão de áreas de negócio
│   │   ├── componentes/            # Gestão de componentes
│   │   ├── alocacao/               # Calendário e funcionários
│   │   ├── ferias/                 # Gestão de férias
│   │   ├── fornecedores/           # Gestão de fornecedores
│   │   ├── contratos/              # Gestão de contratos
│   │   ├── pagamentos/             # Gestão de pagamentos
│   │   ├── admin/                  # Gestão de usuários
│   │   ├── auditoria/              # Logs
│   │   └── api/                    # API routes (autenticação, cálculos, etc.)
│   ├── components/                 # Componentes React reutilizáveis
│   ├── lib/
│   │   ├── ai/                     # Camada de IA (mock, OpenAI, Anthropic)
│   │   ├── services/               # Cálculos, priorização e auditoria
│   │   ├── validators/             # Schemas Zod
│   │   ├── config/                 # Status, pesos e constantes
│   │   ├── prisma.ts               # Cliente Prisma
│   │   ├── auth.ts                 # Autenticação
│   │   └── google-oauth.ts         # Integração OAuth Google
│   └── generated/prisma/           # Prisma Client gerado
├── prisma/
│   ├── schema.prisma               # Definição do schema
│   └── migrations/                 # Histórico de migrations
├── docs/
│   ├── SISTEMA.md                  # Este arquivo
│   └── ...                         # Outras docs
├── public/                         # Assets estáticos
├── .env.example                    # Variáveis de ambiente (template)
├── package.json
├── tsconfig.json
├── next.config.js
└── docker-compose.yml              # Ambiente local opcional, se configurado no projeto
```

---

## Convenções do Projeto

- **Linguagem**: TypeScript com strict mode habilitado
- **Framework web**: Next.js 16 com App Router
- **ORM**: Prisma com PostgreSQL/Supabase
- **Estilo**: Tailwind CSS v4
- **Testes**: Jest (quando aplicável)
- **Formatação**: Prettier, ESLint (configurações no repo)
- **Commits**: Convenção Conventional Commits (feat:, fix:, docs:, etc.)

---

## Manutenção Futura

### Checklist de Deploy
- [ ] Rodar migrations: `npx prisma migrate deploy`
- [ ] Verificar variáveis de ambiente no Vercel console
- [ ] Testar login com Google OAuth
- [ ] Testar cálculo de esforço (IA provider configurado?)
- [ ] Verificar dashboard KPIs
- [ ] Validar backup do banco (Supabase)

### Observações Importantes
1. **Secrets**: Nunca commitar `.env` ou credenciais no repositório
2. **Migrations**: Sempre usar `DIRECT_URL` para migrations, não `DATABASE_URL`
3. **IA Provider**: Em produção, usar `openai` ou `anthropic`; `mock` é apenas dev
4. **Cold start**: Verificar logs do `/api/keepalive` a cada 6 dias
5. **Auditoria**: Logs são críticos — não limpar `AuditLog` sem aprovação

---

## Contato & Suporte

- **Repositório**: https://github.com/Raiz-Educacao-SA/calculadora-esforco
- **Projeto Vercel**: https://vercel.com/dashboard (projeto `transformacao-raiz-backlog`)
- **Supabase**: [Dashboard Supabase — atualizar conforme necessário]

---

**Última Atualização**: 2026-09-16

**Versão Documento**: 1.3
