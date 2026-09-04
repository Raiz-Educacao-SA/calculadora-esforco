'use client'

export default function ManualPage() {
  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-break-before { break-before: page; }
          .print-break-inside-avoid { break-inside: avoid; }
          body { background: white !important; color: black !important; }
          main { background: white !important; padding: 0 !important; }
          .manual-container { max-width: 100% !important; padding: 0 !important; }
          .manual-section { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
        }
      `}</style>

      <div className="manual-container max-w-4xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-orange-500 font-bold text-lg">RAIZ</span>
              <span className="text-teal-600 font-bold text-lg">educação</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Manual do Usuário — Transformação Backlog
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Guia completo de uso do sistema de gestão de esforço e backlog
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 shrink-0 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            aria-label="Imprimir ou salvar como PDF"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Salvar como PDF
          </button>
        </div>

        {/* Seção 1 — Visão Geral */}
        <section className="manual-section print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="1" title="Visão Geral" />
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            O sistema <strong className="text-gray-900 dark:text-white">Transformação Backlog</strong> é uma ferramenta web para:
          </p>
          <ul className="space-y-2 mb-4">
            <BulletItem>Calcular esforço de demandas de desenvolvimento usando IA e parametrização</BulletItem>
            <BulletItem>Priorizar automaticamente o backlog baseado na relação ganho/esforço</BulletItem>
            <BulletItem>Gerenciar a alocação do time de transformação</BulletItem>
          </ul>
          <div className="flex items-center gap-2 rounded-md bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-700 px-4 py-3">
            <svg className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="text-sm text-teal-800 dark:text-teal-200 font-medium">
              URL:{' '}
              <a
                href="https://transformacao-raiz-backlog.vercel.app"
                className="underline hover:text-teal-600"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://transformacao-raiz-backlog.vercel.app
              </a>
            </span>
          </div>
        </section>

        {/* Seção 2 — Acesso e Perfis */}
        <section className="manual-section print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="2" title="Acesso e Perfis de Usuário" />
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Login</p>
            <ul className="space-y-1">
              <BulletItem>Email e senha cadastrados</BulletItem>
              <BulletItem>Conta Google com domínio <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-xs">@raizeducacao.com.br</code></BulletItem>
            </ul>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <RoleBadge
              role="ADMIN"
              color="teal"
              description="Acesso total: parametrização, usuários, colaboradores e auditoria."
            />
            <RoleBadge
              role="OPERATOR"
              color="blue"
              description="Acesso operacional: criar solicitações, gerenciar backlog, alocação e férias."
            />
            <RoleBadge
              role="VIEWER"
              color="gray"
              description="Somente leitura: dashboard e backlog."
            />
          </div>
        </section>

        {/* Seção 3 — Módulos */}
        <section className="manual-section bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="3" title="Módulos do Sistema" />

          {/* 3.1 Dashboard */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.1" title="Dashboard" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Página inicial com visão consolidada do backlog.
            </p>
            <ul className="space-y-1 mb-3">
              <BulletItem><strong>KPIs:</strong> Total de Demandas, Esforço Total (horas), Demandas Priorizadas, Score Médio</BulletItem>
              <BulletItem>Top 5 prioridades ativas (demandas concluídas/canceladas não aparecem no ranking)</BulletItem>
              <BulletItem>Explainer interativo da fórmula de score de priorização</BulletItem>
            </ul>
          </div>

          {/* 3.2 Backlog */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.2" title="Backlog Priorizado" />
            <ul className="space-y-1">
              <BulletItem>Lista todas as demandas ordenadas por score de priorização</BulletItem>
              <BulletItem>Demandas ativas aparecem no topo; concluídas/canceladas ao final com separador visual</BulletItem>
              <BulletItem><strong>Filtros:</strong> Solicitante, Área Solicitante, Área Técnica, Status, Tipo de Ganho</BulletItem>
              <BulletItem><strong>Edição inline:</strong> status, responsável, data de início, previsão de conclusão</BulletItem>
              <BulletItem>Seleção em lote para remoção de itens</BulletItem>
              <BulletItem>Clique no título de uma demanda para abrir o detalhe completo</BulletItem>
            </ul>
          </div>

          {/* 3.3 Nova Solicitação */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.3" title="Nova Solicitação (Calculadora)" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Fluxo em etapas:</p>
            <ol className="space-y-2 mb-4">
              <StepItem number={1} label="Preencher">
                Título, descrição detalhada, área técnica, solicitante, área solicitante, nº Zeev e urgência
              </StepItem>
              <StepItem number={2} label="Analisar com IA">
                O sistema analisa a descrição e sugere critérios e complexidades automaticamente
              </StepItem>
              <StepItem number={3} label="Ajustar">
                Operador adiciona/remove critérios e altera complexidades manualmente
              </StepItem>
              <StepItem number={4} label="Recalcular">
                Clique em "Recalcular" para atualizar o esforço estimado após ajustes
              </StepItem>
              <StepItem number={5} label="Aprovar">
                Aprova o esforço calculado — somente após aprovação a demanda pode entrar no backlog
              </StepItem>
              <StepItem number={6} label="Enviar ao Backlog">
                Informar tipo de ganho (Redução de Custo / Aumento de Receita / Redução de Horas) e valor esperado
              </StepItem>
            </ol>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">Indicadores visuais dos critérios:</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <VisualIndicator
                borderColor="border-blue-400"
                badgeColor="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                badgeLabel="IA"
                description="Sugestão gerada pela IA"
              />
              <VisualIndicator
                borderColor="border-green-400"
                badgeColor="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                badgeLabel="Manual"
                description="Alteração feita manualmente"
              />
              <VisualIndicator
                borderColor="border-yellow-400"
                badgeColor="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300"
                badgeLabel="Pendente"
                description="Modificação aguardando recálculo"
              />
            </div>
          </div>

          {/* 3.4 Parametrização */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.4" title="Parametrização" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Tabela unificada por área e componente. Define o esforço (horas) para cada combinação critério × complexidade.
            </p>
            <ul className="space-y-1">
              <BulletItem>Selecionar área técnica e, opcionalmente, componente</BulletItem>
              <BulletItem>Adicionar critérios e definir valores por complexidade: Baixa / Média / Alta / Muito Alta</BulletItem>
              <BulletItem>Edição inline dos valores de esforço</BulletItem>
              <BulletItem>Exclusão de critérios em lote</BulletItem>
            </ul>
          </div>

          {/* 3.5–3.7 CRUDs */}
          <div className="print-break-inside-avoid mb-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CrudCard number="3.5" title="Áreas Técnicas" description="CRUD de áreas técnicas (BI, Dev Backend, Dev Frontend, Engenharia de Dados, etc.)" />
              <CrudCard number="3.6" title="Áreas de Negócio" description="CRUD de áreas solicitantes das demandas." />
              <CrudCard number="3.7" title="Componentes" description="CRUD de componentes por área técnica para granularidade maior na parametrização." />
            </div>
          </div>

          {/* 3.8 Alocação */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.8" title="Alocação de Time" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Calendário de alocação dos colaboradores do time de transformação.
            </p>
            <ul className="space-y-1">
              <BulletItem>Visualização por colaborador com blocos coloridos por área/demanda</BulletItem>
              <BulletItem>Criar alocações vinculadas a itens do backlog ou de forma avulsa</BulletItem>
              <BulletItem>Cálculo automático de dias úteis e horas totais da alocação</BulletItem>
            </ul>
          </div>

          {/* 3.9 Férias */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.9" title="Férias" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cadastro de períodos de férias por colaborador. Integrado ao calendário de alocação para evitar conflitos de disponibilidade.
            </p>
          </div>

          {/* 3.10–3.12 Admin */}
          <div className="print-break-inside-avoid">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <CrudCard
                number="3.10"
                title="Colaboradores"
                adminOnly
                description="CRUD dos colaboradores com vínculo a área técnica e conta de usuário."
              />
              <CrudCard
                number="3.11"
                title="Usuários"
                adminOnly
                description="Gestão de acessos: criar usuários, definir roles (ADMIN/OPERATOR/VIEWER), ativar/desativar."
              />
              <CrudCard
                number="3.12"
                title="Auditoria"
                adminOnly
                description="Histórico de todas as alterações com dados anteriores e novos."
              />
            </div>
          </div>
        </section>

        {/* Seção 4 — Fórmulas */}
        <section className="manual-section print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="4" title="Fórmulas de Cálculo" />
          <div className="space-y-3 mb-5">
            <FormulaBlock formula="Esforço Total = Σ (esforço por critério selecionado)" />
            <FormulaBlock formula="Ganho Normalizado = Valor do Ganho × Peso do Tipo de Ganho" />
            <FormulaBlock formula="Score de Priorização = Ganho Normalizado / Esforço Total" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pesos dos tipos de ganho:</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <WeightCard
              tipo="Aumento de Receita"
              peso="1.2"
              nota="Prioridade maior"
              color="green"
            />
            <WeightCard
              tipo="Redução de Custo"
              peso="1.0"
              nota="Referência base"
              color="blue"
            />
            <WeightCard
              tipo="Redução de Horas"
              peso="0.8"
              nota="Prioridade menor"
              color="yellow"
            />
          </div>
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Quanto maior o score, maior a relação ganho/esforço e mais prioritária a demanda no ranking do backlog.
          </p>
        </section>

        {/* Seção 5 — Menu Lateral */}
        <section className="manual-section print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="5" title="Menu Lateral" />
          <ul className="space-y-2">
            <BulletItem>
              <strong>Colapsável:</strong> clique na seta (◀) no cabeçalho do menu para recolher. No modo colapsado, exibe apenas ícones com tooltip ao passar o cursor.
            </BulletItem>
            <BulletItem>
              <strong>Estado persistido:</strong> a preferência de menu expandido ou colapsado é salva no navegador e mantida entre sessões.
            </BulletItem>
            <BulletItem>
              Em dispositivos móveis, o menu é acessado pelo botão de hambúrguer no canto superior esquerdo da tela.
            </BulletItem>
          </ul>
        </section>

        {/* Seção 6 — Fluxo Completo */}
        <section className="manual-section print-break-before print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="6" title="Fluxo Completo Recomendado" />
          <div className="space-y-3">
            <FlowStep
              number={1}
              role="Admin"
              roleColor="teal"
              title="Parametrizar"
              description="Configurar áreas técnicas e de negócio, adicionar componentes, definir critérios e valores de esforço por complexidade."
            />
            <FlowStep
              number={2}
              role="Operator"
              roleColor="blue"
              title="Criar Solicitação"
              description="Preencher a demanda, acionar análise com IA, ajustar critérios manualmente, aprovar o esforço e enviar ao backlog informando tipo e valor do ganho."
            />
            <FlowStep
              number={3}
              role="Todos"
              roleColor="gray"
              title="Gerir Backlog"
              description="Acompanhar o ranking priorizado, atualizar status das demandas e alocar responsáveis via edição inline."
            />
            <FlowStep
              number={4}
              role="Operator"
              roleColor="blue"
              title="Alocar Time"
              description="Criar alocações no calendário vinculando colaboradores às demandas priorizadas. O sistema calcula dias úteis e horas automaticamente."
            />
            <FlowStep
              number={5}
              role="Todos"
              roleColor="gray"
              title="Concluir"
              description="Marcar demandas como Concluídas. Elas saem do ranking ativo mas permanecem visíveis ao final do backlog."
            />
          </div>
        </section>

        {/* Rodapé */}
        <footer className="text-center pt-2 pb-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            <a
              href="https://transformacao-raiz-backlog.vercel.app"
              className="hover:text-teal-600 dark:hover:text-teal-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              transformacao-raiz-backlog.vercel.app
            </a>
            {' '}&mdash; Atualizado em 12/06/2026
          </p>
        </footer>

      </div>
    </>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

function SectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white mb-4">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-600 text-white text-sm font-bold shrink-0">
        {number}
      </span>
      {title}
    </h2>
  )
}

function SubsectionTitle({ number, title }: { number: string; title: string }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
      <span className="text-teal-600 dark:text-teal-400 font-bold">{number}</span>
      {title}
    </h3>
  )
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function StepItem({
  number,
  label,
  children,
}: {
  number: number
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-xs font-bold shrink-0 mt-0.5">
        {number}
      </span>
      <div className="text-sm text-gray-700 dark:text-gray-300">
        <span className="font-semibold text-gray-900 dark:text-white">{label}:</span>{' '}
        {children}
      </div>
    </li>
  )
}

function VisualIndicator({
  borderColor,
  badgeColor,
  badgeLabel,
  description,
}: {
  borderColor: string
  badgeColor: string
  badgeLabel: string
  description: string
}) {
  return (
    <div className={`flex items-start gap-2 rounded-md border-l-4 ${borderColor} bg-gray-50 dark:bg-gray-700/40 px-3 py-2`}>
      <div>
        <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
          {badgeLabel}
        </span>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      </div>
    </div>
  )
}

function CrudCard({
  number,
  title,
  description,
  adminOnly,
}: {
  number: string
  title: string
  description: string
  adminOnly?: boolean
}) {
  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{number}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
        {adminOnly && (
          <span className="ml-auto inline-block rounded px-1.5 py-0.5 text-xs font-medium bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
            Admin
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function RoleBadge({
  role,
  color,
  description,
}: {
  role: string
  color: 'teal' | 'blue' | 'gray'
  description: string
}) {
  const colorMap = {
    teal: 'bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-700',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700',
    gray: 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-600',
  }
  const badgeMap = {
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-800/50 dark:text-teal-200',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-800/50 dark:text-blue-200',
    gray: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
  }
  return (
    <div className={`rounded-md border p-3 ${colorMap[color]}`}>
      <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold mb-2 ${badgeMap[color]}`}>
        {role}
      </span>
      <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  )
}

function FormulaBlock({ formula }: { formula: string }) {
  return (
    <div className="rounded-md bg-gray-900 dark:bg-gray-950 px-4 py-3">
      <code className="text-sm font-mono text-teal-300">{formula}</code>
    </div>
  )
}

function WeightCard({
  tipo,
  peso,
  nota,
  color,
}: {
  tipo: string
  peso: string
  nota: string
  color: 'green' | 'blue' | 'yellow'
}) {
  const colorMap = {
    green: {
      dot: 'bg-green-500',
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
      border: 'border-green-200 dark:border-green-700',
    },
    blue: {
      dot: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-700',
    },
    yellow: {
      dot: 'bg-yellow-500',
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-700',
    },
  }
  const c = colorMap[color]
  return (
    <div className={`rounded-md border bg-white dark:bg-gray-800 p-3 ${c.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} aria-hidden="true" />
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">{tipo}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-block rounded px-2 py-0.5 text-sm font-bold ${c.badge}`}>
          × {peso}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{nota}</span>
      </div>
    </div>
  )
}

function FlowStep({
  number,
  role,
  roleColor,
  title,
  description,
}: {
  number: number
  role: string
  roleColor: 'teal' | 'blue' | 'gray'
  title: string
  description: string
}) {
  const roleColorMap = {
    teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    gray: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 px-4 py-3">
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-600 text-white text-sm font-bold shrink-0 mt-0.5">
        {number}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">{title}</span>
          <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${roleColorMap[roleColor]}`}>
            {role}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}
