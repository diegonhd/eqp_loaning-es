const API = {
  alunos: "/alunos", equipamentos: "/equipamentos", unidades: "/unidades-equipamento",
  tecnicos: "/tecnicos", emprestimos: "/emprestimos", pendencias: "/pendencias"
};
const state = { alunos: [], equipamentos: [], unidades: [], tecnicos: [], emprestimos: [], pendencias: [] };
const labels = { alunos: "Aluno", equipamentos: "Equipamento", unidades: "Unidade", tecnicos: "Técnico", emprestimos: "Empréstimo", pendencias: "Pendência" };
const idField = entity => ({ alunos: "id_aluno", equipamentos: "id_equipamento", unidades: "id_unidade_equipamento", tecnicos: "id_tecnico", emprestimos: "id_emprestimo", pendencias: "id_pendencia" })[entity];
let modal, editing = null;

const escapeHtml = value => String(value ?? "—").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
const badge = (label, classe) => `<span class="badge-lab ${classe}">${escapeHtml(label)}</span>`;
const empty = (columns, text) => `<tr><td colspan="${columns}" class="empty-state">${text}</td></tr>`;
const dataCurta = iso => iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const atrasado = item => item.atrasado === true || (!item.data_hora_devolucao && new Date(item.data_hora_prevista_devolucao) < new Date());
const badgeStatusUnidade = status => badge(status.replaceAll("_", " "), ({ DISPONIVEL: "badge-success", EMPRESTADO: "badge-warning", DANIFICADO: "badge-danger" })[status] || "badge-neutral");

function mostrarToast(mensagem, erro = false) {
  const toast = document.getElementById("toastLab");
  toast.classList.toggle("text-bg-danger", erro);
  toast.classList.toggle("text-bg-success", !erro);
  document.getElementById("toastLabBody").textContent = mensagem;
  bootstrap.Toast.getOrCreateInstance(toast, { delay: 2600 }).show();
}

async function requisicao(url, options = {}) {
  const response = await fetch(url, {
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.erro || `Erro ${response.status}`);
  return body;
}

async function carregarDados() {
  try {
    const dados = await Promise.all(Object.entries(API).map(async ([entity, url]) => [entity, await requisicao(url)]));
    dados.forEach(([entity, values]) => { state[entity] = values; });
    renderizar();
  } catch (error) {
    mostrarToast(`Não foi possível carregar os dados: ${error.message}`, true);
  }
}

const buttons = (entity, id, extras = "") => `
  <button class="btn-action" title="Editar" data-action="edit" data-entity="${entity}" data-id="${id}"><i class="bi bi-pencil"></i></button>
  ${extras}
  <button class="btn-action danger" title="Excluir" data-action="delete" data-entity="${entity}" data-id="${id}"><i class="bi bi-trash"></i></button>`;

function renderizar() {
  document.getElementById("kpiTotalAlunos").textContent = state.alunos.length;
  document.getElementById("kpiTotalEquip").textContent = state.equipamentos.reduce((total, equipamento) => total + equipamento.quantidade_disponivel, 0);
  document.getElementById("kpiTotalTec").textContent = state.tecnicos.length;
  document.getElementById("kpiAtrasados").textContent = state.emprestimos.filter(atrasado).length;

  const emprestimos = state.emprestimos.slice().reverse();
  document.getElementById("tblDashboardEmprestimos").innerHTML = emprestimos.slice(0, 5).map(item => `
    <tr><td>${escapeHtml(item.aluno)}</td><td>${escapeHtml(item.equipamento)}<br><span class="mono-tag">${escapeHtml(item.numero_patrimonio)}</span></td><td>${escapeHtml(item.tecnico_retirada)}</td><td>${dataCurta(item.data_hora_prevista_devolucao)}</td><td>${atrasado(item) ? badge("ATRASADO", "badge-danger") : badge("EM ANDAMENTO", "badge-warning")}</td></tr>`).join("") || empty(5, "Nenhum empréstimo ativo.");

  document.getElementById("tblAlunos").innerHTML = state.alunos.map(aluno => `
    <tr><td><span class="mono-tag">${escapeHtml(aluno.matricula)}</span></td><td>${escapeHtml(aluno.nome)}</td><td>${escapeHtml(aluno.email)}</td><td>${escapeHtml(aluno.telefone)}</td><td>${badge(aluno.status, aluno.status === "ATIVO" ? "badge-success" : "badge-neutral")}</td><td>${buttons("alunos", aluno.id_aluno)}</td></tr>`).join("") || empty(6, "Nenhum aluno cadastrado.");

  document.getElementById("tblEquipamentos").innerHTML = state.equipamentos.map(equipamento => `
    <tr><td>${escapeHtml(equipamento.nome)}</td><td>${escapeHtml(equipamento.descricao)}</td><td>${escapeHtml(equipamento.categoria)}</td><td>${equipamento.quantidade_total}</td><td>${badge(equipamento.quantidade_disponivel, equipamento.quantidade_disponivel ? "badge-success" : "badge-neutral")}</td><td>${buttons("equipamentos", equipamento.id_equipamento, `<button class="btn-action" title="Ver unidades" data-action="units" data-id="${equipamento.id_equipamento}"><i class="bi bi-upc-scan"></i></button>`)}</td></tr>`).join("") || empty(6, "Nenhum equipamento cadastrado.");

  document.getElementById("tblUnidades").innerHTML = state.unidades.map(unidade => `
    <tr><td><span class="mono-tag">${escapeHtml(unidade.numero_patrimonio)}</span></td><td>${escapeHtml(unidade.equipamento)}</td><td>${badgeStatusUnidade(unidade.status)}</td><td>${buttons("unidades", unidade.id_unidade_equipamento)}</td></tr>`).join("") || empty(4, "Nenhuma unidade cadastrada.");

  document.getElementById("tblTecnicos").innerHTML = state.tecnicos.map(tecnico => `
    <tr><td><span class="mono-tag">${escapeHtml(tecnico.matricula)}</span></td><td>${escapeHtml(tecnico.nome)}</td><td>${buttons("tecnicos", tecnico.id_tecnico)}</td></tr>`).join("") || empty(3, "Nenhum técnico cadastrado.");

  document.getElementById("tblEmprestimos").innerHTML = emprestimos.map(emprestimo => `
    <tr><td>${escapeHtml(emprestimo.aluno)}</td><td>${escapeHtml(emprestimo.equipamento)}</td><td><span class="mono-tag">${escapeHtml(emprestimo.numero_patrimonio)}</span></td><td>${escapeHtml(emprestimo.tecnico_retirada)}</td><td>${dataCurta(emprestimo.data_hora_prevista_devolucao)}</td><td>${atrasado(emprestimo) ? badge("ATRASADO", "badge-danger") : badge("EM ANDAMENTO", "badge-warning")}</td><td>${buttons("emprestimos", emprestimo.id_emprestimo, `<button class="btn-action" title="Registrar devolução" data-action="return" data-id="${emprestimo.id_emprestimo}"><i class="bi bi-box-arrow-in-left"></i></button>`)}</td></tr>`).join("") || empty(7, "Nenhum empréstimo ativo.");

  document.getElementById("tblPendencias").innerHTML = state.pendencias.map(pendencia => `
    <tr><td>${escapeHtml(state.alunos.find(aluno => aluno.id_aluno === pendencia.id_aluno)?.nome)}</td><td>${badge(pendencia.tipo, pendencia.tipo === "ATRASO" ? "badge-warning" : "badge-danger")}</td><td>${escapeHtml(pendencia.descricao)}</td><td>${badge(pendencia.status, pendencia.status === "ABERTA" ? "badge-danger" : "badge-success")}</td><td>${buttons("pendencias", pendencia.id_pendencia)}</td></tr>`).join("") || empty(5, "Nenhuma pendência cadastrada.");
}

function campos(entity, record = {}) {
  const input = (name, label, type = "text", required = false, value = record[name] ?? "") => `<div class="mb-3"><label class="form-label" for="field-${name}">${label}</label><input class="form-control" id="field-${name}" name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? "required" : ""}></div>`;
  const select = (name, label, values, value = record[name] ?? "") => `<div class="mb-3"><label class="form-label" for="field-${name}">${label}</label><select class="form-select" id="field-${name}" name="${name}" required>${values.map(([id, text]) => `<option value="${id}" ${String(id) === String(value) ? "selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></div>`;

  if (entity === "alunos") return input("nome", "Nome", "text", true) + input("matricula", "Matrícula", "text", true) + input("email", "E-mail", "email") + input("telefone", "Telefone") + select("status", "Status", [["ATIVO", "ATIVO"], ["INATIVO", "INATIVO"]]);
  if (entity === "equipamentos") return input("nome", "Nome", "text", true) + input("descricao", "Descrição") + input("categoria", "Categoria");
  if (entity === "unidades") {
    const camposUnidade = select("id_equipamento", "Tipo de equipamento", state.equipamentos.map(equipamento => [equipamento.id_equipamento, equipamento.nome])) + input("numero_patrimonio", "Número de patrimônio", "text", true);
    if (record.status === "EMPRESTADO") return camposUnidade + `<p class="form-text">O status desta unidade é controlado pela devolução do empréstimo ativo.</p>`;
    return camposUnidade + select("status", "Status", [["DISPONIVEL", "DISPONÍVEL"], ["EM_MANUTENCAO", "EM MANUTENÇÃO"], ["DANIFICADO", "DANIFICADO"], ["INATIVO", "INATIVO"]]);
  }
  if (entity === "tecnicos") return input("nome", "Nome", "text", true) + input("matricula", "Matrícula", "text", true);
  if (entity === "pendencias") return select("id_aluno", "Aluno", state.alunos.map(aluno => [aluno.id_aluno, `${aluno.nome} (${aluno.matricula})`])) + select("tipo", "Tipo", ["ATRASO", "DANO", "MULTA", "OUTRO"].map(tipo => [tipo, tipo])) + input("descricao", "Descrição") + select("status", "Status", [["ABERTA", "ABERTA"], ["RESOLVIDA", "RESOLVIDA"]]);
  if (editing) return input("data_hora_prevista_devolucao", "Nova previsão", "datetime-local", true, record.data_hora_prevista_devolucao?.slice(0, 16)) + input("observacoes", "Observações");
  return select("id_aluno", "Aluno", state.alunos.map(aluno => [aluno.id_aluno, `${aluno.nome} (${aluno.matricula})`])) + select("id_unidade_equipamento", "Unidade disponível", state.unidades.filter(unidade => unidade.status === "DISPONIVEL").map(unidade => [unidade.id_unidade_equipamento, `${unidade.equipamento} — ${unidade.numero_patrimonio}`])) + select("id_tecnico_retirada", "Técnico responsável", state.tecnicos.map(tecnico => [tecnico.id_tecnico, tecnico.nome])) + input("dias_prazo", "Prazo (dias)", "number", true, 7);
}

function abrirModal(entity, record = null) {
  editing = record ? { entity, record } : null;
  document.getElementById("crudModalTitle").textContent = `${record ? "Editar" : "Novo"} ${labels[entity]}`;
  document.getElementById("crudFields").innerHTML = campos(entity, record || {});
  document.getElementById("crudForm").dataset.entity = entity;
  modal.show();
}

async function salvar(event) {
  event.preventDefault();
  const entity = event.currentTarget.dataset.entity;
  const dados = Object.fromEntries(new FormData(event.currentTarget));
  for (const key of ["id_aluno", "id_equipamento", "id_unidade_equipamento", "id_tecnico_retirada"]) if (dados[key]) dados[key] = Number(dados[key]);
  if (dados.dias_prazo) dados.dias_prazo = Number(dados.dias_prazo);
  try {
    const id = editing?.record[idField(entity)];
    await requisicao(id ? `${API[entity]}/${id}` : API[entity], { method: id ? "PUT" : "POST", body: JSON.stringify(dados) });
    modal.hide(); mostrarToast(`${labels[entity]} ${id ? "atualizado" : "cadastrado"} com sucesso.`); await carregarDados();
  } catch (error) { mostrarToast(error.message, true); }
}

function irParaPagina(page) {
  document.querySelectorAll(".page").forEach(item => item.classList.toggle("active", item.id === `page-${page}`));
  document.querySelectorAll(".nav-link-item").forEach(item => item.classList.toggle("active", item.dataset.page === page));
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarBackdrop").classList.remove("show");
}

async function acao(event) {
  const target = event.target.closest("[data-action], [data-new]");
  if (!target) return;
  if (target.dataset.new) return abrirModal(target.dataset.new);
  const { action, entity, id } = target.dataset;
  if (action === "units") return irParaPagina("unidades");
  if (action === "edit") return abrirModal(entity, state[entity].find(item => String(item[idField(entity)]) === id));
  if (action === "delete" && confirm(`Excluir este ${labels[entity].toLowerCase()}?`)) {
    try { await requisicao(`${API[entity]}/${id}`, { method: "DELETE" }); mostrarToast("Registro excluído."); await carregarDados(); } catch (error) { mostrarToast(error.message, true); }
  }
  if (action === "return") {
    try { await requisicao(`${API.emprestimos}/${id}/devolucao`, { method: "PUT", body: "{}" }); mostrarToast("Devolução registrada."); await carregarDados(); } catch (error) { mostrarToast(error.message, true); }
  }
}

function inicializar() {
  modal = new bootstrap.Modal(document.getElementById("crudModal"));
  document.getElementById("crudForm").addEventListener("submit", salvar);
  document.addEventListener("click", acao);
  document.querySelectorAll(".nav-link-item").forEach(link => link.addEventListener("click", event => { event.preventDefault(); irParaPagina(link.dataset.page); }));
  document.getElementById("sidebarToggle").addEventListener("click", () => { document.getElementById("sidebar").classList.toggle("open"); document.getElementById("sidebarBackdrop").classList.toggle("show"); });
  document.getElementById("sidebarBackdrop").addEventListener("click", () => irParaPagina(document.querySelector(".nav-link-item.active").dataset.page));
  carregarDados();
}
document.addEventListener("DOMContentLoaded", inicializar);
