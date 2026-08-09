from flask import jsonify, request

from app import db
from app.models import Pendencia
from app.routes import main_bp


@main_bp.route("/pendencias", methods=["GET"])
def listar_pendencias():
    pendencias = Pendencia.query.all()
    return jsonify([
        {
            "id_pendencia": p.id_pendencia,
            "id_aluno": p.id_aluno,
            "id_emprestimo": p.id_emprestimo,
            "tipo": p.tipo,
            "descricao": p.descricao,
            "data_abertura": p.data_abertura.isoformat() if p.data_abertura else None,
            "data_resolucao": p.data_resolucao.isoformat() if p.data_resolucao else None,
            "status": p.status,
        }
        for p in pendencias
    ])


@main_bp.route("/pendencias", methods=["POST"])
def criar_pendencia():
    dados = request.get_json() or {}

    if not dados.get("id_aluno") or not dados.get("tipo"):
        return jsonify(erro="O id do aluno e o tipo de pendência são obrigatorios."), 400

    pendencia = Pendencia(
        id_aluno=dados["id_aluno"],
        id_emprestimo=dados.get("id_emprestimo"),
        tipo=dados["tipo"],
        descricao=dados.get("descricao"),
        status=dados.get("status", "ABERTA"),
    )

    db.session.add(pendencia)
    db.session.commit()

    return jsonify(id_pendencia=pendencia.id_pendencia), 201


@main_bp.route("/pendencias/<int:id_pendencia>", methods=["GET"])
def obter_pendencia(id_pendencia):
    pendencia = Pendencia.query.get_or_404(id_pendencia)
    return jsonify(
        id_pendencia=pendencia.id_pendencia,
        id_aluno=pendencia.id_aluno,
        id_emprestimo=pendencia.id_emprestimo,
        tipo=pendencia.tipo,
        descricao=pendencia.descricao,
        data_abertura=pendencia.data_abertura.isoformat() if pendencia.data_abertura else None,
        data_resolucao=pendencia.data_resolucao.isoformat() if pendencia.data_resolucao else None,
        status=pendencia.status,
    )


@main_bp.route("/pendencias/<int:id_pendencia>", methods=["PUT"])
def editar_pendencia(id_pendencia):
    pendencia = Pendencia.query.get_or_404(id_pendencia)
    dados = request.get_json() or {}

    pendencia.id_aluno = dados.get("id_aluno", pendencia.id_aluno)
    pendencia.id_emprestimo = dados.get("id_emprestimo", pendencia.id_emprestimo)
    pendencia.tipo = dados.get("tipo", pendencia.tipo)
    pendencia.descricao = dados.get("descricao", pendencia.descricao)
    pendencia.status = dados.get("status", pendencia.status)

    db.session.commit()
    return jsonify(mensagem="Pendência atualizada.")


@main_bp.route("/pendencias/<int:id_pendencia>", methods=["DELETE"])
def excluir_pendencia(id_pendencia):
    pendencia = Pendencia.query.get_or_404(id_pendencia)
    db.session.delete(pendencia)
    db.session.commit()
    return jsonify(mensagem="Pendência excluída.")
