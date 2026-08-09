# 📋 Registro de Decisões do Projeto

Documento que consolida as **decisões assumidas** no desenvolvimento, as **perguntas ao cliente**, os **critérios de aceite** executáveis e as **decisões da ferramenta de IA**.

---

## Seção 1 — Decisões assumidas

Cada decisão segue o padrão: o que **o pedido não especifica** (X) → o que **assumimos** (Y) → **o que aconteceria** se o cliente esperasse o contrário (Z).

| # | O pedido não especifica | Assumimos | Se o cliente esperasse... | Impacto |
|---|---|---|---|---|
| 1 | A distinção entre o tipo de equipamento e o exemplar físico | Duas entidades: **Equipamento** (catálogo) e **UnidadeEquipamento** (exemplar com `numero_patrimonio` único); o empréstimo referencia a **unidade** | Controlar apenas "multímetros" sem patrimônio individual | Eliminar `unidade_equipamento`, mover `status`/`numero_patrimonio` para `equipamento` e trocar a FK de `emprestimo.id_unidade_equipamento` por `id_equipamento` — invalidando todos os registros de empréstimo existentes |
| 2 | Como o técnico é identificado | Tabela `Tecnico` (`id`, `nome`, `matricula`); o operador escolhe na tela, **sem login** | Conta/login por técnico | Adicionar senha e sessão em `Tecnico`, autenticar todas as rotas de escrita e criar tela de login no frontend |
| 3 | O prazo de devolução | Campo `dias_prazo` informado pelo operador, **default 7** | Prazo fixo ou por tipo de equipamento | Remover o input `dias_prazo` e fixar uma constante (ou adicionar coluna `prazo_padrao` em `equipamento`), exigindo migração e ajuste no cálculo de atraso |
| 4 | O que é uma "pendência" | Tabela própria com tipos `ATRASO \| DANO \| MULTA \| OUTRO` e status `ABERTA \| RESOLVIDA`, permitindo **várias por aluno** | Um único flag "bloqueado" no aluno | Remover a tabela e o relacionamento, adicionar `bloqueado` em `aluno` e perder o histórico/tipo |
| 5 | Como o relatório de atrasos é gerado | `esta_atrasado` deriva de `data_hora_prevista_devolucao < agora`, **sem coluna persistida** | Congelar o atraso num campo | Adicionar coluna em `emprestimo` + migração + lógica de snapshot |
| 6 | Se atraso vira pendência sozinho | `_sincronizar_pendencias_atraso()` cria pendência `ATRASO` aberta para **cada vencido** | Só pendências lançadas manualmente bloqueiam | Remover a sincronização e bloquear apenas por empréstimo vencido (ou não bloquear) |
| 7 | O destino das pendências na devolução | **Apenas** as pendências `ATRASO` do empréstimo viram `RESOLVIDA`; `DANO`/`MULTA`/`OUTRO` permanecem abertas até avaliação manual | Todas as abertas fossem resolvidas automaticamente | Resolver todas as pendências abertas na devolução, sem exigir avaliação do técnico |
| 8 | Quem pode operar o sistema | Qualquer pessoa com a URL (**acesso aberto**) | Só técnicos autorizados | Login, sessão e checagem de papel em todas as mutações + tela de login |
| 9 | A forma da interface | Uma página HTML consumindo a API JSON | Portais separados por papel | Novas rotas/templates e divisão de permissões |
| 10 | O fuso horário | Armazenar `datetime.utcnow()` e exibir via `toLocaleString` do navegador | Horário local do laboratório consistente | Armazenar com fuso explícito e converter na exibição |
| 11 | O formato dos status | Strings PT-BR em maiúsculas: `DISPONIVEL`, `EMPRESTADO`, `EM_MANUTENCAO`, `DANIFICADO`, `INATIVO` | Códigos numéricos ou ícones | Camada de mapeamento na API e no frontend |
| 12 | Como cancelar um empréstimo | `DELETE` remove o registro e libera a unidade (exclusão física) | Manter histórico (cancelamento lógico) | Soft-delete com status `CANCELADO` |
| 13 | Quem recebe a devolução | A devolução pode ser registrada **sem** informar o técnico | Técnico de devolução obrigatório | Tornar a coluna `NOT NULL` e exigir o campo na tela |
| 14 | Rejeitar prazo inválido | Validar `dias_prazo > 0`, rejeitando 0/negativos com `400` | Aceitar qualquer inteiro (0/negativo) | Empréstimos nasceriam já vencidos, distorcendo o relatório de atrasos |
| 15 | Se o histórico de devoluções é consultável | `GET /emprestimos` é um **log completo** (inclui devolvidos, com `status` e `data_hora_devolucao`); apenas `/relatorios/atrasados` restringe a vencidos ativos | Um endpoint só de ativos | Reintroduzir filtro `?status=EM_ANDAMENTO` no listar e ocultar devolvidos na UI |

---

## Seção 2 — Perguntas ao cliente

> Exatamente 3 perguntas de maior impacto, cada uma com o que muda em cada resposta.

### Q1 — Acesso

**"Quem deve operar o sistema: qualquer pessoa do laboratório ou só técnicos autenticados?"**

- **R. aberto (atual):** nada muda.
- **R. só técnicos com login:** adiciona autenticação, senha, sessão e proteção em todas as rotas de escrita + tela de login.
- **Impacto:** sistêmico (quase todas as rotas).

### Q2 — Destino das pendências na devolução

**"Ao devolver, pendências de dano/multa devem ser resolvidas automaticamente ou ficar abertas para avaliação?"**

- **R. manter abertas (atual):** mantém o comportamento atual — `devolver_emprestimo` resolve apenas `ATRASO`; `DANO`/`MULTA`/`OUTRO` exigem resolução manual.
- **R. auto-resolver:** mudaria `devolver_emprestimo` para resolver todas as pendências abertas do empréstimo de uma vez.
- **Impacto:** na regra central de bloqueio (aluno com `DANO` aberto continua bloqueado).

### Q3 — Prazo de devolução

**"O prazo é fixo, definido por equipamento ou escolhido pelo técnico no momento?"**

- **R. na hora (default 7) (atual):** mantém o comportamento atual.
- **R. fixo:** remove o input, usa uma constante.
- **R. por equipamento:** coluna nova em `equipamento` + migração.
- **Impacto:** no schema e no cálculo de atraso que alimenta o relatório.

### Q4 — Equipamento perdido

**"Como representar um equipamento que nunca é devolvido?"**

- **R. fica atrasado (atual):** mantém o comportamento atual.
- **R. status `PERDIDO`/`BAIXA`:** novo status + fluxo + relatório.
- **Impacto:** schema e regra de negócio.

---

## Seção 3 — Critérios de aceite

> Escritos como **entrada → resultado esperado**, sem adjetivos. O avaliador pode semear os dados via API antes (`POST /alunos`, `POST /equipamentos`, `POST /unidades-equipamento`, `POST /tecnicos`).

### C1 — Bloqueio por pendência

- **Entrada:** aluno com uma pendência `ABERTA` + unidade `DISPONIVEL`; enviar `POST /emprestimos` com `{id_aluno, id_unidade_equipamento, id_tecnico_retirada}`.
- **Resultado esperado:** resposta HTTP **403** com corpo contendo *"pendência"* e **nenhum** novo registro em `GET /emprestimos`.

### C2 — Devolução libera a unidade

- **Entrada:** empréstimo ativo em que a unidade está `EMPRESTADO`; enviar `PUT /emprestimos/<id>/devolucao` com `{}`.
- **Resultado esperado:** resposta **200**; `GET /unidades-equipamento` mostra a unidade com `status: "DISPONIVEL"`; `GET /emprestimos` lista o registro com `status: "DEVOLVIDO"` e `data_hora_devolucao` preenchida (log).

### C3 — Relatório de atrasados

- **Entrada:** empréstimo ativo com `data_hora_prevista_devolucao` no passado (criado com `dias_prazo: -2`); enviar `GET /relatorios/atrasados`.
- **Resultado esperado:** resposta é uma **lista** contendo um objeto com `id_emprestimo` igual ao do empréstimo e `dias_atraso ≥ 1`.

---

## Seção 4 — Decisões da ferramenta de IA

> Decisões tomadas pela IA no desenvolvimento, com a justificativa e os riscos de cada uma.

### D1 — Auto-criação de pendência `ATRASO` + auto-resolução na devolução

**Implementação:** `_sincronizar_pendencias_atraso` e `devolver_emprestimo` (`app/routes/emprestimos.py`).

- **O que foi decidido:** materializar atraso como `Pendencia` persistida e resolver as pendências `ATRASO` do empréstimo ao devolver.
- **Por que é plausível:** uniformiza o bloqueio "aluno com pendência" e dá registro durável.
- **Por que pode estar inadequada:** duplica a lógica de atraso (o relatório consulta os empréstimos diretamente e ainda sincroniza pendências); e um `GET` (`/relatorios/atrasados`) altera o banco ao chamar a sincronização.

### D2 — Prazo padrão de 7 dias

**Implementação:** `dias_prazo` em `criar_emprestimo` (`app/routes/emprestimos.py`).

- **O que foi decidido:** um número mágico não solicitado.
- **Por que é plausível:** default razoável.
- **Por que pode estar inadequada:** se a política real do laboratório diferir, todos os empréstimos nascem com prazo errado, distorcendo o relatório de atrasos.

### D3 — Validação dos IDs de técnico e exclusões protegidas

**Implementação:** rotas de empréstimo e exclusões de entidades (`app/routes/emprestimos.py`, `app/routes/equipamentos.py`, `app/routes/alunos.py`, `app/routes/tecnicos.py`).

- **O que foi decidido:** validar também `id_tecnico_retirada` e `id_tecnico_devolucao` com `get_or_404`, e proteger a exclusão de entidades com vínculos retornando `409` em vez de deixar o `IntegrityError` vazar como erro 500.
- **Por que é plausível:** mantém o contrato de erros `{"erro": ...}` e a promessa de "simples de usar".
- **Por que pode estar inadequada:** originalmente a validação dos técnicos foi omitida (o técnico era tratado como entidade secundária), gerando HTTP 500 para ID digitado errado; a correção adotou `get_or_404`, que devolve `404` genérico — informativo, mas não aponta qual campo específico está errado.


## Seção 5: Registro de Tempo:
- **Horas escrevendo e documentando o código:** aproximadamente 3h
- **Horas gerando código:** aproximadamente 7h (incluindo parte de debug e fiscalização das mudanças estruturais).
- **Horas decidindo o que o sistema deveria fazer:** entre 1h e 2h

## Seção 6: Declaração de uso de IA:
- Uso de Claude Code como agente de código; Gemini e Chatgpt para dúvidas gerais sobre o funcionamento de alguns recursos do framework e sobre as vantagens e desvantagens de algumas das nossas ideias de implementação.
- Por questões de teste, pagamos $5 para utilizar o Claude Code e verificamos que o agente realmente é muito eficiente em entender as ideias de estruturação, em entender o estado atual do sistema e é muito cuidadoso no projeto de novas features (tanto as que ele mesmo decide fazer, quanto as que nós pedimos). Além disso, importante ressaltar que, apesar de não termos de fato feito-lo orquestrar vários agentes — o único recurso não-nativo utilizado foi um agente de "code-review" (expresso em `.claude`) — que o potencializaria ainda mais em uma janela de contexto ainda menor, a experiência foi bem satisfatória em questão de tempo de trabalho.