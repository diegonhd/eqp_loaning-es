from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Tecnico
from app.routes import main_bp


@main_bp.route("/tecnicos", methods=["GET"])
def listar_tecnicos():
    tecnicos = Tecnico.query.all()
    return jsonify([
        {
            "id_tecnico": t.id_tecnico,
            "nome": t.nome,
            "matricula": t.matricula,
        }
        for t in tecnicos
    ])


@main_bp.route("/tecnicos", methods=["POST"])
def criar_tecnico():
    dados = request.get_json() or {}

    if not dados.get("nome") or not dados.get("matricula"):
        return jsonify(erro="Nome e matrícula são obrigatórios"), 400

    tecnico = Tecnico(
        nome=dados["nome"],
        matricula=dados["matricula"],
    )

    try:
        db.session.add(tecnico)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(erro="Matrícula já cadastrada."), 409

    return jsonify(id_tecnico=tecnico.id_tecnico), 201


@main_bp.route("/tecnicos/<int:id_tecnico>", methods=["GET"])
def obter_tecnico(id_tecnico):
    tecnico = Tecnico.query.get_or_404(id_tecnico)
    return jsonify(
        id_tecnico=tecnico.id_tecnico,
        nome=tecnico.nome,
        matricula=tecnico.matricula,
    )


@main_bp.route("/tecnicos/<int:id_tecnico>", methods=["PUT"])
def editar_tecnico(id_tecnico):
    tecnico = Tecnico.query.get_or_404(id_tecnico)
    dados = request.get_json() or {}

    tecnico.nome = dados.get("nome", tecnico.nome)
    tecnico.matricula = dados.get("matricula", tecnico.matricula)

    db.session.commit()
    return jsonify(mensagem="Técnico atualizado.")


@main_bp.route("/tecnicos/<int:id_tecnico>", methods=["DELETE"])
def excluir_tecnico(id_tecnico):
    tecnico = Tecnico.query.get_or_404(id_tecnico)
    db.session.delete(tecnico)
    db.session.commit()
    return jsonify(mensagem="Técnico excluído.")
