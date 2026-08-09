# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Flask app that controls equipment loans for a university lab ("Controle das Ferramentas de um Laboratório"). The entire codebase is written in Portuguese (pt-BR) — comments, API messages, and entity/status values. Match that style in new code.

## Commands

- Install dependencies: `pip install -r requirements.txt`
- Set up config: copy `.env.example` to `.env` and set `DATABASE_URL` to the PostgreSQL connection string. Optional `SECRET_KEY` defaults to a dev value.
- Run the dev server: `python run.py` (binds `127.0.0.1:5000`, debug on, reloader off)
- Sanity check: open `http://127.0.0.1:5000/status` — it returns `{"status": "ok", "banco": "Conectado"}` when the app reaches the DB.
- DB migrations (Flask-Migrate/Alembic):
  - `flask --app run db upgrade` — apply pending migrations
  - `flask --app run db migrate -m "descrição"` — generate a migration from model changes
  - `flask --app run db downgrade` — roll back one step

There is no test suite and no linter configured.

## Architecture

- **App factory**: `create_app()` in `app/__init__.py`. Config is read from environment (`.env`) with local dev defaults. `db` and `migrate` are module-level instances initialized inside the factory; models are imported there so Flask-Migrate sees them.
- **Two blueprints**:
  - `main_bp` (package `app/routes/`, one module per domain): the JSON REST API. Every error returns `{"erro": "..."}` with a 4xx status; success payloads are plain JSON. Status strings use uppercase-underscore values (`ATIVO`, `DISPONIVEL`, `EMPRESTADO`, `EM_ANDAMENTO`, `DEVOLVIDO`, `ABERTA`, `RESOLVIDA`, ...).
  - `views_bp` (`app/views.py`): serves the single HTML page at `/` (also at `/front` as a compatibility shortcut).
- **Frontend**: a single dashboard (`app/templates/dashboard.html`) using vanilla JS + Bootstrap from CDN, with `app/static/css/dashboard.css` and `app/static/js/dashboard.js`. It renders tables and modals entirely from the JSON API, so new backend capabilities must be wired into `dashboard.js` (entity registry, table rendering, and form-field builders in `campos()`).
- **Data model** (`app/models.py`, PostgreSQL via SQLAlchemy):
  - `Equipamento` (catalog item, e.g. "multímetro") → many `UnidadeEquipamento` (physical assets identified by `numero_patrimonio`). Inventory is tracked per unit, not per model — this separation is the central design decision.
  - `Aluno` → many `Emprestimo` and `Pendencia`. `Tecnico` has two FKs on `Emprestimo` (`id_tecnico_retirada` / `id_tecnico_devolucao`).
  - `Pendencia` is a standalone entity rather than a status enum so a student can hold several open pendências of different types at once (`ATRASO | DANO | MULTA | OUTRO`).

## Business rules (in `app/routes/emprestimos.py`)

- Creating a loan (`criar_emprestimo`) requires: the student has no open pendência or overdue loan (`_aluno_tem_pendencia`), and the unit is `DISPONIVEL` (it is then set to `EMPRESTADO`).
- `_sincronizar_pendencias_atraso()` is called before any loan/overdue check and auto-creates an `ATRASO` `Pendencia` for every overdue loan that doesn't already have one.
- Return (`PUT /emprestimos/<id>/devolucao`) marks the loan `DEVOLVIDO`, puts the unit back to `DISPONIVEL`, and resolves all open pendências tied to that loan.
- Lateness is computed on the fly via the `Emprestimo.esta_atrasado` property — it is never persisted.
