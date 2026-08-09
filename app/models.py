from datetime import datetime

from app import db


class Aluno(db.Model):
    __tablename__ = "aluno"

    id_aluno = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    matricula = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(120))
    telefone = db.Column(db.String(20))
    status = db.Column(db.String(15), nullable=False, default="ATIVO")

    emprestimos = db.relationship("Emprestimo", back_populates="aluno")
    pendencias = db.relationship("Pendencia", back_populates="aluno")


class Equipamento(db.Model):
    __tablename__ = "equipamento"

    id_equipamento = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    descricao = db.Column(db.String(255))
    categoria = db.Column(db.String(60))

    unidades = db.relationship("UnidadeEquipamento", back_populates="equipamento")


class UnidadeEquipamento(db.Model):
    __tablename__ = "unidade_equipamento"
    id_unidade_equipamento = db.Column(db.Integer, primary_key=True)
    id_equipamento = db.Column(
        db.Integer, db.ForeignKey("equipamento.id_equipamento"), nullable=False
    )
    numero_patrimonio = db.Column(db.String(30), unique=True, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="DISPONIVEL")

    equipamento = db.relationship("Equipamento", back_populates="unidades")
    emprestimos = db.relationship("Emprestimo", back_populates="unidade_equipamento")


class Tecnico(db.Model):
    __tablename__ = "tecnico"

    id_tecnico = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    matricula = db.Column(db.String(20), unique=True, nullable=False)


class Emprestimo(db.Model):
    __tablename__ = "emprestimo"

    id_emprestimo = db.Column(db.Integer, primary_key=True)

    id_aluno = db.Column(db.Integer, db.ForeignKey("aluno.id_aluno"), nullable=False)
    id_unidade_equipamento = db.Column(
        db.Integer, db.ForeignKey("unidade_equipamento.id_unidade_equipamento"),
        nullable=False
    )
    id_tecnico_retirada = db.Column(
        db.Integer, db.ForeignKey("tecnico.id_tecnico"), nullable=False
    )
    id_tecnico_devolucao = db.Column(
        db.Integer, db.ForeignKey("tecnico.id_tecnico"), nullable=True
    )

    data_hora_emprestimo = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_hora_prevista_devolucao = db.Column(db.DateTime, nullable=False)
    data_hora_devolucao = db.Column(db.DateTime, nullable=True)

    status = db.Column(db.String(20), nullable=False, default="EM_ANDAMENTO")
    observacoes = db.Column(db.String(255), nullable=True)

    aluno = db.relationship("Aluno", back_populates="emprestimos")
    unidade_equipamento = db.relationship(
        "UnidadeEquipamento", back_populates="emprestimos"
    )
    tecnico_retirada = db.relationship("Tecnico", foreign_keys=[id_tecnico_retirada])
    tecnico_devolucao = db.relationship("Tecnico", foreign_keys=[id_tecnico_devolucao])
    pendencias = db.relationship("Pendencia", back_populates="emprestimo")

    @property
    def esta_atrasado(self):
        """Calcula o atraso na hora, sem depender de um campo persistido."""
        return self.data_hora_devolucao is None and self.data_hora_prevista_devolucao < datetime.utcnow()


class Pendencia(db.Model):
    __tablename__ = "pendencia"

    id_pendencia = db.Column(db.Integer, primary_key=True)
    id_aluno = db.Column(db.Integer, db.ForeignKey("aluno.id_aluno"), nullable=False)
    id_emprestimo = db.Column(
        db.Integer, db.ForeignKey("emprestimo.id_emprestimo"), nullable=True
    )

    tipo = db.Column(db.String(15), nullable=False)  # ATRASO | DANO | MULTA | OUTRO
    descricao = db.Column(db.String(255))
    data_abertura = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_resolucao = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(10), nullable=False, default="ABERTA")

    aluno = db.relationship("Aluno", back_populates="pendencias")
    emprestimo = db.relationship("Emprestimo", back_populates="pendencias")
