# Projeto de Estrutura de Dados — Controle das Ferramentas de um Laboratório

Sistema para controlar o empréstimo de ferramentas de um laboratório universitário. Cada aluno pode retirar equipamentos por um prazo, devolvê-los ao técnico e acumular pendências (`ATRASO`, `DANO`, `MULTA`, `OUTRO`) que bloqueiam novas retiradas enquanto estiverem abertas.

A aplicação é uma **API REST em Flask** + um **dashboard único em JavaScript puro** que consome essa API. Todo o código — comentários, mensagens e valores de status — está em **pt-BR**.

## Funcionalidades

- **Catálogo × patrimônio**: cada modelo de equipamento (ex.: *multímetro*) possui N unidades físicas identificadas por número de patrimônio, e o inventário é controlado por unidade.
- **Empréstimos com prazo**: retirada registrada pelo técnico, prazo de devolução configurável (padrão 7 dias) e devolução que libera a unidade automaticamente.
- **Pendências por aluno**: uma mesma pendência (atraso, dano, multa...) pode existir várias vezes e tipos diferentes ao mesmo tempo.
- **Atraso automático**: empréstimos vencidos viram pendência `ATRASO` automaticamente, sem ação do técnico.
- **Relatório de atrasados**: consulta para o técnico listar todos os empréstimos vencidos no momento, com os dias de atraso.
- **Dashboard único**: interface web que lista, cria, edita e exclui tudo via API, sem recarregar a página.

## Stack

| Camada | Tecnologia |
|---|---|
| Backend | Flask 3, Flask-SQLAlchemy, Flask-Migrate (Alembic) |
| Banco de dados | PostgreSQL (`psycopg2-binary`) |
| Configuração | `python-dotenv` (arquivo `.env`) |
| Frontend | HTML + Bootstrap (CDN) + JavaScript puro |

## Como executar em outra máquina

> Guia completo para rodar o sistema **do zero em qualquer máquina**. Pressupõe apenas **Python 3.x** e **PostgreSQL** instalados e em execução. Todas as etapas são feitas no terminal.

### 1. Obter o código

Clone o repositório e entre no diretório:

```bash
git clone https://github.com/diegonhd/eqp_loaning-es/
cd eqp_loaning-es
```

### 2. Criar o banco de dados

O sistema usa um banco PostgreSQL chamado `laboratorio`. Se ele ainda não existir, crie-o. O nome pode ser outro, desde que a `DATABASE_URL` do passo 5 aponte para ele.

**Com `psql` (terminal):**

```bash
psql -U postgres -c "CREATE DATABASE laboratorio;"
```

**Ou pelo pgAdmin:** clique com o botão direito em *Databases* → *Create* → *Database* → informe `laboratorio` como nome e salve.

### 3. Criar e ativar o ambiente virtual (recomendado)

```bash
python -m venv venv
```

Ative-o:

```bash
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux / macOS
```

### 4. Instalar as dependências

```bash
pip install -r requirements.txt
```

### 5. Configurar o ambiente

Crie o arquivo `.env` a partir do modelo:

```bash
copy .env.example .env       # Windows
# ou
cp .env.example .env         # Linux / macOS
```

Abra o `.env` e ajuste a `DATABASE_URL` para a conexão do seu PostgreSQL, substituindo `usuario` e `senha` pelas suas credenciais:

```
DATABASE_URL=postgresql://usuario:senha@localhost:5432/laboratorio
```

`SECRET_KEY` é opcional e assume um valor de desenvolvimento por padrão.

### 6. Aplicar as migrações do banco

```bash
flask --app run db upgrade
```

Isso cria as tabelas (e o histórico de versões do Alembic) no banco.

### 7. Executar o servidor

```bash
python run.py
```

O servidor sobe em `http://127.0.0.1:5000` (modo debug, sem reloader).

### Sanity check

Abra `http://127.0.0.1:5000/status` — deve retornar:

```json
{ "status": "ok", "banco": "Conectado" }
```

### Migrações (quando o modelo de dados mudar)

```bash
flask --app run db migrate -m "descrição da mudança"   # gera migração
flask --app run db upgrade                             # aplica migração
flask --app run db downgrade                           # desfaz a última
```

---

## Referência técnica

### Estrutura do projeto

```
projeto1es/
├── app/
│   ├── __init__.py            # create_app(), banco, migrações e handler global de erros
│   ├── models.py              # Entidades SQLAlchemy
│   ├── routes/                # API JSON, um módulo por domínio
│   │   ├── __init__.py        # main_bp + rota /status
│   │   ├── alunos.py
│   │   ├── equipamentos.py
│   │   ├── tecnicos.py
│   │   ├── emprestimos.py
│   │   └── pendencias.py
│   ├── views.py               # Página única (dashboard) em "/" e "/front"
│   ├── templates/
│   │   └── dashboard.html
│   └── static/
│       ├── css/dashboard.css
│       └── js/dashboard.js
├── migrations/                # Histórico e configuração do Alembic
├── run.py                     # Ponto de entrada do servidor
├── requirements.txt
└── .env.example
```

### Modelo de dados

```
Equipamento (catálogo)  1 ──── *  UnidadeEquipamento (patrimônio)
Aluno                    1 ──── *  Emprestimo        * ──── 1  UnidadeEquipamento
Aluno                    1 ──── *  Pendencia         * ──── 1  Emprestimo (opcional)
Tecnico (retirada)       1 ──── *  Emprestimo
Tecnico (devolução)      1 ──── *  Emprestimo        (id_tecnico_devolucao é opcional)
```

| Entidade | Descrição | Campos principais |
|---|---|---|
| `Equipamento` | Item do catálogo (ex.: *multímetro*) | `nome`, `descricao`, `categoria` |
| `UnidadeEquipamento` | Exemplar físico do catálogo | `numero_patrimonio` (único), `status` |
| `Aluno` | Quem retira equipamentos | `nome`, `matricula` (única), `email`, `telefone`, `status` |
| `Tecnico` | Quem opera retiradas e devoluções | `nome`, `matricula` (única) |
| `Emprestimo` | Retirada de uma unidade por um aluno | `data_hora_prevista_devolucao`, `data_hora_devolucao`, `status`, `observacoes` |
| `Pendencia` | Bloqueio/manifestação sobre um aluno | `tipo`, `descricao`, `status` |

**Valores de status**

| Campo | Valores possíveis |
|---|---|
| `Aluno.status` | `ATIVO` |
| `UnidadeEquipamento.status` | `DISPONIVEL`, `EMPRESTADO` (automático), `EM_MANUTENCAO`, `DANIFICADO`, `INATIVO` |
| `Emprestimo.status` | `EM_ANDAMENTO`, `DEVOLVIDO` |
| `Pendencia.tipo` | `ATRASO`, `DANO`, `MULTA`, `OUTRO` |
| `Pendencia.status` | `ABERTA`, `RESOLVIDA` |

> O atraso de um empréstimo **não é persistido**: ele é calculado na hora pela propriedade `Emprestimo.esta_atrasado`.

### API

Toda a API devolve JSON. Erros seguem o padrão `{"erro": "..."}` com status 4xx; o handler global converte até exceções inesperadas em JSON 500.

**Alunos**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/alunos` | Lista alunos |
| GET | `/alunos/<id_aluno>` | Obtém um aluno |
| POST | `/alunos` | Cria aluno (`nome`, `matricula` obrigatórios) |
| PUT | `/alunos/<id_aluno>` | Edita aluno |
| DELETE | `/alunos/<id_aluno>` | Exclui (bloqueado se houver empréstimos ou pendências) |

**Equipamentos e unidades**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/equipamentos` | Lista catálogo com `quantidade_total` e `quantidade_disponivel` |
| GET | `/equipamentos/<id_equipamento>` | Obtém um item do catálogo |
| POST | `/equipamentos` | Cria item (`nome` obrigatório) |
| PUT | `/equipamentos/<id_equipamento>` | Edita item |
| DELETE | `/equipamentos/<id_equipamento>` | Exclui (bloqueado se tiver unidades) |
| GET | `/unidades-equipamento` | Lista unidades físicas |
| GET | `/unidades-equipamento/<id_unidade_equipamento>` | Obtém uma unidade |
| POST | `/unidades-equipamento` | Cria unidade (`id_equipamento` e `numero_patrimonio` obrigatórios) |
| PUT | `/unidades-equipamento/<id_unidade_equipamento>` | Edita unidade (status de unidade com empréstimo ativo é bloqueado) |
| DELETE | `/unidades-equipamento/<id_unidade_equipamento>` | Exclui (bloqueado se tiver empréstimos) |

**Técnicos**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/tecnicos` | Lista técnicos |
| GET | `/tecnicos/<id_tecnico>` | Obtém um técnico |
| POST | `/tecnicos` | Cria técnico (`nome`, `matricula` obrigatórios) |
| PUT | `/tecnicos/<id_tecnico>` | Edita técnico |
| DELETE | `/tecnicos/<id_tecnico>` | Exclui (bloqueado se tiver empréstimos) |

**Empréstimos**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/emprestimos` | Lista todos os empréstimos (**log completo**, incluindo devolvidos), com `status` e flag `atrasado` |
| POST | `/emprestimos` | Cria empréstimo (`id_aluno`, `id_unidade_equipamento`, `id_tecnico_retirada`; `dias_prazo` opcional, padrão 7) |
| PUT | `/emprestimos/<id_emprestimo>/devolucao` | Registra devolução (libera a unidade) |
| PUT | `/emprestimos/<id_emprestimo>` | Edita prazo de devolução ou observações |
| DELETE | `/emprestimos/<id_emprestimo>` | Exclui empréstimo em andamento (devolvidos e com pendências são bloqueados) |

**Pendências e relatórios**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/pendencias` | Lista pendências |
| GET | `/pendencias/<id_pendencia>` | Obtém uma pendência |
| POST | `/pendencias` | Cria pendência (`id_aluno`, `tipo` obrigatórios) |
| PUT | `/pendencias/<id_pendencia>` | Edita pendência (ex.: resolver manualmente) |
| DELETE | `/pendencias/<id_pendencia>` | Exclui pendência |
| GET | `/relatorios/atrasados` | Lista empréstimos vencidos com `dias_atraso` |
| GET | `/status` | Health check da conexão com o banco |

### Regras de negócio

- **Criação de empréstimo** — exige que o aluno não tenha pendência aberta nem empréstimo atrasado, e que a unidade esteja `DISPONIVEL`. Se aprovado, a unidade passa a `EMPRESTADO`.
- **Atraso automático** — `_sincronizar_pendencias_atraso()` é executada antes de qualquer checagem de pendência e cria uma `Pendencia` `ATRASO` para cada empréstimo vencido que ainda não tenha uma.
- **Devolução** — marca o empréstimo como `DEVOLVIDO`, coloca a unidade de volta em `DISPONIVEL` e resolve apenas as pendências `ATRASO` do empréstimo. Pendências de `DANO`/`MULTA`/`OUTRO` permanecem abertas até resolução manual pelo técnico.
- **Exclusão protegida** — entidades com vínculos (empréstimos, pendências, unidades) retornam `409` em vez de quebrar a integridade do banco.

### Frontend

A única interface é o dashboard em `app/templates/dashboard.html`, servido em `/` (e em `/front` como atalho de compatibilidade). Ele renderiza tabelas e modais **inteiramente a partir da API JSON** — para adicionar uma capacidade nova no backend, é preciso também registrá-la em `app/static/js/dashboard.js` (registro de entidade, renderização de tabela e campos de formulário em `campos()`).

## Documentação de decisões

As decisões assumidas durante o desenvolvimento — incluindo as perguntas ao cliente, os critérios de aceite e as decisões da ferramenta de IA — estão registradas em **[DECISÕES.md](./DECISÕES.md)**.
