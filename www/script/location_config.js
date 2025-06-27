// www/script/location_config.js

// --- ESTADO DA CONFIGURAÇÃO ---
let locationState = { pavimentos: [] };
let currentEditingPavimentoIndex = null;

// --- DADOS PRÉ-DEFINIDOS (EXPANDIDO) ---
const PREDEFINED_DATA = [
    {
        pavimento: { id: 'acessos', nome: 'Acessos e Portaria' },
        sublocais: [
            { id: 'portaria', nome: 'Portaria / Guarita', equipamentos: [{ nome: 'Interfone', qtde: 1 }, { nome: 'Monitor de Câmeras (CFTV)', qtde: 1 }, { nome: 'Portão de Pedestres', qtde: 1 }, { nome: 'Clausura de Pedestres', qtde: 1 }] },
            { id: 'hall_social', nome: 'Hall Social de Entrada', equipamentos: [{ nome: 'Extintor (PQS)', qtde: 1 }, { nome: 'Iluminação de Emergência', qtde: 2 }, { nome: 'Porta de Vidro', qtde: 2 }] },
            { id: 'sala_espera', nome: 'Sala de Espera', equipamentos: [{ nome: 'Ar Condicionado', qtde: 1 }, { nome: 'Bebedouro', qtde: 1 }, { nome: 'Poltronas', qtde: 4 }] },
            { id: 'bicicletario', nome: 'Bicicletário', equipamentos: [{ nome: 'Vagas de Bicicleta', qtde: 20 }, { nome: 'Bomba de Ar', qtde: 1 }, { nome: 'Câmera de Segurança', qtde: 1 }] }
        ]
    },
    {
        pavimento: { id: 'garagem', nome: 'Garagem e Subsolo' },
        sublocais: [
            { id: 'garagem_area', nome: 'Área da Garagem', equipamentos: [{ nome: 'Portão de Veículos', qtde: 2 }, { nome: 'Extintor (Carreta)', qtde: 2 }, { nome: 'Câmera de Segurança', qtde: 8 }, { nome: 'Sensor de Monóxido', qtde: 4 }] },
            { id: 'casa_bombas', nome: 'Casa de Bombas', equipamentos: [{ nome: 'Bomba de Água Potável', qtde: 2 }, { nome: 'Bomba de Incêndio (Principal)', qtde: 1 }, { nome: 'Bomba de Incêndio (Jockey)', qtde: 1 }, { nome: 'Bomba de Drenagem', qtde: 1 }] },
            { id: 'gerador', nome: 'Sala do Gerador', equipamentos: [{ nome: 'Grupo Gerador', qtde: 1 }, { nome: 'Painel de Transferência (QTA)', qtde: 1 }, { nome: 'Tanque de Diesel (Litros)', qtde: 250 }] },
            { id: 'deposito', nome: 'Depósito / Almoxarifado', equipamentos: [{ nome: 'Prateleiras', qtde: 5 }, { nome: 'Iluminação', qtde: 2 }] }
        ]
    },
    {
        pavimento: { id: 'lazer_principal', nome: 'Lazer (Principal)' },
        sublocais: [
            { id: 'salao_festas', nome: 'Salão de Festas', equipamentos: [{ nome: 'Ar Condicionado', qtde: 2 }, { nome: 'Extintor (AP)', qtde: 1 }, { nome: 'Mesas', qtde: 15 }, { nome: 'Cadeiras', qtde: 60 }, { nome: 'Freezer', qtde: 1 }] },
            { id: 'piscina', nome: 'Piscina', equipamentos: [{ nome: 'Bomba do Filtro', qtde: 1 }, { nome: 'Ducha', qtde: 2 }, { nome: 'Refletor LED', qtde: 4 }, { nome: 'Casa de Máquinas da Piscina', qtde: 1 }] },
            { id: 'academia', nome: 'Academia', equipamentos: [{ nome: 'Esteira', qtde: 3 }, { nome: 'Bicicleta Ergométrica', qtde: 2 }, { nome: 'Estação de Musculação', qtde: 1 }, { nome: 'TV', qtde: 1 }] },
            { id: 'churrasqueira', nome: 'Área de Churrasqueira', equipamentos: [{ nome: 'Grelha', qtde: 2 }, { nome: 'Pia', qtde: 1 }, { nome: 'Frigobar', qtde: 1 }, { nome: 'Coifa', qtde: 1 }] },
        ]
    },
    {
        pavimento: { id: 'lazer_complementar', nome: 'Lazer (Complementar)' },
        sublocais: [
            { id: 'playground', nome: 'Playground', equipamentos: [{ nome: 'Balanço', qtde: 1 }, { nome: 'Escorregador', qtde: 1 }, { nome: 'Piso Emborrachado (m²)', qtde: 25 }, { nome: 'Gira-gira', qtde: 1 }] },
            { id: 'quadra', nome: 'Quadra Poliesportiva', equipamentos: [{ nome: 'Trave de Gol', qtde: 2 }, { nome: 'Tabela de Basquete', qtde: 2 }, { nome: 'Rede de Vôlei', qtde: 1 }, { nome: 'Refletor', qtde: 6 }] },
            { id: 'salao_jogos', nome: 'Salão de Jogos', equipamentos: [{ nome: 'Mesa de Sinuca', qtde: 1 }, { nome: 'Mesa de Pebolim (Totó)', qtde: 1 }, { nome: 'Mesa de Ping-Pong', qtde: 1 }] },
            { id: 'brinquedoteca', nome: 'Brinquedoteca', equipamentos: [{ nome: 'Piscina de Bolinhas', qtde: 1 }, { nome: 'TV', qtde: 1 }, { nome: 'Tatame EVA (m²)', qtde: 20 }] },
            { id: 'espaco_gourmet', nome: 'Espaço Gourmet', equipamentos: [{ nome: 'Forno de Pizza', qtde: 1 }, { nome: 'Cooktop', qtde: 1 }, { nome: 'Adega Climatizada', qtde: 1 }] },
            { id: 'sauna', nome: 'Sauna', equipamentos: [{ nome: 'Gerador de Vapor/Calor', qtde: 1 }, { nome: 'Ducha Interna', qtde: 1 }, { nome: 'Termômetro', qtde: 1 }] }
        ]
    },
    {
        pavimento: { id: 'cobertura', nome: 'Telhado e Cobertura' },
        sublocais: [
            { id: 'area_tecnica_telhado', nome: 'Área Técnica (Telhado)', equipamentos: [{ nome: 'Caixa d\'água', qtde: 2 }, { nome: 'Antena Coletiva', qtde: 1 }, { nome: 'Para-raios (SPDA)', qtde: 1 }, { nome: 'Placas Solares', qtde: 20 }] },
            { id: 'casa_maquinas', nome: 'Casa de Máquinas (Elevador)', equipamentos: [{ nome: 'Motor do Elevador', qtde: 2 }, { nome: 'Painel de Comando do Elevador', qtde: 2 }, { nome: 'Extintor (CO2)', qtde: 1 }] }
        ]
    },
    {
        pavimento: { id: 'areas_servico', nome: 'Áreas de Serviço e Técnicas' },
        sublocais: [
            { id: 'deposito_lixo', nome: 'Depósito de Lixo', equipamentos: [{ nome: 'Contêiner de Lixo Orgânico', qtde: 4 }, { nome: 'Contêiner de Lixo Reciclável', qtde: 4 }] },
            { id: 'vestiario', nome: 'Vestiário de Funcionários', equipamentos: [{ nome: 'Armários', qtde: 10 }, { nome: 'Chuveiro Elétrico', qtde: 2 }] },
            { id: 'sala_medidores', nome: 'Sala de Medidores', equipamentos: [{ nome: 'Medidores de Água', qtde: 50 }, { nome: 'Medidores de Gás', qtde: 50 }] }
        ]
    }
];

// --- INICIALIZAÇÃO GERAL ---
export function initializeLocationConfig(containerId, existingConfig = {}) {
    if (existingConfig && existingConfig.pavimentos) {
        locationState = JSON.parse(JSON.stringify(existingConfig)); // Deep copy
    } else {
        locationState = { pavimentos: [] }; // Garante que comece zerado se não houver config
    }
    renderPavimentosList();
    setupEventListeners();
}

function setupEventListeners() {
    // Botões principais
    document.getElementById('add-pavimento-btn').onclick = () => openPavimentoModal();
    document.getElementById('add-predefined-btn').onclick = showPredefinedModal;

    // Modal de pré-definidos
    const predefinedModal = document.getElementById('predefined-locations-modal');
    predefinedModal.querySelector('.close-modal-btn').onclick = () => toggleModal(predefinedModal, false);

    // Modal de configuração de pavimento
    const pavModal = document.getElementById('pavimento-config-modal');
    pavModal.querySelector('.close-modal-btn').onclick = () => toggleModal(pavModal, false);
    document.getElementById('pavimento-modal-add-sublocal').onclick = () => renderSublocalAccordion(null, true);
    document.getElementById('pavimento-modal-save-btn').onclick = savePavimentoFromModal;
}

// --- RENDERIZAÇÃO DA UI PRINCIPAL ---
function renderPavimentosList() {
    const container = document.getElementById('pavimentos-list-container');
    if (!container) return; 
    
    container.innerHTML = ''; // Limpa a lista completamente

    if (locationState.pavimentos.length === 0) {
        const msg = document.createElement('p');
        msg.id = 'no-pavimentos-msg';
        msg.className = 'empty-state-msg';
        msg.textContent = 'Nenhum pavimento adicionado.';
        container.appendChild(msg);
    } else {
        locationState.pavimentos.forEach((pav, index) => {
            const item = document.createElement('div');
            item.className = 'pavimento-list-item';
            item.innerHTML = `
                <span class="pavimento-list-item-name">${pav.nome}</span>
                <div class="pavimento-list-item-actions">
                    <button type="button" class="edit-btn" title="Editar"><span class="material-icons">edit</span></button>
                    <button type="button" class="delete-btn" title="Remover"><span class="material-icons">delete_outline</span></button>
                </div>
            `;
            item.querySelector('.edit-btn').onclick = () => openPavimentoModal(index);
            item.querySelector('.delete-btn').onclick = () => deletePavimento(index);
            container.appendChild(item);
        });
    }
}


// --- LÓGICA DO MODAL DE CONFIGURAÇÃO DE PAVIMENTO ---

function openPavimentoModal(index = null) {
    currentEditingPavimentoIndex = index;
    const modal = document.getElementById('pavimento-config-modal');
    const nameInput = document.getElementById('pavimento-modal-name');
    const sublocaisContainer = document.getElementById('pavimento-modal-sublocais-container');
    sublocaisContainer.innerHTML = ''; // Limpa

    if (index !== null) { // Editando
        const pavData = locationState.pavimentos[index];
        nameInput.value = pavData.nome;
        if (pavData.sublocais) {
            pavData.sublocais.forEach(sub => renderSublocalAccordion(sub));
        }
    } else { // Criando
        nameInput.value = '';
    }
    toggleModal(modal, true);
    nameInput.focus();
}

function savePavimentoFromModal() {
    const modal = document.getElementById('pavimento-config-modal');
    const pavNome = document.getElementById('pavimento-modal-name').value.trim();
    if (!pavNome) {
        alert('O nome do pavimento é obrigatório.');
        return;
    }

    const newSublocais = [];
    document.querySelectorAll('#pavimento-modal-sublocais-container .sublocal-accordion').forEach(accordion => {
        const subNome = accordion.querySelector('.sublocal-name-input').value.trim();
        if (!subNome) return;

        const subData = { nome: subNome, equipamentos: [] };
        accordion.querySelectorAll('.equipamento-row').forEach(row => {
            const eqNome = row.querySelector('.equipamento-name-input').value.trim();
            const eqQtde = parseInt(row.querySelector('.equipamento-qty-input').value, 10) || 1;
            if (eqNome) {
                subData.equipamentos.push({ nome: eqNome, quantidade: eqQtde });
            }
        });
        newSublocais.push(subData);
    });

    const newPavData = { nome: pavNome, sublocais: newSublocais };

    if (currentEditingPavimentoIndex !== null) {
        locationState.pavimentos[currentEditingPavimentoIndex] = newPavData;
    } else {
        locationState.pavimentos.push(newPavData);
    }

    renderPavimentosList();
    toggleModal(modal, false);
}

function deletePavimento(index) {
    const pavNome = locationState.pavimentos[index].nome;
    if (confirm(`Tem certeza que deseja remover o pavimento "${pavNome}"?`)) {
        locationState.pavimentos.splice(index, 1);
        renderPavimentosList();
    }
}

// --- LÓGICA DO ACORDEÃO DE SUBLOCAL (DENTRO DO MODAL) ---

function renderSublocalAccordion(sublocalData = null, shouldOpen = false) {
    const container = document.getElementById('pavimento-modal-sublocais-container');
    const accordion = document.createElement('div');
    accordion.className = 'sublocal-accordion';

    const subNome = sublocalData ? sublocalData.nome : '';
    accordion.innerHTML = `
        <div class="sublocal-accordion-header">
            <span class="material-icons toggle-icon">chevron_right</span>
            <input type="text" class="sublocal-name-input" value="${subNome}" placeholder="Nome do Sublocal">
            <button type="button" class="delete-btn" title="Remover Sublocal"><span class="material-icons">delete</span></button>
        </div>
        <div class="sublocal-accordion-body">
            <table class="equipamentos-table">
                <thead><tr><th>Equipamento</th><th>Qtde</th><th>Ação</th></tr></thead>
                <tbody></tbody>
            </table>
            <button type="button" class="add-equipamento-btn">+ Adicionar equipamento</button>
        </div>
    `;

    const tableBody = accordion.querySelector('tbody');
    if (sublocalData && sublocalData.equipamentos) {
        sublocalData.equipamentos.forEach(eq => tableBody.appendChild(createEquipamentoRow(eq.nome, eq.quantidade)));
    }

    const header = accordion.querySelector('.sublocal-accordion-header');
    const body = accordion.querySelector('.sublocal-accordion-body');
    const toggleIcon = accordion.querySelector('.toggle-icon');

    header.onclick = (e) => {
        if (e.target.matches('.sublocal-name-input, .delete-btn, .delete-btn *')) return;
        body.classList.toggle('open');
        toggleIcon.classList.toggle('open');
    };
    accordion.querySelector('.delete-btn').onclick = () => accordion.remove();
    accordion.querySelector('.add-equipamento-btn').onclick = () => {
        tableBody.appendChild(createEquipamentoRow());
    };

    container.appendChild(accordion);

    if (shouldOpen) {
        body.classList.add('open');
        toggleIcon.classList.add('open');
        accordion.querySelector('.sublocal-name-input').focus();
    }
}

function createEquipamentoRow(nome = '', qtde = 1) {
    const row = document.createElement('tr');
    row.className = 'equipamento-row';
    row.innerHTML = `
        <td data-label="Equipamento"><input type="text" class="equipamento-name-input" value="${nome}" placeholder="Nome do Equipamento"></td>
        <td data-label="Qtde"><input type="number" class="equipamento-qty-input" value="${qtde}" min="1"></td>
        <td data-label="Ação"><button type="button" class="delete-btn">&times;</button></td>
    `;
    row.querySelector('.delete-btn').onclick = () => row.remove();
    return row;
}

// --- LÓGICA DO MODAL DE PRÉ-DEFINIDOS ---
function showPredefinedModal() {
    const modal = document.getElementById('predefined-locations-modal');
    const modalBody = document.getElementById('predefined-modal-body');
    modalBody.innerHTML = ''; 

    PREDEFINED_DATA.forEach(pavimentoData => {
        const pavDiv = document.createElement('div');
        pavDiv.className = 'predefined-pavimento';
        pavDiv.innerHTML = `
            <div class="predefined-pavimento-header">
                <input type="checkbox" id="predefined-${pavimentoData.pavimento.id}">
                <label for="predefined-${pavimentoData.pavimento.id}">${pavimentoData.pavimento.nome}</label>
            </div>
            <div class="predefined-sublocais-list">
                ${pavimentoData.sublocais.map(sub => `
                    <div class="predefined-sublocal">
                        <input type="checkbox" id="predefined-${sub.id}" data-pavimento-id="${pavimentoData.pavimento.id}">
                        <label for="predefined-${sub.id}">${sub.nome}</label>
                    </div>
                `).join('')}
            </div>
        `;
        modalBody.appendChild(pavDiv);
    });

    const addButton = document.createElement('button');
    addButton.type = 'button'; 
    addButton.textContent = 'Adicionar Selecionados';
    addButton.className = 'location-action-btn';
    addButton.style.width = '100%';
    addButton.style.marginTop = '1.5rem';
    addButton.onclick = addSelectedPredefined;
    modalBody.appendChild(addButton);

    toggleModal(modal, true);
}

function addSelectedPredefined() {
    const selectedSublocalCheckboxes = document.querySelectorAll('#predefined-locations-modal .predefined-sublocal input[type="checkbox"]:checked');
    
    selectedSublocalCheckboxes.forEach(checkbox => {
        const sublocalId = checkbox.id.replace('predefined-', '');
        const pavId = checkbox.dataset.pavimentoId;

        const pavDataTemplate = PREDEFINED_DATA.find(p => p.pavimento.id === pavId);
        if (!pavDataTemplate) return;
        
        const subDataTemplate = pavDataTemplate.sublocais.find(s => s.id === sublocalId);
        if (!subDataTemplate) return;

        let targetPav = locationState.pavimentos.find(p => p.nome.toLowerCase() === pavDataTemplate.pavimento.nome.toLowerCase());
        
        if (!targetPav) {
            targetPav = { nome: pavDataTemplate.pavimento.nome, sublocais: [] };
            locationState.pavimentos.push(targetPav);
        }

        const sublocalExists = targetPav.sublocais.some(s => s.nome.toLowerCase() === subDataTemplate.nome.toLowerCase());

        if (!sublocalExists) {
            targetPav.sublocais.push(JSON.parse(JSON.stringify(subDataTemplate))); 
        }
    });

    renderPavimentosList();
    toggleModal(document.getElementById('predefined-locations-modal'), false);
}


// --- FUNÇÕES UTILITÁRIAS ---
function toggleModal(modalElement, show) {
    if (modalElement) {
        modalElement.classList.toggle('hidden', !show);
    }
}

export function getLocationConfigData() {
    return locationState;
}