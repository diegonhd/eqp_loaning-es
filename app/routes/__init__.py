from flask import Blueprint, jsonify
from sqlalchemy import text

from app import db

main_bp = Blueprint("main", __name__)


@main_bp.route("/status")
def status():
    """Rota simples para confirmar que a aplicacao conecta no banco."""
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify(status="ok", banco="Conectado")
    except Exception as e:
        return jsonify(status="Erro", detalhe=str(e)), 500


# Importa os módulos de cada domínio para registrar as rotas no main_bp.
from app.routes import (  # noqa: E402, F401
    alunos,
    emprestimos,
    equipamentos,
    pendencias,
    tecnicos,
)
