  Seção 1 — Decisões assumidas
  1. Separação catálogo × patrimônio. O pedido não especifica X: distingue o tipo de equipamento do exemplar físico. Assumimos Y: duas entidades — Equipamento (catálogo) e UnidadeEquipamento (exemplar com numero_patrimonio único), e o empréstimo referencia a unidade. Se o cliente esperasse Z: controlar apenas "multímetros" sem patrimônio individual, o impacto seria: eliminar unidade_equipamento, mover status/numero_patrimonio para equipamento e trocar a FK de emprestimo.id_unidade_equipamento por id_equipamento — invalidando todos os registros de empréstimo existentes.
  2. Técnico como entidade própria. O pedido não especifica X: como o técnico é identificado. Assumimos Y: tabela Tecnico (id, nome, matricula) e operador escolhe na tela, sem login. Se o cliente esperasse Z: conta/login por técnico, o impacto seria: adicionar senha e sessão em Tecnico, autenticar todas as rotas de escrita e criar tela de login no frontend.
  3. Prazo de devolução com default 7 dias. O pedido não especifica X: o prazo de devolução. Assumimos Y: campo dias_prazo informado pelo operador, default 7. Se o cliente esperasse Z: prazo fixo ou por tipo de equipamento, o impacto seria: remover o input dias_prazo e fixar constante (ou adicionar coluna prazo_padrao em equipamento), exigindo migração e ajuste no cálculo de atraso.
  4. Pendência como entidade, não enum. O pedido não especifica X: o que é uma "pendência". Assumimos Y: tabela própria com tipos ATRASO|DANO|MULTA|OUTRO e
  status ABERTA|RESOLVIDA, permitindo várias por aluno. Se o cliente esperasse Z: um único flag "bloqueado" no aluno, o impacto seria: remover a tabela e o relacionamento, adicionar bloqueado em aluno e perder o histórico/tipo.
  5. Atraso calculado na hora, não persistido. O pedido não especifica X: como o relatório de atrasos é gerado. Assumimos Y: esta_atrasado deriva de
  data_hora_prevista_devolucao < agora, sem coluna. Se o cliente esperasse Z: congelar o atraso num campo, o impacto seria: adicionar coluna em emprestimo + migração + lógica de snapshot.
  6. Atraso gera pendência ATRASO automaticamente. O pedido não especifica X: se atraso vira pendência sozinho. Assumimos Y: _sincronizar_pendencias_atraso()
  cria pendência ATRASO aberta para cada vencido. Se o cliente esperasse Z: só pendências lançadas manualmente bloqueiam, o impacto seria: remover a sincronização e bloquear apenas por empréstimo vencido (ou não bloquear).
  7. Devolução resolve todas as pendências abertas. O pedido não especifica X: destino das pendências na devolução. Assumimos Y: todas as abertas do empréstimo viram RESOLVIDA. Se o cliente esperasse Z: DANO/MULTA continuarem abertas até avaliação, o impacto seria: filtrar por tipo na devolução e só resolver ATRASO.
  8. Sem autenticação / acesso aberto. O pedido não especifica X: quem pode operar. Assumimos Y: qualquer pessoa com a URL. Se o cliente esperasse Z: só técnicos autorizados, o impacto seria: login, sessão e checagem de papel em todas as mutações + tela de login.
  9. Interface única (dashboard). O pedido não especifica X: a forma da interface. Assumimos Y: uma página HTML consumindo a API JSON. Se o cliente esperasse Z: portais separados por papel, o impacto seria: novas rotas/templates e divisão de permissões.
  10. Datas em UTC. O pedido não especifica X: fuso horário. Assumimos Y: armazenar datetime.utcnow() e exibir via toLocaleString do navegador. Se o cliente esperasse Z: horário local do laboratório consistente, o impacto seria: armazenar com fuso explícito e converter na exibição.
  11. Status como strings PT-BR em maiúsculas. O pedido não especifica X: formato dos status. Assumimos Y: DISPONIVEL, EMPRESTADO, EM_MANUTENCAO, DANIFICADO, INATIVO como strings. Se o cliente esperasse Z: códigos numéricos ou ícones, o impacto seria: camada de mapeamento na API e no frontend.
  12. Empréstimo em andamento pode ser excluído fisicamente. O pedido não especifica X: como cancelar um empréstimo. Assumimos Y: DELETE remove o registro e libera a unidade. Se o cliente esperasse Z: manter histórico (cancelamento lógico), o impacto seria: soft-delete com status CANCELADO.
  13. Técnico de devolução opcional. O pedido não especifica X: quem recebe a devolução. Assumimos Y: a devolução pode ser registrada sem informar o técnico. Se o cliente esperasse Z: obrigatório, o impacto seria: tornar a coluna NOT NULL e exigir o campo na tela.
  14. dias_prazo sem validação de valor. O pedido não especifica X: rejeitar prazo inválido. Assumimos Y: aceitar qualquer inteiro (0/negativo). Se o cliente esperasse Z: rejeitar, o impacto seria: validar dias_prazo > 0 no POST e no frontend.
  15. GET /emprestimos retorna só os ativos. O pedido não especifica X: se o histórico de devoluções é consultável. Assumimos Y: "o que está emprestado" = não devolvidos, sem endpoint de histórico. Se o cliente esperasse Z: consultar passado, o impacto seria: novo endpoint/filtro e nova tabela na UI.

  Seção 2 — Perguntas ao cliente (exatamente 3, por impacto)

  - Q1 — Acesso. "Quem deve operar o sistema: qualquer pessoa do laboratório ou só técnicos autenticados?" → R. aberto: nada muda. R. só técnicos com login: adiciona autenticação, senha, sessão e proteção em todas as rotas de escrita + tela de login. Impacto: sistêmico (quase todas as rotas).
  - Q2 — Destino das pendências na devolução. "Ao devolver, pendências de dano/multa devem ser resolvidas automaticamente ou ficar abertas para avaliação?" → R. auto-resolver: atual. R. manter abertas: muda devolver_emprestimo para só resolver ATRASO; dano exige fluxo manual de resolução. Impacto: na regra central de bloqueio (aluno com DANO aberto continua bloqueado).
  - Q3 — Prazo de devolução. "O prazo é fixo, definido por equipamento ou escolhido pelo técnico no momento?" → R. na hora (default 7): atual. R. fixo: remove input, constante. R. por equipamento: coluna nova em equipamento + migração. Impacto: no schema e no cálculo de atraso que alimenta o relatório.
  - Q4 — Equipamento perdido. "Como representar um equipamento que nunca é devolvido?" → R. fica atrasado: atual. R. status PERDIDO/BAIXA: novo status + fluxo + relatório. Impacto: schema e regra de negócio.

  Seção 3 — Critérios de aceite (exatamente 3, executáveis)

  Escritos como "entrada → resultado esperado", sem adjetivos. O avaliador pode semear os dados via API antes (POST /alunos, POST /equipamentos, POST /unidades-equipamento, POST /tecnicos).

  1. Bloqueio por pendência. Dado um aluno com uma pendência ABERTA e uma unidade DISPONIVEL, ao enviar POST /emprestimos com {id_aluno,
  id_unidade_equipamento, id_tecnico_retirada} → resposta HTTP 403 com corpo contendo "pendência" e nenhum novo registro aparece em GET /emprestimos.
  2. Devolução libera a unidade. Dado um empréstimo ativo em que a unidade está EMPRESTADO, ao enviar PUT /emprestimos/<id>/devolucao com {} → resposta 200; GET /unidades-equipamento mostra essa unidade com status: "DISPONIVEL"; e o id não aparece mais em GET /emprestimos.
  3. Relatório de atrasados. Dado um empréstimo ativo com data_hora_prevista_devolucao no passado (criado com dias_prazo: -2), ao enviar GET
  /relatorios/atrasados → resposta é uma lista contendo um objeto com id_emprestimo igual ao do empréstimo e dias_atraso ≥ 1.

  Seção 4 — Decisões da ferramenta de IA (mín. 1; recomendadas 3)

  1. Auto-criação de pendência ATRASO + auto-resolução de todas as pendências na devolução (_sincronizar_pendencias_atraso, emprestimos.py:10 e
  devolver_emprestimo, linha 129). O que foi decidido: materializar atraso como Pendencia persistida e resolver tudo ao devolver. Por que é plausível: uniformiza o bloqueio "aluno com pendência" e dá registro durável. Por que pode estar inadequada: duplica a lógica de atraso (o relatório consulta os empréstimos diretamente e ainda sincroniza pendências); resolver DANO/MULTA na devolução assume que devolver = fim de qualquer pendência, decisão que o cliente não tomou; e um GET (/relatorios/atrasados) altera o banco ao chamar a sincronização.
  2. Prazo padrão de 7 dias (dias_prazo, emprestimos.py:74). O que foi decidido: um número mágico não solicitado. Por que é plausível: default razoável. Por que pode estar inadequada: se a política real do lab diferir, todos os empréstimos nascem com prazo errado, distorcendo o relatório atrasos.
  3. Tratamento de erro inconsistente para o técnico. O que foi decidido: validar id_aluno/id_unidade com get_or_404, mas aceitar
  id_tecnico_retirada/id_tecnico_devolucao sem validação (e excluir entidades com filhos sem tratar IntegrityError). Por que é plausível: o técnico foi tratado como entidade secundária no fluxo. Por que pode estar inadequada: id de técnico digitado errado gera HTTP 500 em vez de {"erro": ...}, quebrando o
  contrato de erros e a promessa de "simples de usar".
