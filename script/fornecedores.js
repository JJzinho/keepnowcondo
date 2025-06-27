import { supabase } from './supabaseClient.js';

// Lista de ocorrências padrão que serão a base para cada condomínio.
const PREDEFINED_OCCURRENCES = [
    { chave: "hidrossanitario", nome: "Sistema Hidrossanitário" },
    { chave: "protecao_incendio", nome: "Sistema de Proteção e Combate a Incêndio" },
    { chave: "instalacoes_eletricas", nome: "Sistema de Instalações Elétricas" },
    { chave: "climatizacao", nome: "Climatização" },
    { chave: "instalacoes_gas", nome: "Instalações de Gás" },
    { chave: "impermeabilizacoes", nome: "Impermeabilizações" },
    { chave: "sistemas_civis", nome: "Sistemas Civis (Estrutura, Contenção)" },
    { chave: "esquadrias", nome: "Esquadrias (Portas, Janelas)" },
    { chave: "revestimentos", nome: "Revestimentos (Pisos, Fachadas, Pintura)" },
    { chave: "elevador", nome: "Elevador" },
    { chave: "gerador", nome: "Gerador" },
    { chave: "seguranca_eletronica", nome: "Segurança Eletrônica (CFTV, Alarmes)" },
    { chave: "telecomunicacoes", nome: "Telecomunicações e Cabeamento" },
    { chave: "paisagismo_lazer", nome: "Paisagismo e Lazer" },
    { chave: "outros", nome: "Geral / Outros" }
];

let state = {
    condoId: null,
    suppliers: [],
    occurrenceTypes: []
};

// --- FUNÇÕES DE INICIALIZAÇÃO ---
async function initializePage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/www/index.html');
        return;
    }

    state.condoId = sessionStorage.getItem('selectedCondoId');
    if (!state.condoId) {
        alert('Condomínio não selecionado!');
        window.location.replace('/www/inicio.html');
        return;
    }

    setupEventListeners();
    await loadInitialData();
}

async function loadInitialData() {
    // 1. Busca os tipos de ocorrência que JÁ EXISTEM no banco para este condomínio
    let occurrencesRes = await supabase.from('tipo_ocorrencia').select('*').eq('condominio_id', state.condoId);
    if (occurrencesRes.error) {
        console.error("Erro ao buscar tipos de ocorrência:", occurrencesRes.error);
        state.occurrenceTypes = [];
    } else {
        state.occurrenceTypes = occurrencesRes.data || [];
    }

    // 2. Verifica se precisa adicionar os tipos padrão (seeding)
    const newItemsAdded = await seedDefaultOccurrences();
    
    // 3. Se novos itens foram adicionados, busca a lista novamente para ter os dados completos
    if (newItemsAdded) {
        occurrencesRes = await supabase.from('tipo_ocorrencia').select('*').eq('condominio_id', state.condoId);
        if (occurrencesRes.error) console.error("Erro ao re-buscar tipos de ocorrência:", occurrencesRes.error);
        state.occurrenceTypes = occurrencesRes.data || [];
    }
    
    // 4. Busca os fornecedores
    const suppliersRes = await supabase.from('fornecedor').select('*, tipo_ocorrencia(nome)').eq('condominio_id', state.condoId);
    if (suppliersRes.error) {
        console.error("Erro ao buscar fornecedores:", suppliersRes.error);
    } else {
        state.suppliers = suppliersRes.data || [];
    }

    // 5. Renderiza tudo na tela
    renderAll();
}

// **NOVA FUNÇÃO** para adicionar os tipos padrão se necessário
async function seedDefaultOccurrences() {
    const existingKeys = new Set(state.occurrenceTypes.map(o => o.chave));
    
    const occurrencesToInsert = PREDEFINED_OCCURRENCES
        .filter(p => !existingKeys.has(p.chave))
        .map(p => ({
            condominio_id: state.condoId,
            nome: p.nome,
            chave: p.chave
        }));

    if (occurrencesToInsert.length > 0) {
        console.log(`Adicionando ${occurrencesToInsert.length} tipos de serviço padrão...`);
        const { error } = await supabase.from('tipo_ocorrencia').insert(occurrencesToInsert);
        if (error) {
            console.error("Erro ao inserir tipos de ocorrência padrão:", error);
            return false;
        }
        return true; // Indica que novos itens foram adicionados
    }
    
    return false; // Nenhum item novo foi adicionado
}


function renderAll() {
    renderAllKnownOccurrencesDisplay();
    renderSuppliersTable();
    populateMainOccurrenceSelectInModal();
}

// --- CONFIGURAÇÃO DOS EVENT LISTENERS ---
function setupEventListeners() {
    const s = (selector) => document.querySelector(selector);

    s('#add-new-occurrence-type-btn').addEventListener('click', handleAddNewOccurrenceType);
    s('#open-add-supplier-modal-btn').addEventListener('click', () => openSupplierModal());
    s('#close-supplier-modal-btn').addEventListener('click', closeSupplierModal);
    s('#cancel-edit-supplier-btn-modal').addEventListener('click', closeSupplierModal);
    s('#supplier-form-modal').addEventListener('click', (e) => {
        if (e.target.id === 'supplier-form-modal') closeSupplierModal();
    });
    s('#form-fornecedor').addEventListener('submit', handleSupplierFormSubmit);

    IMask(s('#supplier-cnpj-modal'), { mask: '00.000.000/0000-00' });
    IMask(s('#supplier-phone-modal'), { mask: '+{55} (00) 00000-0000' });
}

// --- GERENCIAMENTO DE TIPOS DE OCORRÊNCIA ---
async function handleAddNewOccurrenceType() {
    const nameInput = document.getElementById('new-occurrence-type-name-input');
    const nome = nameInput.value.trim();
    if (!nome) {
        alert("Digite um nome para o novo tipo de serviço.");
        return;
    }
    
    const chave = nome.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, '');

    const { error } = await supabase.from('tipo_ocorrencia').insert([{
        condominio_id: state.condoId,
        nome,
        chave
    }]);

    if (error) {
        console.error("Erro ao adicionar tipo de ocorrência:", error);
        alert(`Falha ao adicionar: ${error.message}`);
    } else {
        alert("Tipo de serviço adicionado com sucesso!");
        nameInput.value = '';
        await loadInitialData();
    }
}

async function handleDeleteOccurrenceType(typeId, typeName) {
    if (!confirm(`Tem certeza que deseja excluir o tipo "${typeName}"? Isso pode afetar fornecedores associados.`)) return;

    const { error } = await supabase.from('tipo_ocorrencia').delete().eq('id', typeId);

    if (error) {
        console.error("Erro ao excluir tipo de ocorrência:", error);
        alert(`Falha ao excluir: ${error.message}`);
    } else {
        alert("Tipo de serviço excluído.");
        await loadInitialData();
    }
}

function renderAllKnownOccurrencesDisplay() {
    const container = document.getElementById('all-occurrences-list-display');
    container.innerHTML = '';
    if (state.occurrenceTypes.length === 0) {
        container.innerHTML = '<p>Nenhum tipo de serviço cadastrado.</p>';
        return;
    }
    const ul = document.createElement('ul');
    state.occurrenceTypes.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(type => {
        const li = document.createElement('li');
        li.textContent = type.nome;
        
        // Verifica se a ocorrência é predefinida para decidir se mostra o botão de excluir
        const isPredefined = PREDEFINED_OCCURRENCES.some(p => p.chave === type.chave);
        if (!isPredefined) {
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '&times;';
            removeBtn.className = 'remove-global-occurrence-btn';
            removeBtn.title = `Remover "${type.nome}"`;
            removeBtn.onclick = () => handleDeleteOccurrenceType(type.id, type.nome);
            li.appendChild(removeBtn);
        }
        ul.appendChild(li);
    });
    container.appendChild(ul);
}


// --- GERENCIAMENTO DE FORNECEDORES ---
function renderSuppliersTable() {
    const container = document.getElementById('suppliers-list-container');
    container.innerHTML = '';
    if (state.suppliers.length === 0) {
        container.innerHTML = '<p class="empty-list-message">Nenhum fornecedor cadastrado.</p>';
        return;
    }
    const table = document.createElement('table');
    table.innerHTML = `<thead><tr><th>Nome</th><th>Telefone</th><th>Serviço Principal</th><th>Contrato?</th><th>CNPJ</th><th>Ações</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    state.suppliers.sort((a,b) => a.nome.localeCompare(b.nome)).forEach(supplier => {
        const row = tbody.insertRow();
        row.insertCell().textContent = supplier.nome;
        row.insertCell().textContent = supplier.telefone;
        row.insertCell().textContent = supplier.tipo_ocorrencia?.nome || 'N/A';
        row.insertCell().textContent = supplier.possui_contrato ? 'Sim' : 'Não';
        row.insertCell().textContent = supplier.cnpj || 'N/A';
        const actionsCell = row.insertCell();
        actionsCell.className = 'actions-cell';
        actionsCell.innerHTML = `
            <button class="btn btn-secondary edit-btn"><i class="material-icons">edit</i></button>
            <button class="btn btn-danger delete-btn"><i class="material-icons">delete</i></button>
        `;
        actionsCell.querySelector('.edit-btn').onclick = () => openSupplierModal(supplier);
        actionsCell.querySelector('.delete-btn').onclick = () => handleDeleteSupplier(supplier.id, supplier.nome);
    });
    container.appendChild(table);
}

function openSupplierModal(supplier = null) {
    const form = document.getElementById('form-fornecedor');
    form.reset();
    document.getElementById('supplier-id').value = supplier ? supplier.id : '';
    document.getElementById('supplier-modal-title').textContent = supplier ? 'Editar Fornecedor' : 'Adicionar Novo Fornecedor';
    
    populateMainOccurrenceSelectInModal(supplier ? supplier.servico_principal_id : '');

    if (supplier) {
        document.getElementById('supplier-name-modal').value = supplier.nome;
        document.getElementById('supplier-cnpj-modal').value = supplier.cnpj || '';
        document.getElementById('supplier-phone-modal').value = supplier.telefone || '';
        document.getElementById('supplier-has-contract-modal').checked = supplier.possui_contrato;
    }
    document.getElementById('supplier-form-modal').classList.remove('hidden');
}

function closeSupplierModal() {
    document.getElementById('supplier-form-modal').classList.add('hidden');
}

function populateMainOccurrenceSelectInModal(selectedId = null) {
    const select = document.getElementById('supplier-main-occurrence-modal');
    select.innerHTML = '<option value="">Selecione...</option>';
    state.occurrenceTypes.forEach(type => {
        const option = new Option(type.nome, type.id);
        select.add(option);
    });
    if (selectedId) {
        select.value = selectedId;
    }
}

async function handleSupplierFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('supplier-id').value;
    const nome = document.getElementById('supplier-name-modal').value.trim();
    if (!nome) {
        alert("O nome do fornecedor é obrigatório.");
        return;
    }

    const supplierData = {
        id: id || undefined,
        condominio_id: state.condoId,
        nome,
        cnpj: document.getElementById('supplier-cnpj-modal').value || null,
        telefone: document.getElementById('supplier-phone-modal').value || null,
        servico_principal_id: document.getElementById('supplier-main-occurrence-modal').value || null,
        possui_contrato: document.getElementById('supplier-has-contract-modal').checked
    };

    const { error } = await supabase.from('fornecedor').upsert(supplierData);

    if (error) {
        console.error("Erro ao salvar fornecedor:", error);
        alert(`Falha ao salvar: ${error.message}`);
    } else {
        alert("Fornecedor salvo com sucesso!");
        closeSupplierModal();
        await loadInitialData();
    }
}

async function handleDeleteSupplier(id, name) {
    if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) return;

    const { error } = await supabase.from('fornecedor').delete().eq('id', id);

    if (error) {
        console.error("Erro ao excluir fornecedor:", error);
        alert(`Falha ao excluir: ${error.message}`);
    } else {
        alert("Fornecedor excluído!");
        await loadInitialData();
    }
}

// --- INICIALIZA A PÁGINA ---
document.addEventListener('DOMContentLoaded', initializePage);