# Ações das listas por ícones — 16/09/2026

## Resultado

As ações individuais das listas foram padronizadas com ícones. O botão Editar
passou a usar um lápis; cada ação tem nome acessível com o registro de destino
e uma dica curta com a ação, exibida ao passar o mouse ou focar pelo teclado. Foram substituídas
97 ocorrências de controles em 18 páginas, incluindo versões desktop/mobile
e estados de edição.

Três agentes colaboraram na implementação: cadastros, operações e revisão de
UX/acessibilidade. A integração contemplou backlog, alocação, parametrização,
solicitações e documentação.

## Padrão visual e interação

Todos os botões usam a mesma paleta neutra em cinza, inclusive nos estados de
hover e foco, conforme ajuste solicitado após a primeira publicação.

| Ação | Ícone |
|---|---|
| Editar | Lápis |
| Excluir/remover | Lixeira |
| Ativar | Triângulo |
| Desativar | Pausa |
| Consultar detalhes | Olho |
| Salvar edição na lista | Marca de verificação |
| Cancelar edição | X |
| Marcar pagamento como pago | Marca de verificação em círculo |
| Ver férias na timeline | Calendário |
| Ver contratos do fornecedor | Documentos |
| Abrir anexo | Seta para fora |

- Componente compartilhado: `src/components/ui/ListActionButton.tsx`, com
  exports `ListActionButton` e `ListActionLink`, sem dependência de biblioteca
  de ícones. Inclui também o ícone de download para uso futuro.
- Ícones SVG de 18px; área de acionamento de 36px no desktop e 44px no celular
  e em dispositivos com ponteiro de toque; bordas arredondadas e temas claro/escuro.
- Nome acessível contextual, por exemplo `Editar Transformação`; SVG decorativo
  oculto dos leitores de tela. Foco visível e botão nativo com `type="button"`.
- Dicas visuais mostram apenas a ação (`Editar`, `Excluir`, `Ver detalhes` etc.),
  sem nomes de fornecedores, registros, títulos ou datas. O texto é centralizado
  por ação e compartilhado por botões e links; o contexto do registro permanece
  no `aria-label` para leitores de tela.
- Dicas em portal no corpo da página para escapar do recorte de tabelas, com
  posicionamento limitado à janela, atualização na rolagem e fechamento por Esc.
- `busy` mostra um indicador de carregamento e desabilita novas ativações;
  estados `disabled` e permissões anteriores permanecem aplicados.
- Links preservam navegação, destino e atributos de abertura de anexos em nova aba.

## Telas alteradas

| Grupo | Rotas |
|---|---|
| Cadastros técnicos | `/areas`, `/areas-negocio`, `/criterios`, `/complexidades`, `/componentes`, `/esforcos` |
| Administração e equipe | `/admin/usuarios`, `/alocacao/funcionarios`, `/alocacao`, `/ferias` |
| Fornecedores e financeiro | `/fornecedores`, `/contratos`, `/contratos/[id]`, `/pagamentos` |
| Planejamento | `/backlog`, `/backlog/[id]`, `/parametrizacao`, `/solicitacoes/nova` |

Também foi atualizada a página `/manual`, com o atalho **Ícones de ações**, uma
legenda e instruções de uso com mouse, teclado e toque.

O alcance é visual e de acessibilidade. Handlers, confirmações, regras de negócio
e autorização foram preservados. Ações globais, em lote e confirmações de
formulários permanecem com texto. Os controles nativos de expansão de detalhes
da auditoria e os blocos de conteúdo da timeline mantêm sua apresentação.
Não há alteração de API, schema, migration, estimativa ou cadastro nesta entrega.

## Validação

- ESLint dos arquivos alterados e componente compartilhado: aprovado.
- TypeScript (`npx tsc --noEmit`): aprovado.
- Build local (`npx next build`): aprovado, sem executar migrations locais.
- Jest: 75 testes aprovados em 6 suítes.
- Revisão integrada dos diffs pelos agentes: handlers, permissões e confirmações preservados.
- Edge/Playwright local, com todas as APIs interceptadas e dados fictícios:
  - Áreas em 1440px e 390px: ícones sem texto, dimensões 36/44px, modal de edição
    e confirmação de exclusão; cancelar não envia alteração.
  - Tooltip por mouse/foco, portal, fechamento com Esc e posição dentro da janela.
  - Temas claro/escuro e foco visível conferidos nas capturas; sem rolagem
    horizontal da página nas telas móveis verificadas.
  - Backlog: editar/cancelar na lista e bloqueio de edição para VIEWER preservados.
  - Pagamentos: requisição PUT simulada mantém status PAGO/data; indicador de
    carregamento, `aria-busy` e desabilitação durante a resposta.
  - Contratos: navegação de detalhes e destino/atributos do link de anexo mantidos.
  - Manual: nova seção legível no celular; nenhum erro de execução no navegador.

A conferência visual autenticada utilizou o ambiente local com APIs simuladas.
Não foram acionadas alterações de registros reais nos testes de interface.

## Publicação

| Registro | Resultado |
|---|---|
| Commit da aplicação | [`1d25cf2`](https://github.com/Raiz-Educacao-SA/calculadora-esforco/commit/1d25cf2) |
| Deployment | `dpl_CfyeJBdxozBrZPCWP9R9wV8WRFHx` — Production / Ready |
| URL da versão | [transformacao-raiz-backlog-9e96ng5s0.vercel.app](https://transformacao-raiz-backlog-9e96ng5s0.vercel.app) |
| Endereço principal | [Transformação Backlog](https://transformacao-raiz-backlog.vercel.app) |
| Manual | [Ícones de ações](https://transformacao-raiz-backlog.vercel.app/manual#manual-acoes) |

A publicação terminou em **16/09/2026 às 14:41:58 UTC** (11:41 em São Paulo).
O endereço principal foi direcionado à nova versão e sua inspeção confirmou o
deployment acima com status Ready. `/login` respondeu HTTP 200; `/areas` e
`/manual`, sem sessão, responderam HTTP 307 para o login. O build encontrou as
16 migrations existentes e nenhuma pendente. A interface autenticada foi validada
localmente conforme descrito acima.

## Ajuste posterior — paleta neutra

Atendendo à preferência do usuário, todas as ações compartilham cores neutras
em cinza, incluindo borda, ícone, hover e foco. O componente compartilhado aplica
a mudança às 18 telas. O manual foi ajustado para identificar as ações pelo
formato do ícone. ESLint e TypeScript aprovados; verificação local em Edge com
APIs simuladas confirmou cores iguais entre editar, desativar e excluir nos dois
temas, dicas por foco e ausência de rolagem horizontal no celular.

Publicado no commit `0757f76`, deployment `dpl_7x85ZPxRztikcVd6q8vqLd8qvvCx`,
em **16/09/2026 às 11:48**, horário de São Paulo. Build de produção aprovado,
nenhuma migration pendente, endereço principal apontado para a nova versão e
status Ready confirmado. `/login` respondeu HTTP 200.

## Ajuste posterior — dicas curtas

Todas as dicas dos botões e links de ação passam a exibir apenas a ação:
Editar, Excluir, Ativar, Desativar, Ver detalhes, Salvar, Cancelar, Baixar,
Marcar como pago, Ver na timeline, Ver contratos e Abrir anexo.
O mapeamento fica em `actionTooltips` no componente compartilhado e atende
automaticamente às 18 telas. O nome contextual permanece no `aria-label`.
O Manual do Usuário descreve agora as dicas curtas.

ESLint, TypeScript e conferência do diff aprovados. Edge local com APIs
simuladas confirmou dicas curtas por hover/foco nos cadastros e fornecedores,
incluindo ativação/desativação, salvar/cancelar inline e o link de contratos,
em desktop/celular. Escape continua fechando as dicas e os nomes acessíveis
foram preservados; nenhum erro de execução ou alteração de dados nos testes.

Publicado no commit `c30595e`, deployment `dpl_Bd6LZza2vwBRHDvSS3j33VhgZj88`,
em **16/09/2026 às 11:58**, horário de São Paulo. Build de produção aprovado,
sem migrations pendentes. O endereço principal foi direcionado à versão e
confirmado com status Ready; `/login` respondeu HTTP 200.
