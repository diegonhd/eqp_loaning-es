from datetime import datetime, timedelta

from flask import jsonify, request

from app import db
from app.models import Aluno, Emprestimo, Pendencia, Tecnico, UnidadeEquipamento
from app.routes import main_bp


def _sincronizar_pendencias_atraso():
    """Garante que todo emprestimo atrasado tenha uma Pendencia ABERTA correspondente."""
    atrasados = Emprestimo.query.filter(
        Emprestimo.data_hora_devolucao.is_(None),
        Emprestimo.data_hora_prevista_devolucao < datetime.utcnow(),
    ).all()

    for emprestimo in atrasados:
        ja_existe = Pendencia.query.filter_by(
            id_emprestimo=emprestimo.id_emprestimo, tipo="ATRASO", status="ABERTA"
        ).first()
        if not ja_existe:
            db.session.add(
                Pendencia(
                    id_aluno=emprestimo.id_aluno,
                    id_emprestimo=emprestimo.id_emprestimo,
                    tipo="ATRASO",
                    descricao=f"Empréstimo #{emprestimo.id_emprestimo} atrasado.",
                    data_abertura=datetime.utcnow(),
                    status="ABERTA",
                )
            )

    db.session.commit()


def _aluno_tem_pendencia(id_aluno):
    """Retorna True se o aluno tiver pendencia aberta OU emprestimo atrasado."""
    _sincronizar_pendencias_atraso()

    pendencia_aberta = Pendencia.query.filter_by(
        id_aluno=id_aluno, status="ABERTA"
    ).first()
    return pendencia_aberta is not None


@main_bp.route("/emprestimos", methods=["GET"])
def listar_emprestimos():
    """Lista todos os emprestimos (log completo, incluindo os devolvidos)."""
    emprestimos = Emprestimo.query.all()
    return jsonify([
        {
            "id_emprestimo": e.id_emprestimo,
            "aluno": e.aluno.nome,
            "equipamento": e.unidade_equipamento.equipamento.nome,
            "numero_patrimonio": e.unidade_equipamento.numero_patrimonio,
            "tecnico_retirada": e.tecnico_retirada.nome if e.tecnico_retirada else None,
            "data_hora_emprestimo": e.data_hora_emprestimo.isoformat(),
            "data_hora_prevista_devolucao": e.data_hora_prevista_devolucao.isoformat(),
            "data_hora_devolucao": (
                e.data_hora_devolucao.isoformat() if e.data_hora_devolucao else None
            ),
            "status": e.status,
            "observacoes": e.observacoes,
            "atrasado": e.esta_atrasado,
        }
        for e in emprestimos
    ])


@main_bp.route("/emprestimos", methods=["POST"])
def criar_emprestimo():
    dados = request.get_json() or {}

    id_aluno = dados.get("id_aluno")
    id_unidade_equipamento = dados.get("id_unidade_equipamento")
    id_tecnico_retirada = dados.get("id_tecnico_retirada")
    dias_prazo = dados.get("dias_prazo", 7)

    if not id_aluno or not id_unidade_equipamento or not id_tecnico_retirada:
        return jsonify(
            erro="O ID do aluno, O ID da unidade do equipamento e o ID do tecnico que receberá o equipamento são obrigatorios"
        ), 400

    try:
        dias_prazo = int(dias_prazo)
    except (TypeError, ValueError):
        return jsonify(erro="dias_prazo invalido"), 400

    if dias_prazo < 1:
        return jsonify(erro="dias_prazo deve ser maior que zero"), 400

    aluno = Aluno.query.get_or_404(id_aluno)
    unidade = UnidadeEquipamento.query.get_or_404(id_unidade_equipamento)
    Tecnico.query.get_or_404(id_tecnico_retirada)

    if _aluno_tem_pendencia(id_aluno):
        return jsonify(
            erro="O aluno possui pendência e não pode retirar nenhum equipamento."
        ), 403

    if unidade.status != "DISPONIVEL":
        return jsonify(erro="A unidade do equipamento não está disponível."), 409

    emprestimo = Emprestimo(
        id_aluno=id_aluno,
        id_unidade_equipamento=id_unidade_equipamento,
        id_tecnico_retirada=id_tecnico_retirada,
        data_hora_emprestimo=datetime.utcnow(),
        data_hora_prevista_devolucao=(
            datetime.utcnow() + timedelta(days=dias_prazo)
        ),
        status="EM_ANDAMENTO",
    )

    unidade.status = "EMPRESTADO"

    db.session.add(emprestimo)
    db.session.commit()

    return jsonify(id_emprestimo=emprestimo.id_emprestimo), 201


@main_bp.route("/emprestimos/<int:id_emprestimo>/devolucao", methods=["PUT"])
def devolver_emprestimo(id_emprestimo):
    dados = request.get_json() or {}
    id_tecnico_devolucao = dados.get("id_tecnico_devolucao")

    emprestimo = Emprestimo.query.get_or_404(id_emprestimo)

    if emprestimo.data_hora_devolucao is not None:
        return jsonify(erro="Este empréstimo já foi devolvido."), 400

    agora = datetime.utcnow()
    emprestimo.data_hora_devolucao = agora
    emprestimo.status = "DEVOLVIDO"
    if id_tecnico_devolucao:
        Tecnico.query.get_or_404(id_tecnico_devolucao)
        emprestimo.id_tecnico_devolucao = id_tecnico_devolucao

    emprestimo.unidade_equipamento.status = "DISPONIVEL"

    # Resolve apenas as pendências ATRASO geradas pelo próprio empréstimo.
    # DANO/MULTA/OUTRO permanecem abertas até resolução manual do técnico.
    pendencias_abertas = Pendencia.query.filter_by(
        id_emprestimo=id_emprestimo, status="ABERTA", tipo="ATRASO"
    ).all()
    for pendencia in pendencias_abertas:
        pendencia.status = "RESOLVIDA"
        pendencia.data_resolucao = agora

    db.session.commit()

    return jsonify(mensagem="devolucao registrada")


@main_bp.route("/emprestimos/<int:id_emprestimo>", methods=["PUT"])
def editar_emprestimo(id_emprestimo):
    """Atualiza o prazo ou as observações de um empréstimo em andamento."""
    emprestimo = Emprestimo.query.get_or_404(id_emprestimo)
    dados = request.get_json() or {}

    if "data_hora_prevista_devolucao" in dados:
        try:
            emprestimo.data_hora_prevista_devolucao = datetime.fromisoformat(
                dados["data_hora_prevista_devolucao"]
            )
        except (TypeError, ValueError):
            return jsonify(erro="data_hora_prevista_devolucao invalida"), 400

    if "observacoes" in dados:
        emprestimo.observacoes = dados["observacoes"]

    db.session.commit()
    return jsonify(mensagem="emprestimo atualizado")


@main_bp.route("/emprestimos/<int:id_emprestimo>", methods=["DELETE"])
def excluir_emprestimo(id_emprestimo):
    """Remove um empréstimo em andamento e libera o equipamento novamente."""
    emprestimo = Emprestimo.query.get_or_404(id_emprestimo)
    if emprestimo.data_hora_devolucao is not None:
        return jsonify(erro="Empréstimos devolvidos nao podem ser excluidos."), 409

    if Pendencia.query.filter_by(id_emprestimo=id_emprestimo).first():
        return jsonify(
            erro="Este empréstimo possui pendências vinculadas e não pode ser excluído."
        ), 409

    emprestimo.unidade_equipamento.status = "DISPONIVEL"
    db.session.delete(emprestimo)
    db.session.commit()
    return jsonify(mensagem="Empréstimo excluído.")


@main_bp.route("/relatorios/atrasados", methods=["GET"])
def relatorio_atrasados():
    """Relatorio para o tecnico: todos os emprestimos em atraso no momento."""
    _sincronizar_pendencias_atraso()

    atrasados = Emprestimo.query.filter(
        Emprestimo.data_hora_devolucao.is_(None),
        Emprestimo.data_hora_prevista_devolucao < datetime.utcnow(),
    ).all()

    return jsonify([
        {
            "id_emprestimo": e.id_emprestimo,
            "aluno": e.aluno.nome,
            "matricula": e.aluno.matricula,
            "equipamento": e.unidade_equipamento.equipamento.nome,
            "numero_patrimonio": e.unidade_equipamento.numero_patrimonio,
            "data_hora_emprestimo": e.data_hora_emprestimo.isoformat(),
            "data_hora_prevista_devolucao": e.data_hora_prevista_devolucao.isoformat(),
            "dias_atraso": (datetime.utcnow() - e.data_hora_prevista_devolucao).days,
        }
        for e in atrasados
    ])
