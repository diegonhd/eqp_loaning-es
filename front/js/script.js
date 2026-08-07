/* ==========================================================================
   SysLab · Controle de Empréstimo de Equipamentos de Laboratório
   Protótipo de front-end — todos os dados abaixo são fictícios (mock) e
   vivem apenas em memória (arrays JS). Não há persistência nem backend.
   O código foi estruturado (IDs incrementais, funções isoladas de render
   e de "salvar") para facilitar uma futura substituição por chamadas de
   API (fetch) sem reescrever a camada de interface.
   ========================================================================== */

/* ------------------------------ MOCK DATA ------------------------------ */

let alunos = [
    { id: 1, matricula: "2023011045", nome: "Ana Beatriz Souza", curso: "Engenharia da Computação", status: "Ativo" },
    { id: 2, matricula: "2022008812", nome: "Carlos Eduardo Lima", curso: "Ciência da Computação", status: "Ativo" },
    { id: 3, matricula: "2024003321", nome: "Fernanda Torres", curso: "Engenharia Elétrica", status: "Ativo" },
    { id: 4, matricula: "2021009987", nome: "João Pedro Alves", curso: "Engenharia Mecatrônica", status: "Inativo" },
    { id: 5, matricula: "2023014502", nome: "Larissa Martins", curso: "Sistemas de Informação", status: "Ativo" },
];

let equipamentos = [
    { id: 1, codigo: "EQ-0101", nome: "Osciloscópio digital", categoria: "Instrumentação", estado: "Emprestado" },
    { id: 2, codigo: "EQ-0102", nome: "Multímetro de bancada", categoria: "Instrumentação", estado: "Disponível" },
    { id: 3, codigo: "EQ-0103", nome: "Fonte de alimentação DC", categoria: "Instrumentação", estado: "Disponível" },
    { id: 4, codigo: "EQ-0204", nome: "Kit Arduino Uno", categoria: "Prototipagem", estado: "Emprestado" },
    { id: 5, codigo: "EQ-0205", nome: "Impressora 3D FDM", categoria: "Prototipagem", estado: "Manutenção" },
    { id: 6, codigo: "EQ-0310", nome: "Notebook para desenvolvimento", categoria: "Computação", estado: "Emprestado" },
    { id: 7, codigo: "EQ-0311", nome: "Câmera térmica", categoria: "Instrumentação", estado: "Disponível" },
];

let emprestimos = [
    { id: 1, alunoId: 1, equipamentoId: 1, dataEmprestimo: "2026-07-20", dataPrevista: "2026-07-27", dataDevolucao: null, status: "Atrasado", obs: "Uso em bancada de eletrônica." },
    { id: 2, alunoId: 2, equipamentoId: 4, dataEmprestimo: "2026-08-01", dataPrevista: "2026-08-08", dataDevolucao: null, status: "Em andamento", obs: "" },
    { id: 3, alunoId: 3, equipamentoId: 6, dataEmprestimo: "2026-07-15", dataPrevista: "2026-07-22", dataDevolucao: "2026-07-21", status: "Devolvido", obs: "" },
    { id: 4, alunoId: 5, equipamentoId: 2, dataEmprestimo: "2026-07-10", dataPrevista: "2026-07-17", dataDevolucao: "2026-07-18", status: "Devolvido", obs: "Devolução com 1 dia de atraso." },
    { id: 5, alunoId: 4, equipamentoId: 5, dataEmprestimo: "2026-06-28", dataPrevista: "2026-07-05", dataDevolucao: null, status: "Atrasado", obs: "Equipamento retido para manutenção." },
];

let pendencias = [
    { id: 1, alunoId: 1, tipo: "Atraso", descricao: "Osciloscópio digital (EQ-0101) não devolvido na data prevista.", status: "Aberta" },
    { id: 2, alunoId: 4, tipo: "Dano", descricao: "Impressora 3D (EQ-0205) devolvida com bico entupido.", status: "Aberta" },
    { id: 3, alunoId: 4, tipo: "Advertência", descricao: "Segunda ocorrência de atraso na devolução em 60 dias.", status: "Aberta" },
    { id: 4, alunoId: 5, tipo: "Atraso", descricao: "Multímetro (EQ-0102) devolvido 1 dia após o prazo.", status: "Resolvida" },
];

let nextIds = { aluno: 6, equipamento: 8, emprestimo: 6, pendencia: 5 };

/* ------------------------------ HELPERS -------------------------------- */

const hoje = () => new Date("2026-08-07"); // data de referência do protótipo

function formatarData(iso) {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
}

function diasEmAtraso(dataPrevista) {
    const prevista = new Date(dataPrevista);
    const diff = Math.floor((hoje() - prevista) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function getAluno(id) { return alunos.find(a => a.id === id); }
function getEquipamento(id) { return equipamentos.find(e => e.id === id); }

function badgeAlunoStatus(status) {
    return status === "Ativo"
        ? `<span class="badge-lab badge-success">Ativo</span>`
        : `<span class="badge-lab badge-neutral">Inativo</span>`;
}

function badgeEstadoEquipamento(estado) {
    const map = {
        "Disponível": "badge-success",
        "Emprestado": "badge-warning",
        "Manutenção": "badge-neutral",
    };
    return `<span class="badge-lab ${map[estado] || 'badge-neutral'}">${estado}</span>`;
}

function badgeStatusEmprestimo(status) {
    const map = {
        "Em andamento": "badge-primary",
        "Devolvido": "badge-success",
        "Atrasado": "badge-danger",
    };
    return `<span class="badge-lab ${map[status] || 'badge-neutral'}">${status}</span>`;
}

function badgeTipoPendencia(tipo) {
    const map = { "Atraso": "badge-warning", "Dano": "badge-danger", "Advertência": "badge-neutral" };
    return `<span class="badge-lab ${map[tipo] || 'badge-neutral'}">${tipo}</span>`;
}

function badgeStatusPendencia(status) {
    return status === "Resolvida"
        ? `<span class="badge-lab badge-success">Resolvida</span>`
        : `<span class="badge-lab badge-danger">Aberta</span>`;
}

function mostrarToast(mensagem) {
    document.getElementById("toastLabBody").textContent = mensagem;
    const toast = new bootstrap.Toast(document.getElementById("toastLab"), { delay: 2200 });
    toast.show();
}

function recalcularStatusEmprestimos() {
    emprestimos.forEach(emp => {
        if (emp.status !== "Devolvido") {
            emp.status = new Date(emp.dataPrevista) < hoje() ? "Atrasado" : "Em andamento";
        }
    });
}

/* ------------------------------ NAVEGAÇÃO ------------------------------- */

function irParaPagina(pagina) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(`page-${pagina}`).classList.add("active");

    document.querySelectorAll(".nav-link-item").forEach(link => {
        link.classList.toggle("active", link.dataset.page === pagina);
    });

    fecharSidebarMobile();

    if (pagina === "dashboard") renderDashboard();
    if (pagina === "relatorios") { popularFiltrosRelatorio(); renderRelatorioAtrasados(); }
}

function fecharSidebarMobile() {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarBackdrop").classList.remove("show");
}

document.querySelectorAll(".nav-link-item").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        irParaPagina(link.dataset.page);
    });
});

document.getElementById("sidebarToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
    document.getElementById("sidebarBackdrop").classList.toggle("show");
});
document.getElementById("sidebarBackdrop").addEventListener("click", fecharSidebarMobile);

/* ------------------------------ DASHBOARD -------------------------------- */

function renderDashboard() {
    recalcularStatusEmprestimos();

    document.getElementById("kpiTotalEquip").textContent = equipamentos.length;
    document.getElementById("kpiDisponiveis").textContent = equipamentos.filter(e => e.estado === "Disponível").length;
    document.getElementById("kpiEmprestados").textContent = equipamentos.filter(e => e.estado === "Emprestado").length;
    document.getElementById("kpiAtrasados").textContent = emprestimos.filter(e => e.status === "Atrasado").length;
    document.getElementById("kpiPendencias").textContent = pendencias.filter(p => p.status === "Aberta").length;

    const ultimos = [...emprestimos]
        .sort((a, b) => new Date(b.dataEmprestimo) - new Date(a.dataEmprestimo))
        .slice(0, 5);

    const tbody = document.getElementById("tblDashboardEmprestimos");
    tbody.innerHTML = ultimos.map(emp => {
        const aluno = getAluno(emp.alunoId);
        const equip = getEquipamento(emp.equipamentoId);
        return `<tr>
      <td>${aluno?.nome ?? "—"}</td>
      <td>${equip?.nome ?? "—"}</td>
      <td>${formatarData(emp.dataEmprestimo)}</td>
      <td>${formatarData(emp.dataPrevista)}</td>
      <td>${badgeStatusEmprestimo(emp.status)}</td>
    </tr>`;
    }).join("") || `<tr class="empty-row"><td colspan="5">Nenhum empréstimo registrado.</td></tr>`;
}

/* ------------------------------ ALUNOS -------------------------------- */

function renderAlunos() {
    const tbody = document.getElementById("tblAlunos");
    tbody.innerHTML = alunos.map(a => `
    <tr>
      <td><span class="mono-tag">${a.matricula}</span></td>
      <td>${a.nome}</td>
      <td>${a.curso}</td>
      <td>${badgeAlunoStatus(a.status)}</td>
      <td class="text-end">
        <button class="btn-action" title="Editar" onclick="prepararEditarAluno(${a.id})" data-bs-toggle="modal" data-bs-target="#modalAluno">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-action danger" title="Excluir" onclick="excluirAluno(${a.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("") || `<tr class="empty-row"><td colspan="5">Nenhum aluno cadastrado.</td></tr>`;
}

function prepararNovoAluno() {
    document.getElementById("formAluno").reset();
    document.getElementById("alunoId").value = "";
    document.getElementById("tituloModalAluno").textContent = "Novo aluno";
}

function prepararEditarAluno(id) {
    const a = getAluno(id);
    if (!a) return;
    document.getElementById("tituloModalAluno").textContent = "Editar aluno";
    document.getElementById("alunoId").value = a.id;
    document.getElementById("alunoMatricula").value = a.matricula;
    document.getElementById("alunoNome").value = a.nome;
    document.getElementById("alunoCurso").value = a.curso;
    document.getElementById("alunoStatus").value = a.status;
}

function salvarAluno(event) {
    event.preventDefault();
    const id = document.getElementById("alunoId").value;
    const dados = {
        matricula: document.getElementById("alunoMatricula").value.trim(),
        nome: document.getElementById("alunoNome").value.trim(),
        curso: document.getElementById("alunoCurso").value.trim(),
        status: document.getElementById("alunoStatus").value,
    };

    if (id) {
        const aluno = getAluno(Number(id));
        Object.assign(aluno, dados);
        mostrarToast("Aluno atualizado com sucesso.");
    } else {
        alunos.push({ id: nextIds.aluno++, ...dados });
        mostrarToast("Aluno cadastrado com sucesso.");
    }

    bootstrap.Modal.getInstance(document.getElementById("modalAluno")).hide();
    renderAlunos();
    popularSelects();
}

function excluirAluno(id) {
    if (!confirm("Deseja realmente excluir este aluno?")) return;
    alunos = alunos.filter(a => a.id !== id);
    renderAlunos();
    popularSelects();
    mostrarToast("Aluno excluído.");
}

/* ---------------------------- EQUIPAMENTOS ------------------------------ */

function renderEquipamentos() {
    const tbody = document.getElementById("tblEquipamentos");
    tbody.innerHTML = equipamentos.map(e => `
    <tr>
      <td><span class="mono-tag">${e.codigo}</span></td>
      <td>${e.nome}</td>
      <td>${e.categoria}</td>
      <td>${badgeEstadoEquipamento(e.estado)}</td>
      <td class="text-end">
        <button class="btn-action" title="Editar" onclick="prepararEditarEquipamento(${e.id})" data-bs-toggle="modal" data-bs-target="#modalEquipamento">
          <i class="bi bi-pencil"></i>
        </button>
        <button class="btn-action danger" title="Excluir" onclick="excluirEquipamento(${e.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    </tr>
  `).join("") || `<tr class="empty-row"><td colspan="5">Nenhum equipamento cadastrado.</td></tr>`;
}

function prepararNovoEquipamento() {
    document.getElementById("formEquipamento").reset();
    document.getElementById("equipamentoId").value = "";
    document.getElementById("tituloModalEquipamento").textContent = "Cadastrar equipamento";
}

function prepararEditarEquipamento(id) {
    const e = getEquipamento(id);
    if (!e) return;
    document.getElementById("tituloModalEquipamento").textContent = "Editar equipamento";
    document.getElementById("equipamentoId").value = e.id;
    document.getElementById("equipamentoCodigo").value = e.codigo;
    document.getElementById("equipamentoNome").value = e.nome;
    document.getElementById("equipamentoCategoria").value = e.categoria;
    document.getElementById("equipamentoEstado").value = e.estado;
}

function salvarEquipamento(event) {
    event.preventDefault();
    const id = document.getElementById("equipamentoId").value;
    const dados = {
        codigo: document.getElementById("equipamentoCodigo").value.trim(),
        nome: document.getElementById("equipamentoNome").value.trim(),
        categoria: document.getElementById("equipamentoCategoria").value.trim(),
        estado: document.getElementById("equipamentoEstado").value,
    };

    if (id) {
        Object.assign(getEquipamento(Number(id)), dados);
        mostrarToast("Equipamento atualizado com sucesso.");
    } else {
        equipamentos.push({ id: nextIds.equipamento++, ...dados });
        mostrarToast("Equipamento cadastrado com sucesso.");
    }

    bootstrap.Modal.getInstance(document.getElementById("modalEquipamento")).hide();
    renderEquipamentos();
    popularSelects();
}

function excluirEquipamento(id) {
    if (!confirm("Deseja realmente excluir este equipamento?")) return;
    equipamentos = equipamentos.filter(e => e.id !== id);
    renderEquipamentos();
    popularSelects();
    mostrarToast("Equipamento excluído.");
}

/* ---------------------------- EMPRÉSTIMOS -------------------------------- */

function popularSelects() {
    const selAluno = document.getElementById("emprestimoAluno");
    selAluno.innerHTML = alunos
        .filter(a => a.status === "Ativo")
        .map(a => `<option value="${a.id}">${a.nome} — ${a.matricula}</option>`).join("");

    const selEquip = document.getElementById("emprestimoEquipamento");
    const disponiveis = equipamentos.filter(e => e.estado === "Disponível");
    selEquip.innerHTML = disponiveis
        .map(e => `<option value="${e.id}">${e.nome} — ${e.codigo}</option>`).join("");

    const alerta = document.getElementById("emprestimoAlerta");
    if (disponiveis.length === 0) {
        alerta.style.display = "block";
        alerta.textContent = "Não há equipamentos disponíveis no momento.";
    } else {
        alerta.style.display = "none";
    }
}

function prepararNovoEmprestimo() {
    document.getElementById("formEmprestimo").reset();
    popularSelects();
    const prevista = new Date(hoje());
    prevista.setDate(prevista.getDate() + 7);
    document.getElementById("emprestimoDataPrevista").value = prevista.toISOString().slice(0, 10);
}

function renderEmprestimos() {
    recalcularStatusEmprestimos();
    const tbody = document.getElementById("tblEmprestimos");
    tbody.innerHTML = emprestimos.map(emp => {
        const aluno = getAluno(emp.alunoId);
        const equip = getEquipamento(emp.equipamentoId);
        const podeDevolver = emp.status !== "Devolvido";
        return `<tr>
      <td>${aluno?.nome ?? "Aluno removido"}</td>
      <td>${equip?.nome ?? "Equipamento removido"}</td>
      <td>${formatarData(emp.dataEmprestimo)}</td>
      <td>${formatarData(emp.dataPrevista)}</td>
      <td>${formatarData(emp.dataDevolucao)}</td>
      <td>${badgeStatusEmprestimo(emp.status)}</td>
      <td class="text-end">
        ${podeDevolver
                ? `<button class="btn btn-sm-lab btn-outline-lab" onclick="registrarDevolucao(${emp.id})">
               <i class="bi bi-box-arrow-in-down me-1"></i>Devolução
             </button>`
                : `<span class="text-muted" style="font-size:.78rem;">—</span>`}
      </td>
    </tr>`;
    }).join("") || `<tr class="empty-row"><td colspan="7">Nenhum empréstimo registrado.</td></tr>`;
}

function salvarEmprestimo(event) {
    event.preventDefault();
    const alunoId = Number(document.getElementById("emprestimoAluno").value);
    const equipamentoId = Number(document.getElementById("emprestimoEquipamento").value);
    const dataPrevista = document.getElementById("emprestimoDataPrevista").value;
    const obs = document.getElementById("emprestimoObs").value.trim();

    if (!alunoId || !equipamentoId) {
        mostrarToast("Selecione um aluno e um equipamento disponível.");
        return;
    }

    emprestimos.push({
        id: nextIds.emprestimo++,
        alunoId, equipamentoId,
        dataEmprestimo: hoje().toISOString().slice(0, 10),
        dataPrevista,
        dataDevolucao: null,
        status: "Em andamento",
        obs,
    });

    const equip = getEquipamento(equipamentoId);
    if (equip) equip.estado = "Emprestado";

    bootstrap.Modal.getInstance(document.getElementById("modalEmprestimo")).hide();
    renderEmprestimos();
    renderEquipamentos();
    popularSelects();
    mostrarToast("Empréstimo registrado com sucesso.");
}

function registrarDevolucao(id) {
    const emp = emprestimos.find(e => e.id === id);
    if (!emp) return;
    if (!confirm("Confirmar a devolução deste equipamento?")) return;

    emp.dataDevolucao = hoje().toISOString().slice(0, 10);
    emp.status = "Devolvido";

    const equip = getEquipamento(emp.equipamentoId);
    if (equip) equip.estado = "Disponível";

    renderEmprestimos();
    renderEquipamentos();
    renderDashboard();
    mostrarToast("Devolução registrada com sucesso.");
}

/* ----------------------------- PENDÊNCIAS -------------------------------- */

let pendenciaEmFoco = null;

function renderPendencias() {
    const tbody = document.getElementById("tblPendencias");
    tbody.innerHTML = pendencias.map(p => {
        const aluno = getAluno(p.alunoId);
        return `<tr>
      <td>${aluno?.nome ?? "Aluno removido"}</td>
      <td>${badgeTipoPendencia(p.tipo)}</td>
      <td>${p.descricao}</td>
      <td>${badgeStatusPendencia(p.status)}</td>
      <td class="text-end">
        ${p.status === "Aberta"
                ? `<button class="btn btn-sm-lab btn-outline-lab" data-bs-toggle="modal" data-bs-target="#modalPendencia" onclick="abrirModalPendencia(${p.id})">
               <i class="bi bi-check2 me-1"></i>Resolver
             </button>`
                : `<span class="text-muted" style="font-size:.78rem;">Concluída</span>`}
      </td>
    </tr>`;
    }).join("") || `<tr class="empty-row"><td colspan="5">Nenhuma pendência registrada.</td></tr>`;
}

function abrirModalPendencia(id) {
    pendenciaEmFoco = pendencias.find(p => p.id === id);
    if (!pendenciaEmFoco) return;
    const aluno = getAluno(pendenciaEmFoco.alunoId);
    document.getElementById("pendenciaAlunoNome").textContent = aluno?.nome ?? "—";
    document.getElementById("pendenciaTipoNome").textContent = pendenciaEmFoco.tipo;
    document.getElementById("pendenciaDescNome").textContent = pendenciaEmFoco.descricao;
    document.getElementById("pendenciaResolucaoObs").value = "";
}

function confirmarResolucaoPendencia() {
    if (!pendenciaEmFoco) return;
    pendenciaEmFoco.status = "Resolvida";
    bootstrap.Modal.getInstance(document.getElementById("modalPendencia")).hide();
    renderPendencias();
    renderDashboard();
    mostrarToast("Pendência marcada como resolvida.");
    pendenciaEmFoco = null;
}

/* ------------------------------ RELATÓRIOS ------------------------------- */

function popularFiltrosRelatorio() {
    const selAluno = document.getElementById("filtroAluno");
    selAluno.innerHTML = `<option value="">Todos os alunos</option>` +
        alunos.map(a => `<option value="${a.id}">${a.nome}</option>`).join("");

    const selEquip = document.getElementById("filtroEquipamento");
    selEquip.innerHTML = `<option value="">Todos os equipamentos</option>` +
        equipamentos.map(e => `<option value="${e.id}">${e.nome}</option>`).join("");
}

function limparFiltros() {
    document.getElementById("filtroAluno").value = "";
    document.getElementById("filtroEquipamento").value = "";
    document.getElementById("filtroDataInicio").value = "";
    document.getElementById("filtroDataFim").value = "";
    renderRelatorioAtrasados();
}

function gerarRelatorio() {
    const alunoId = document.getElementById("filtroAluno").value;
    const equipamentoId = document.getElementById("filtroEquipamento").value;
    const inicio = document.getElementById("filtroDataInicio").value;
    const fim = document.getElementById("filtroDataFim").value;

    let resultado = emprestimos.filter(emp => emp.status === "Atrasado");

    if (alunoId) resultado = resultado.filter(e => e.alunoId === Number(alunoId));
    if (equipamentoId) resultado = resultado.filter(e => e.equipamentoId === Number(equipamentoId));
    if (inicio) resultado = resultado.filter(e => e.dataEmprestimo >= inicio);
    if (fim) resultado = resultado.filter(e => e.dataEmprestimo <= fim);

    renderTabelaRelatorio(resultado);
    mostrarToast(`Relatório gerado: ${resultado.length} registro(s) encontrado(s).`);
}

function renderRelatorioAtrasados() {
    recalcularStatusEmprestimos();
    renderTabelaRelatorio(emprestimos.filter(e => e.status === "Atrasado"));
}

function renderTabelaRelatorio(lista) {
    const tbody = document.getElementById("tblRelatorio");
    tbody.innerHTML = lista.map(emp => {
        const aluno = getAluno(emp.alunoId);
        const equip = getEquipamento(emp.equipamentoId);
        return `<tr>
      <td>${aluno?.nome ?? "—"}</td>
      <td>${equip?.nome ?? "—"}</td>
      <td>${formatarData(emp.dataEmprestimo)}</td>
      <td>${formatarData(emp.dataPrevista)}</td>
      <td><span class="badge-lab badge-danger">${diasEmAtraso(emp.dataPrevista)} dia(s)</span></td>
    </tr>`;
    }).join("") || `<tr class="empty-row"><td colspan="5">Nenhum empréstimo em atraso para os filtros aplicados.</td></tr>`;
}

/* ------------------------------ INICIALIZAÇÃO ---------------------------- */

function inicializar() {
    recalcularStatusEmprestimos();
    renderDashboard();
    renderAlunos();
    renderEquipamentos();
    renderEmprestimos();
    renderPendencias();
    popularSelects();
    popularFiltrosRelatorio();
    renderRelatorioAtrasados();
}

document.addEventListener("DOMContentLoaded", inicializar);