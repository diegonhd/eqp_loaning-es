import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
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

    return app
