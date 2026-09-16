# Backlog: atividades encerradas recolhíveis — 16/09/2026

## Comportamento

A seção **Concluídas / Canceladas** passa a ficar recolhida ao abrir o backlog,
reduzindo o comprimento da listagem. O agrupamento existente dos dois status
foi mantido. O cabeçalho mostra a quantidade de registros que atendem aos filtros.

- Clique, Enter ou Espaço no cabeçalho alterna entre mostrar e recolher.
- O mesmo controle funciona na tabela desktop e nos cartões mobile, com estado
  compartilhado entre os dois layouts, temas claro/escuro e foco visível.
- A seção aparece mesmo quando só há atividades encerradas; não aparece se não
  houver concluídas/canceladas nos resultados.
- Escolher o filtro de Status Concluído ou Cancelado abre a seção automaticamente.
  Limpar filtros retorna à apresentação recolhida. O estado não é persistido
  entre visitas à página.
- As linhas e cartões recolhidos não são renderizados. Os dados e o histórico
  permanecem disponíveis; reabrir a seção também preserva a edição em andamento.
- Ativos mantêm a ordem de prioridade e o arraste com justificativa. Encerrados
  continuam fora do arraste. A conclusão de um ativo atualiza o contador sem
  abrir uma seção que estava recolhida.

## Seleção e ações em lote

**Selecionar todos os itens visíveis** considera somente os registros exibidos.
Recolher a seção limpa a seleção das concluídas/canceladas daquele grupo.
Contagem da barra, confirmação e IDs enviados à exclusão usam a mesma seleção
visível. Registros ocultos pelos filtros ou pela seção não entram na exclusão.
Sem itens visíveis, selecionar todos e confirmar uma seleção vazia ficam
desabilitados. As confirmações e permissões existentes foram preservadas.

## Arquivos

- `src/app/backlog/page.tsx`: estado `showConcluded`, grupos de exibição,
  `ConcludedSectionToggle`, seleção visível e nomes acessíveis dos checkboxes.
- `src/app/manual/page.tsx`: instruções de expansão, filtros e seleção em lote.
- `docs/SISTEMA.md`: documentação técnica do novo agrupamento.
- `README.md`: referência a este registro.

O controle usa `aria-expanded` e `aria-controls`, com IDs específicos de desktop
e mobile. Não há alterações de API, banco, migrations, estimativas ou histórico.

## Validação

- ESLint, TypeScript, `git diff --check` e build local (`npx next build`) aprovados.
- Edge/Playwright local com dados fictícios e todas as APIs interceptadas:
  - Duas atividades ativas e 13 encerradas: início recolhido, sem linhas
    encerradas no DOM; expansão/recolhimento por Enter e Espaço.
  - Selecionar todos recolhido seleciona 2; expandido permite selecionar 15;
    recolher retorna a 2. DELETE simulado contém somente os dois IDs ativos.
  - Filtros Concluído/Cancelado abrem a seção; filtro de solicitante atualiza a
    contagem; limpar recolhe; filtro sem encerradas remove o cabeçalho.
  - Data de uma edição preservada após recolher/expandir; arraste de ativo abre
    a confirmação de justificativa; concluir ativo atualiza o contador.
  - Casos com apenas concluídas, apenas ativas e lista vazia conferidos.
  - Desktop de 1440px, celular de 390px, temas claro/escuro e perfil VIEWER:
    consulta ao histórico permitida, edição bloqueada e sem rolagem horizontal
    da página no celular.
  - Nenhum erro de execução no navegador.

As gravações dos testes foram simuladas localmente, sem alterar dados reais.

## Publicação

| Registro | Resultado |
|---|---|
| Commit da aplicação | [`4f99155`](https://github.com/Raiz-Educacao-SA/calculadora-esforco/commit/4f99155) |
| Deployment | `dpl_4k94TGtYwzADygKkA1buKeUQq7U1` — Production / Ready |
| URL da versão | [transformacao-raiz-backlog-jp92xqlh7.vercel.app](https://transformacao-raiz-backlog-jp92xqlh7.vercel.app) |
| Backlog publicado | [Transformação Backlog](https://transformacao-raiz-backlog.vercel.app/backlog) |

Publicação de 16/09/2026: build de produção aprovado e nenhuma migration
pendente entre as 16 existentes. O endereço principal foi direcionado à versão
acima e sua inspeção confirmou Ready. `/login` retornou HTTP 200; `/backlog`
sem sessão retornou HTTP 307 para o login. A interface autenticada foi validada
localmente com APIs simuladas, conforme os cenários descritos acima.
