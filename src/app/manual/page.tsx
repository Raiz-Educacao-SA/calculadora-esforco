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
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
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
            <p className="text-xs text-teal-700 dark:text-teal-300 mt-2">Atualizado em 16/09/2026 · Ações por ícones, capacidade, estagiários e previsão automática</p>
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

        <nav aria-label="Índice do manual" className="no-print rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Acesso rápido</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-teal-800 dark:text-teal-200">
            <a className="underline" href="#manual-acoes">Ícones de ações</a>
            <a className="underline" href="#manual-backlog">Backlog e prioridades</a>
            <a className="underline" href="#manual-capacidade">Jornada e percentual</a>
            <a className="underline" href="#manual-estagiarios">Cadastro de estagiários</a>
            <a className="underline" href="#manual-alocacao">Alocação e férias</a>
            <a className="underline" href="#manual-duvidas">Recálculo e dúvidas frequentes</a>
          </div>
        </nav>

        {/* Seção 1 — Visão Geral */}
        <section className="manual-section print-break-inside-avoid bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="1" title="Visão Geral" />
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            O sistema <strong className="text-gray-900 dark:text-white">Transformação Backlog</strong> é uma ferramenta web para:
          </p>
          <ul className="space-y-2 mb-4">
            <BulletItem>Calcular esforço de demandas de desenvolvimento usando IA e parametrização</BulletItem>
              <BulletItem>Comparar demandas pela relação ganho/esforço e registrar a ordem de execução do backlog</BulletItem>
              <BulletItem>Gerenciar a alocação do time de transformação</BulletItem>
              <BulletItem>Projetar datas conforme a capacidade de cada colaborador e acompanhar a conclusão das atividades</BulletItem>
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

        <section id="manual-acoes" className="manual-section scroll-mt-20 lg:scroll-mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Como usar os ícones de ações</h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            As ações de cada registro aparecem como botões com ícones em tons neutros, à direita das listas ou na parte inferior dos cartões no celular.
            Passe o mouse ou use <strong>Tab</strong> para mostrar uma dica curta com a ação, como <strong>Editar</strong>, <strong>Excluir</strong> ou <strong>Ver detalhes</strong>.
            Use <strong>Enter</strong> para acionar o controle e <strong>Esc</strong> para fechar a dica.
          </p>
          <ul className="space-y-2">
            <BulletItem><strong>Lápis:</strong> editar o registro.</BulletItem>
            <BulletItem><strong>Olho:</strong> consultar os detalhes. <strong>Documentos:</strong> abrir os contratos do fornecedor. <strong>Seta para fora:</strong> abrir um anexo em nova aba.</BulletItem>
            <BulletItem><strong>Triângulo:</strong> ativar. <strong>Pausa:</strong> desativar.</BulletItem>
            <BulletItem><strong>Lixeira:</strong> excluir ou remover o item; observe a confirmação apresentada pelo sistema.</BulletItem>
            <BulletItem><strong>Marca de verificação:</strong> salvar a edição na própria lista. <strong>X:</strong> cancelar essa edição.</BulletItem>
            <BulletItem><strong>Marca de verificação dentro de um círculo:</strong> marcar um pagamento como pago. <strong>Calendário:</strong> consultar as férias na timeline.</BulletItem>
            <BulletItem>Durante o processamento, o ícone pode mostrar um indicador de carregamento. Botões esmaecidos estão indisponíveis naquele momento ou para o seu perfil.</BulletItem>
          </ul>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            No celular, toque diretamente no ícone desejado. Os botões de criação, ações em lote e confirmações de formulários continuam identificados por texto.
          </p>
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
          <div id="manual-backlog" className="scroll-mt-20 lg:scroll-mt-6 mb-6">
            <SubsectionTitle number="3.2" title="Backlog Priorizado" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              A posição mostra a ordem de execução registrada. O score ajuda a comparar o ganho em relação ao esforço;
              uma repriorização manual pode colocar uma demanda de score menor antes de outra de score maior.
            </p>
            <ul className="space-y-1">
              <BulletItem>O ranking preserva as posições registradas. Entre os itens ainda não iniciados, os que estão nas cinco primeiras posições recebem o status Priorizado; iniciar uma atividade continua sendo uma ação do operador.</BulletItem>
              <BulletItem>Demandas ativas aparecem no topo. A seção <strong>Concluídas / Canceladas</strong> fica recolhida por padrão ao final; clique no cabeçalho para mostrar ou ocultar os itens. O contador indica a quantidade que atende aos filtros.</BulletItem>
              <BulletItem>Ao filtrar o Status por <strong>Concluído</strong> ou <strong>Cancelado</strong>, a seção abre automaticamente. Limpar os filtros volta a recolhê-la. O controle funciona no computador e no celular, inclusive com Tab e Enter ou Espaço.</BulletItem>
              <BulletItem><strong>Filtros:</strong> Solicitante, Área Solicitante, Área Técnica, Status, Tipo de Ganho</BulletItem>
              <BulletItem>Clique no título para abrir os detalhes. Use a edição na própria lista para alterar status, responsável e início. O perfil Viewer apenas consulta.</BulletItem>
              <BulletItem><strong>Selecionar todos</strong> considera apenas os itens visíveis. Recolher a seção limpa a seleção das concluídas/canceladas. Na remoção em lote, confira os itens selecionados antes de confirmar. As alocações vinculadas são removidas e as previsões afetadas são recalculadas.</BulletItem>
            </ul>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <caption className="text-left font-semibold text-gray-900 dark:text-white mb-2">Como ler as colunas de planejamento</caption>
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  <tr><th scope="col" className="p-2">Coluna</th><th scope="col" className="p-2">Significado</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-700 dark:text-gray-300">
                  <tr><th scope="row" className="p-2 align-top">Esforço</th><td className="p-2">Horas estimadas a partir dos critérios da demanda. A jornada do responsável não altera esse total.</td></tr>
                  <tr><th scope="row" className="p-2 align-top">Início</th><td className="p-2">Data informada pelo operador para começar a distribuição do esforço.</td></tr>
                  <tr><th scope="row" className="p-2 align-top">Previsão</th><td className="p-2">Data calculada conforme a capacidade disponível. Não é editada manualmente no backlog.</td></tr>
                  <tr><th scope="row" className="p-2 align-top">CONCLUSÃO</th><td className="p-2">Data registrada ao mudar para Concluído; permite comparar o encerramento com a previsão.</td></tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Repriorizar uma demanda</h4>
              <ol className="space-y-2">
                <StepItem number={1} label="Arrastar">No computador, arraste a linha ou o indicador de posição de uma demanda ativa para a posição desejada. Termine qualquer edição aberta antes de arrastar.</StepItem>
                <StepItem number={2} label="Justificar">Informe quem solicitou a priorização, a justificativa e o responsável por repriorizar no formulário exibido.</StepItem>
                <StepItem number={3} label="Confirmar">Clique em Confirmar priorização. A ordem só é gravada após a confirmação; cancelar mantém a ordem anterior.</StepItem>
              </ol>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Use a lista sem filtros para conferir a ordem completa. Itens concluídos ou cancelados não podem ser arrastados. Repriorizar não altera a divisão das horas entre atividades em andamento.</p>
            </div>

            <div className="mt-5 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Iniciar e acompanhar uma atividade</h4>
              <ol className="space-y-2">
                <StepItem number={1} label="Conferir o esforço">A demanda deve ter um esforço positivo. Abra os detalhes e revise a Memória de Cálculo quando necessário.</StepItem>
                <StepItem number={2} label="Definir o responsável">Selecione um colaborador ativo. É possível salvar o responsável antes de iniciar a atividade.</StepItem>
                <StepItem number={3} label="Iniciar">Selecione Em Andamento, preencha a Data de início e salve. Durante a edição, a previsão aparece como Calculada ao salvar.</StepItem>
                <StepItem number={4} label="Conferir a previsão">O sistema distribui as horas pelo calendário e sincroniza a alocação. Outras atividades em andamento do mesmo colaborador também podem ter a previsão ajustada.</StepItem>
              </ol>
            </div>

            <div className="mt-5 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Revisar esforço e ganho nos detalhes</h4>
              <ul className="space-y-1">
                <BulletItem>Na <strong>Memória de Cálculo</strong>, ajuste critérios e complexidades e clique em <strong>Recalcular esforço</strong>. O indicador de alterações pendentes sinaliza que o total precisa ser atualizado.</BulletItem>
                <BulletItem><strong>Reestimar com IA</strong> refaz a análise da solicitação e substitui a seleção de critérios. Revise o resultado antes de usá-lo no planejamento.</BulletItem>
                <BulletItem>Em <strong>Ganho Esperado</strong>, revise tipo, valor e premissa e salve. O ganho normalizado e o score são atualizados; a ordem manual de execução permanece registrada.</BulletItem>
                <BulletItem>Um novo esforço recalcula a previsão da atividade em andamento e das demandas paralelas afetadas. Alterar somente a jornada ou o percentual muda a capacidade e a previsão, mantendo as horas de esforço.</BulletItem>
              </ul>
            </div>

            <div className="mt-5 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Concluir, cancelar e reabrir</h4>
              <ul className="space-y-1">
                <BulletItem>Ao salvar <strong>Concluído</strong>, a coluna CONCLUSÃO recebe a data do dia no calendário de São Paulo. Salvar novamente mantém essa data; a conclusão não pode ser anterior ao início.</BulletItem>
                <BulletItem>O fim da alocação vinculada é ajustado à conclusão. A ocupação histórica é considerada até essa data e a capacidade futura é liberada.</BulletItem>
                <BulletItem><strong>Cancelar</strong> retira a demanda do ranking ativo e libera sua alocação. O cancelamento não registra uma data de conclusão.</BulletItem>
                <BulletItem>Reabrir limpa a conclusão anterior. Para voltar a Em Andamento, confira início, responsável e esforço; a previsão será calculada novamente.</BulletItem>
                <BulletItem>Demandas concluídas antes da implantação da coluna podem aparecer sem conclusão. O sistema não inventa uma data histórica. Não reabra uma demanda encerrada apenas para preencher essa coluna.</BulletItem>
              </ul>
            </div>
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
                Clique em &ldquo;Recalcular&rdquo; para atualizar o esforço estimado após ajustes
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
          <div id="manual-capacidade" className="scroll-mt-20 lg:scroll-mt-6 mb-6">
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
            <div className="mt-4 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Alocação em Projetos — administrador</h4>
              <ol className="space-y-2">
                <StepItem number={1} label="Jornada padrão">Informe as horas de trabalho por dia dos profissionais que não são estagiários. O padrão inicial é 8h; o valor deve ser maior que zero e até 24h.</StepItem>
                <StepItem number={2} label="Percentual para projetos">Defina a parcela da jornada disponível para projetos, maior que zero e até 100%. O mesmo percentual é aplicado às duas jornadas.</StepItem>
                <StepItem number={3} label="Estagiários">A jornada exibida é fixa em 6h/dia. A seleção de quem usa essa jornada é feita no cadastro de colaboradores.</StepItem>
                <StepItem number={4} label="Salvar e conferir">Confira os cartões de capacidade diária. Ao salvar os parâmetros, as previsões das atividades em andamento são recalculadas.</StepItem>
              </ol>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-3">Exemplo com 80%: jornada padrão de 8h resulta em <strong>6,4h/dia</strong> para projetos; estagiário de 6h resulta em <strong>4,8h/dia</strong>.</p>
            </div>
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
          <div id="manual-alocacao" className="scroll-mt-20 lg:scroll-mt-6 mb-6">
            <SubsectionTitle number="3.8" title="Alocação de Time" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Calendário de alocação dos colaboradores do time de transformação.
            </p>
            <ul className="space-y-1">
              <BulletItem>Visualização por colaborador com blocos coloridos por área/demanda</BulletItem>
              <BulletItem>Criar alocações vinculadas a itens do backlog ou de forma avulsa</BulletItem>
              <BulletItem>Ao selecionar o colaborador, conferir jornada, capacidade para projetos e disponibilidade no período.</BulletItem>
              <BulletItem><strong>Reserva avulsa ou de demanda ainda não iniciada:</strong> as horas diárias reservam uma parte da capacidade. Sem valor, a reserva ocupa toda a capacidade para projetos no período.</BulletItem>
              <BulletItem><strong>Atividade em andamento:</strong> a previsão vem do cálculo do backlog. As horas diárias informadas na alocação funcionam como um limite para a atividade; sem limite, ela participa da divisão da capacidade restante.</BulletItem>
              <BulletItem>O sistema recusa reservas com horas acima da capacidade diária, soma de reservas superior à disponibilidade ou coincidência com férias em dias úteis.</BulletItem>
              <BulletItem>Para excluir ou desvincular a alocação de uma atividade em andamento, altere primeiro o responsável ou o status pelo backlog.</BulletItem>
              <BulletItem>Criar, editar ou excluir reservas pode mudar as previsões das atividades do colaborador. Ao trocar o responsável, confira o planejamento dos dois colaboradores envolvidos.</BulletItem>
            </ul>
            <div className="mt-4 print-break-inside-avoid">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Como as atividades dividem o dia</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">As reservas fixas são descontadas primeiro. As atividades em andamento dividem igualmente a capacidade restante, respeitando os limites de horas informados. Quando uma atividade termina, as horas livres são redistribuídas, inclusive no mesmo dia.</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">Exemplo: um estagiário com 80% tem 4,8h/dia. Com uma reserva de 0,8h/dia, sobram 4h/dia; duas atividades em andamento recebem inicialmente 2h/dia cada.</p>
            </div>
          </div>

          {/* 3.9 Férias */}
          <div className="print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.9" title="Férias" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cadastro de períodos de férias por colaborador. Integrado ao calendário de alocação para evitar conflitos de disponibilidade.
            </p>
            <ul className="space-y-1 mt-2">
              <BulletItem>Informe início e fim do período. As duas datas são consideradas na indisponibilidade.</BulletItem>
              <BulletItem>Cadastrar, alterar ou excluir férias recalcula as previsões das atividades em andamento do colaborador.</BulletItem>
              <BulletItem>O planejamento considera segunda a sexta e férias cadastradas. Feriados não são descontados automaticamente.</BulletItem>
            </ul>
          </div>

          <div id="manual-estagiarios" className="scroll-mt-20 lg:scroll-mt-6 print-break-inside-avoid mb-6">
            <SubsectionTitle number="3.10" title="Colaboradores e cadastro de estagiários" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Operação disponível ao administrador em Alocação → Colaboradores.</p>
            <ol className="space-y-2">
              <StepItem number={1} label="Abrir o cadastro">Cadastre ou edite o colaborador e confira nome, cargo, área técnica e vínculo com a conta de usuário.</StepItem>
              <StepItem number={2} label="Identificar a jornada">Marque <strong>Estagiário</strong> para aplicar 6h/dia e salve. A lista passa a mostrar Estagiário · 6h/dia.</StepItem>
              <StepItem number={3} label="Conferir as atividades">Salvar essa opção recalcula as previsões das atividades em andamento do colaborador. Ao mudar para a jornada padrão, desmarque a opção e salve.</StepItem>
            </ol>
            <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-md p-3 mt-3">O texto do campo Cargo não ativa a jornada reduzida. Mesmo que esteja escrito Estagiário, a opção Estagiário precisa estar marcada. Cadastros anteriores à implantação começaram com a opção desmarcada.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Somente responsáveis ativos podem iniciar novas atividades. Ao inativar um colaborador, revise e transfira suas atividades em andamento, pois ele deixa de ter capacidade disponível.</p>
          </div>

          {/* 3.11–3.12 Admin */}
          <div className="print-break-inside-avoid">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                description="Consulta dos registros de alteração e repriorização, com responsável, data e dados anteriores e novos quando disponíveis."
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
            <FormulaBlock formula="Ganho por Redução de Horas = Horas/mês × Valor Hora × Peso" />
            <FormulaBlock formula="Score de Priorização = Ganho Normalizado / Esforço Total" />
            <FormulaBlock formula="Capacidade diária para projetos = Jornada × Percentual / 100" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pesos padrão dos tipos de ganho:</p>
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
            Quanto maior o score, maior a relação ganho/esforço. A ordem registrada no backlog também considera as repriorizações manuais.
            A previsão distribui o esforço pelos dias disponíveis, contando o primeiro dia quando útil; dividir esforço pela jornada inteira não considera reservas, percentual ou atividades paralelas.
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
              description="Configurar critérios e valores de esforço, jornada padrão e percentual para projetos. Conferir no cadastro quais colaboradores são estagiários e registrar as férias."
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
              role="Admin / Operator"
              roleColor="blue"
              title="Gerir Backlog"
              description="Conferir esforço e ganho, definir responsáveis e registrar repriorizações com solicitante e justificativa. O perfil Viewer acompanha a lista."
            />
            <FlowStep
              number={4}
              role="Operator"
              roleColor="blue"
              title="Iniciar e planejar"
              description="Informar início e responsável ao salvar Em Andamento. Conferir a previsão automática, as reservas e as demandas paralelas do colaborador."
            />
            <FlowStep
              number={5}
              role="Admin / Operator"
              roleColor="blue"
              title="Concluir"
              description="Salvar Concluído e conferir a data na coluna CONCLUSÃO. A demanda sai do ranking ativo, preserva o histórico e libera capacidade futura."
            />
          </div>
        </section>

        <section id="manual-duvidas" className="manual-section scroll-mt-20 lg:scroll-mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-100 dark:border-gray-700">
          <SectionTitle number="7" title="Recálculo e Dúvidas Frequentes" />
          <div className="space-y-4">
            <ManualQuestion title="Como atualizar a previsão de uma atividade que já estava em andamento?">
              Primeiro, confira a opção Estagiário no cadastro e o percentual em Parametrização. Corrigir a jornada ou salvar os parâmetros recalcula as atividades afetadas. Para conferir uma atividade individual, abra a edição no backlog, valide início e responsável, mantenha Em Andamento e salve. A previsão e a alocação serão atualizadas.
            </ManualQuestion>
            <ManualQuestion title="Quando usar Recalcular esforço?">
              Use esse botão nos detalhes quando os critérios, complexidades ou valores de esforço precisarem ser atualizados. Para aplicar apenas uma mudança de jornada, use o cadastro do colaborador ou os parâmetros de alocação. Por exemplo, uma demanda de 40h continua tendo 40h de esforço, mas pode precisar de mais dias quando a capacidade diária é menor.
            </ManualQuestion>
            <ManualQuestion title="Por que a previsão mudou ao salvar outra demanda?">
              As demandas do mesmo responsável compartilham capacidade. Iniciar, transferir, concluir ou cancelar uma atividade, alterar esforço, reservas, férias, jornada ou percentual pode recalcular as previsões paralelas. Trocar a posição no ranking não reserva mais horas para uma atividade.
            </ManualQuestion>
            <ManualQuestion title="Por que não consigo iniciar uma atividade ou ela está sem previsão?">
              Confira data de início válida, esforço maior que zero, responsável ativo e capacidade disponível para projetos. Cadastros antigos podem estar incompletos. Corrija os dados indicados na mensagem de erro e salve novamente.
            </ManualQuestion>
            <ManualQuestion title="A previsão considera o que já foi executado?">
              O cálculo usa o esforço total e a data de início informada. O sistema não possui apontamento de horas realizadas. Por isso, uma atividade ainda aberta pode ter previsão no passado; revise seu esforço e planejamento conforme a situação real. Não altere o início apenas para ocultar um atraso.
            </ManualQuestion>
            <ManualQuestion title="O recálculo atualiza demandas concluídas?">
              O recálculo de capacidade atua sobre atividades Em Andamento. Itens concluídos preservam seu histórico. Reabra uma demanda somente se ela realmente voltou à execução; isso limpa a data de conclusão anterior e permite calcular uma nova previsão.
            </ManualQuestion>
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
            {' '}&mdash; Atualizado em 16/09/2026
          </p>
        </footer>

      </div>
    </>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

function ManualQuestion({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="print-break-inside-avoid">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-700 dark:text-gray-300">{children}</p>
    </div>
  )
}

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
