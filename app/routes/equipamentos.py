from flask import jsonify, request
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import Emprestimo, Equipamento, UnidadeEquipamento
from app.routes import main_bp

STATUS_UNIDADE_MANUAIS = {"DISPONIVEL", "EM_MANUTENCAO", "DANIFICADO", "INATIVO"}


@main_bp.route("/equipamentos", methods=["GET"])
def listar_equipamentos():
    equipamentos = Equipamento.query.all()
    return jsonify([
        {
            "id_equipamento": equipamento.id_equipamento,
            "nome": equipamento.nome,
            "descricao": equipamento.descricao,
            "categoria": equipamento.categoria,
            "quantidade_total": len(equipamento.unidades),
            "quantidade_disponivel": sum(
                unidade.status == "DISPONIVEL"
                for unidade in equipamento.unidades
            ),
        }
        for equipamento in equipamentos
    ])


@main_bp.route("/equipamentos/<int:id_equipamento>", methods=["GET"])
def obter_equipamento(id_equipamento):
    equipamento = Equipamento.query.get_or_404(id_equipamento)
    return jsonify(
        id_equipamento=equipamento.id_equipamento,
        nome=equipamento.nome,
        descricao=equipamento.descricao,
        categoria=equipamento.categoria,
        quantidade_total=len(equipamento.unidades),
        quantidade_disponivel=sum(
            unidade.status == "DISPONIVEL" for unidade in equipamento.unidades
        ),
    )


@main_bp.route("/equipamentos", methods=["POST"])
def criar_equipamento():
    dados = request.get_json() or {}

    if not dados.get("nome"):
        return jsonify(erro="Nome é obrigatorio"), 400

    equipamento = Equipamento(
        nome=dados["nome"],
        descricao=dados.get("descricao"),
        categoria=dados.get("categoria"),
    )

    db.session.add(equipamento)
    db.session.commit()

    return jsonify(id_equipamento=equipamento.id_equipamento), 201


@main_bp.route("/equipamentos/<int:id_equipamento>", methods=["PUT"])
def editar_equipamento(id_equipamento):
    equipamento = Equipamento.query.get_or_404(id_equipamento)
    dados = request.get_json() or {}

    equipamento.nome = dados.get("nome", equipamento.nome)
    equipamento.descricao = dados.get("descricao", equipamento.descricao)
    equipamento.categoria = dados.get("categoria", equipamento.categoria)

    db.session.commit()
    return jsonify(mensagem="equipamento atualizado")


@main_bp.route("/equipamentos/<int:id_equipamento>", methods=["DELETE"])
def excluir_equipamento(id_equipamento):
    equipamento = Equipamento.query.get_or_404(id_equipamento)

    if equipamento.unidades:
        return jsonify(
            erro="Remova todas as unidades deste equipamento antes de excluí-lo"
        ), 409

    db.session.delete(equipamento)
    db.session.commit()
    return jsonify(mensagem="Equipamento excluído.")


@main_bp.route("/unidades-equipamento", methods=["GET"])
def listar_unidades_equipamentos():
    unidades = UnidadeEquipamento.query.all()
    return jsonify([
        {
            "id_unidade_equipamento": u.id_unidade_equipamento,
            "id_equipamento": u.id_equipamento,
            "equipamento": u.equipamento.nome,
            "numero_patrimonio": u.numero_patrimonio,
            "status": u.status,
        }
        for u in unidades
    ])


@main_bp.route("/unidades-equipamento/<int:id_unidade_equipamento>", methods=["GET"])
def obter_unidade_equipamento(id_unidade_equipamento):
    unidade = UnidadeEquipamento.query.get_or_404(id_unidade_equipamento)
    return jsonify(
        id_unidade_equipamento=unidade.id_unidade_equipamento,
        id_equipamento=unidade.id_equipamento,
        equipamento=unidade.equipamento.nome,
        numero_patrimonio=unidade.numero_patrimonio,
        status=unidade.status,
    )


@main_bp.route("/unidades-equipamento", methods=["POST"])
def criar_unidade_equipamento():
    dados = request.get_json() or {}

    if not dados.get("id_equipamento") or not dados.get("numero_patrimonio"):
        return jsonify(erro="O id do equipamento e o número do patrimonio são obrigatórios."), 400

    Equipamento.query.get_or_404(dados["id_equipamento"])

    status = dados.get("status", "DISPONIVEL")
    if status not in STATUS_UNIDADE_MANUAIS:
        return jsonify(erro="Status de unidade inválido"), 400

    unidade = UnidadeEquipamento(
        id_equipamento=dados["id_equipamento"],
        numero_patrimonio=dados["numero_patrimonio"],
        status=status,
    )

    try:
        db.session.add(unidade)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify(erro="Número de patrimônio já cadastrado."), 409

    return jsonify(id_unidade_equipamento=unidade.id_unidade_equipamento), 201


@main_bp.route(
    "/unidades-equipamento/<int:id_unidade_equipamento>",
    methods=["PUT"],
)
def editar_unidade_equipamento(id_unidade_equipamento):
    unidade = UnidadeEquipamento.query.get_or_404(id_unidade_equipamento)
    dados = request.get_json() or {}

    novo_patrimonio = dados.get("numero_patrimonio")

    if novo_patrimonio and novo_patrimonio != unidade.numero_patrimonio:
        patrimonio_em_uso = UnidadeEquipamento.query.filter(
            UnidadeEquipamento.numero_patrimonio == novo_patrimonio,
            UnidadeEquipamento.id_unidade_equipamento != id_unidade_equipamento,
        ).first()

        if patrimonio_em_uso:
            return jsonify(erro="Número de patrimônio já cadastrado."), 409

        unidade.numero_patrimonio = novo_patrimonio

    if dados.get("id_equipamento"):
        Equipamento.query.get_or_404(dados["id_equipamento"])
        unidade.id_equipamento = dados["id_equipamento"]

    if "status" in dados:
        novo_status = dados["status"]
        if novo_status not in STATUS_UNIDADE_MANUAIS:
            return jsonify(erro="Status de unidade inválido."), 400

        emprestimo_ativo = Emprestimo.query.filter_by(
            id_unidade_equipamento=id_unidade_equipamento,
            data_hora_devolucao=None,
        ).first()
        if emprestimo_ativo:
            return jsonify(
                erro="A unidade possui um empréstimo ativo e não pode ter o status alterado."
            ), 409

        unidade.status = novo_status

    db.session.commit()
    return jsonify(mensagem="unidade atualizada")


@main_bp.route(
    "/unidades-equipamento/<int:id_unidade_equipamento>",
    methods=["DELETE"],
)
def excluir_unidade_equipamento(id_unidade_equipamento):
    unidade = UnidadeEquipamento.query.get_or_404(id_unidade_equipamento)

    possui_emprestimo = Emprestimo.query.filter_by(
        id_unidade_equipamento=id_unidade_equipamento
    ).first()

    if possui_emprestimo:
        return jsonify(
            erro="Esta unidade possui empréstimos vinculados e não pode ser excluida."
        ), 409

    db.session.delete(unidade)
    db.session.commit()
    return jsonify(mensagem="Unidade excluída.")
