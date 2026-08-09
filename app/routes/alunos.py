from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Aluno
from app.routes import main_bp


@main_bp.route("/alunos", methods=["GET"])
def listar_alunos():
    alunos = Aluno.query.all()
    return jsonify([
        {
            "id_aluno": a.id_aluno,
            "nome": a.nome,
            "matricula": a.matricula,
            "email": a.email,
            "telefone": a.telefone,
            "status": a.status,
        }
        for a in alunos
    ])


@main_bp.route("/alunos/<int:id_aluno>", methods=["GET"])
def obter_aluno(id_aluno):
    aluno = Aluno.query.get_or_404(id_aluno)
    return jsonify(
        id_aluno=aluno.id_aluno,
        nome=aluno.nome,
        matricula=aluno.matricula,
        email=aluno.email,
        telefone=aluno.telefone,
        status=aluno.status,
    )


@main_bp.route("/alunos", methods=["POST"])
def criar_aluno():
    dados = request.get_json() or {}

    if not dados.get("nome") or not dados.get("matricula"):
        return jsonify(erro="Nome e matrícula são obrigatórios"), 400

    aluno = Aluno(
        nome=dados["nome"],
        matricula=dados["matricula"],
        email=dados.get("email"),
        telefone=dados.get("telefone"),
        status=dados.get("status", "ATIVO"),
    )

    try:
        db.session.add(aluno)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(erro="Matricula já cadastrada"), 409

    return jsonify(id_aluno=aluno.id_aluno), 201


@main_bp.route("/alunos/<int:id_aluno>", methods=["PUT"])
def editar_aluno(id_aluno):
    aluno = Aluno.query.get_or_404(id_aluno)
    dados = request.get_json() or {}

    aluno.nome = dados.get("nome", aluno.nome)
    aluno.email = dados.get("email", aluno.email)
    aluno.telefone = dados.get("telefone", aluno.telefone)
    aluno.status = dados.get("status", aluno.status)

    db.session.commit()
    return jsonify(mensagem="Aluno atualizado.")


@main_bp.route("/alunos/<int:id_aluno>", methods=["DELETE"])
def excluir_aluno(id_aluno):
    aluno = Aluno.query.get_or_404(id_aluno)

    if aluno.emprestimos or aluno.pendencias:
        return jsonify(
            erro="Este aluno possui empréstimos ou pendências vinculadas e não pode ser excluído."
        ), 409

    db.session.delete(aluno)
    db.session.commit()
    return jsonify(mensagem="Aluno excluído.")
