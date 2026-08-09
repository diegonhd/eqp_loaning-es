import os
from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv

# Carrega as variaveis do arquivo .env (ex: DATABASE_URL)
load_dotenv()

# Instancias globais, inicializadas dentro de create_app()
db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        "postgresql://usuario:senha@localhost:5432/laboratorio",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "chave-de-desenvolvimento-trocar-em-producao")

    db.init_app(app)

    # Importa os models para que o Flask-Migrate os enxergue
    from app import models
    migrate.init_app(app, db)

    # Registra as rotas definidas em app/routes.py (API JSON)
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    # Registra as paginas HTML definidas em app/views.py
    from app.views import views_bp
    app.register_blueprint(views_bp)

    # Handler global de erro: toda excecao nao tratada vira JSON {"erro": ...}.
    # Sem isso, o Flask devolveria uma pagina HTML e o frontend exibiria "Erro 500".
    @app.errorhandler(Exception)
    def tratar_erro(e):
        db.session.rollback()
        if isinstance(e, HTTPException):
            # Preserva o status real (404, 405, 400...) com descricao em JSON.
            return jsonify(erro=e.description), e.code or 500
        # Erro inesperado: loga o traceback completo e devolve mensagem segura.
        app.logger.error("Erro nao tratado na API", exc_info=True)
        return jsonify(erro="Erro interno do servidor."), 500

    return app
