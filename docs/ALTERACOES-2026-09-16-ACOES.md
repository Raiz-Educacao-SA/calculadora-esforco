# Ações das listas por ícones — 16/09/2026

## Resultado

As ações individuais das listas foram padronizadas com ícones. O botão Editar
passou a usar um lápis; cada ação tem nome acessível com o registro de destino
e uma dica exibida ao passar o mouse ou focar pelo teclado. Foram substituídas
97 ocorrências de controles em 18 páginas, incluindo versões desktop/mobile
e estados de edição.

Três agentes colaboraram na implementação: cadastros, operações e revisão de
UX/acessibilidade. A integração contemplou backlog, alocação, parametrização,
solicitações e documentação.

## Padrão visual e interação

| Ação | Ícone | Cor |
|---|---|---|
| Editar | Lápis | Azul |
| Excluir/remover | Lixeira | Vermelho |
| Ativar | Triângulo | Verde |
| Desativar | Pausa | Âmbar |
| Consultar detalhes | Olho | Neutra |
| Salvar edição na lista | Marca de verificação | Verde-azulada |
| Cancelar edição | X | Neutra |
| Marcar pagamento como pago | Marca de verificação em círculo | Verde |
| Ver férias na timeline | Calendário | Verde-azulada |
| Ver contratos do fornecedor | Documentos | Neutra |
| Abrir anexo | Seta para fora | Neutra |

- Componente compartilhado: `src/components/ui/ListActionButton.tsx`, com
  exports `ListActionButton` e `ListActionLink`, sem dependência de biblioteca
  de ícones. Inclui também o ícone de download para uso futuro.
- Ícones SVG de 18px; área de acionamento de 36px no desktop e 44px no celular
  e em dispositivos com ponteiro de toque; bordas arredondadas e temas claro/escuro.
- Nome acessível contextual, por exemplo `Editar Transformação`; SVG decorativo
  oculto dos leitores de tela. Foco visível e botão nativo com `type="button"`.
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
O resultado da publicação será registrado abaixo após a verificação de produção.
