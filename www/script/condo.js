import { supabase } from './supabaseClient.js';

// Variável para guardar os dados do condomínio em memória
let currentCondoData = null;

// --- FUNÇÕES DE FORMATAÇÃO (Sem alterações) ---
const cleanInputDisplay = (value) => ('' + value).replace(/\D/g, '');

const formatCepDisplay = (cep) => {
    const cleaned = cleanInputDisplay(cep);
    if (!cleaned || cleaned.length !== 8) return cep;
    return cleaned.replace(/^(\d{5})(\d{3})$/, '$1-$2');
};

const formatPhoneDisplay = (phone) => {
    const cleaned = cleanInputDisplay(phone);
    if (!cleaned) return "";
    if (cleaned.startsWith('55') && cleaned.length >= 12) {
        const ddd = cleaned.substring(2, 4);
        const numberPart = cleaned.substring(4);
        if (numberPart.length === 9) return `+55 (${ddd}) ${numberPart.substring(0, 5)}-${numberPart.substring(5)}`;
        if (numberPart.length === 8) return `+55 (${ddd}) ${numberPart.substring(0, 4)}-${numberPart.substring(4)}`;
    }
    if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    return phone;
};

const formatCnpjDisplay = (cnpj) => {
    const cleaned = cleanInputDisplay(cnpj);
    if (!cleaned || cleaned.length !== 14) return cnpj;
    return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const showModalDisplay = (modal) => {
    if (modal) modal.classList.remove('hidden');
};
const hideModalDisplay = (modal) => {
    if (modal) modal.classList.add('hidden');
};


// --- ATUALIZAÇÃO DA UI ---
function updateCondoDataOnUI(data) {
    if (!data) return;

    // CORREÇÃO: Adicionadas verificações para cada elemento antes de usá-lo.
    const condoNameButtonSpan = document.getElementById('condo-name-display-button');
    if (condoNameButtonSpan) condoNameButtonSpan.textContent = data.nome || "Nome Indefinido";

    const condoNameHeader = document.querySelector('.app-bar-title');
    if (condoNameHeader) condoNameHeader.textContent = data.nome;

    const condoImageDisplay = document.getElementById('condo-image-display');
    if (condoImageDisplay) condoImageDisplay.src = data.foto_url || "./assets/icons/image-placeholder.png";
    
    const modalNameDisplay = document.getElementById('modal-name-display');
    if (modalNameDisplay) modalNameDisplay.textContent = data.nome || '';
    
    const modalLocation = document.getElementById('modal-location');
    if (modalLocation) modalLocation.textContent = data.endereco || '';

    const modalBairroDisplay = document.getElementById('modal-bairro-display');
    if (modalBairroDisplay) modalBairroDisplay.textContent = data.bairro || '';

    const modalCep = document.getElementById('modal-cep');
    if (modalCep) modalCep.textContent = formatCepDisplay(data.cep || '');

    const modalCity = document.getElementById('modal-city');
    if (modalCity) modalCity.textContent = data.cidade || '';

    const modalPhone = document.getElementById('modal-phone');
    if (modalPhone) modalPhone.textContent = formatPhoneDisplay(data.telefone_condo || '');

    const modalManagerPhone = document.getElementById('modal-manager-phone');
    if (modalManagerPhone) modalManagerPhone.textContent = formatPhoneDisplay(data.telefone_sindico || '');

    const modalCnpj = document.getElementById('modal-cnpj');
    if (modalCnpj) modalCnpj.textContent = formatCnpjDisplay(data.cnpj || '');
    
    const modalImagePreview = document.getElementById('modal-image-preview');
    if (modalImagePreview) {
        modalImagePreview.src = data.foto_url || '';
        modalImagePreview.style.display = (data.foto_url) ? 'block' : 'none';
    }
    
    const modalResidents = document.getElementById('modal-residents');
    if (modalResidents) modalResidents.textContent = data.moradores || '0';

    const modalUnits = document.getElementById('modal-units');
    if (modalUnits) modalUnits.textContent = data.unidades || '0';

    const modalBlocks = document.getElementById('modal-blocks');
    if (modalBlocks) modalBlocks.textContent = data.torres || '0';

    const modalAdmin = document.getElementById('modal-admin');
    if (modalAdmin) modalAdmin.textContent = data.admin_nome || '';

    const modalAdminPhoneDisplay = document.getElementById('modal-admin-phone-display');
    if (modalAdminPhoneDisplay) modalAdminPhoneDisplay.textContent = formatPhoneDisplay(data.admin_telefone || '');

    const locationConfigDisplayContainer = document.getElementById('modal-location-config-display');
    if (locationConfigDisplayContainer) {
        renderLocationConfigForDisplayUI(data.location_config, locationConfigDisplayContainer);
    }
}


// --- RENDERIZAÇÃO DE LOCALIZAÇÃO (ATUALIZADO) ---
function renderLocationConfigForDisplayUI(configData, containerElement) {
    if (!configData || !configData.pavimentos || configData.pavimentos.length === 0) {
        if (containerElement) containerElement.innerHTML = '<p>Nenhuma configuração de localização definida.</p>';
        return;
    }

    let html = '';
    configData.pavimentos.forEach(pav => {
        html += `<div class="pavimento-display-group">`;
        html += `<h4>${pav.nome}</h4>`;
        if (pav.sublocais && pav.sublocais.length > 0) {
            html += `<ul class="sublocal-display-list">`;
            pav.sublocais.forEach(sub => {
                html += `<li><strong>${sub.nome}</strong>`;
                if (sub.equipamentos && sub.equipamentos.length > 0) {
                    html += `<ul class="equipamento-display-list">`;
                    sub.equipamentos.forEach(eq => {
                        html += `<li>${eq.nome} (Qtde: ${eq.quantidade})</li>`;
                    });
                    html += `</ul>`;
                }
                html += `</li>`;
            });
            html += `</ul>`;
        }
        html += `</div>`;
    });

    containerElement.innerHTML = html;
}


// --- LÓGICA DO GUIDE MODAL ---
const guideSummariesDisplay = {
    infoGeraisLoc: { title: "Informações Gerais e Localizações", summary: "Consulte os dados cadastrais..." },
    documentos: { title: "Documentos", summary: "Armazene e gerencie documentos..." },
    planoGestao: { title: "Plano de Gestão (Check-up)", summary: "Crie e acompanhe o plano de gestão..." },
    aberturaChamado: { title: "Abertura de Chamado", summary: "Registre formalmente problemas..." },
    fornecedores: { title: "Fornecedores e Serviços", summary: "Administre os fornecedores..." },
    acompanhamentoChamados: { title: "Acompanhamento de Chamados", summary: "Acompanhe o status dos chamados..." }
};

function openGuideModalDisplay(guideId) {
    const content = guideSummariesDisplay[guideId];
    const guideModal = document.getElementById('guide-modal');
    const guideModalTitle = document.getElementById('guide-modal-title');
    const guideModalBody = document.getElementById('guide-modal-body');

    if (content && guideModal && guideModalTitle && guideModalBody) {
        guideModalTitle.textContent = content.title;
        guideModalBody.innerHTML = content.summary;
        showModalDisplay(guideModal);
    }
}

function closeGuideModalDisplay() {
    const guideModal = document.getElementById('guide-modal');
    if (guideModal) {
        hideModalDisplay(guideModal);
    }
}


// --- FUNÇÃO PARA O BOTÃO 'EDITAR' ---
function setupEditButton(condoId) {
    const editButton = document.getElementById('edit-condo-btn');
    if (editButton) {
        editButton.addEventListener('click', () => {
            window.location.href = `cadastro.html?id=${condoId}`;
        });
    } else {
        console.warn('Elemento com id "edit-condo-btn" não foi encontrado na página.');
    }
}


// --- FUNÇÃO PRINCIPAL PARA BUSCAR DADOS ---
async function initializeCondoPage() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/www/index.html');
        return;
    }

    const selectedCondoId = sessionStorage.getItem('selectedCondoId');
    if (!selectedCondoId) {
        alert('Nenhum condomínio selecionado. Redirecionando...');
        window.location.replace('./pages/inicio.html');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('get_user_condo_details', {
            condo_id_param: selectedCondoId
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
            currentCondoData = data[0];
            updateCondoDataOnUI(currentCondoData);
            setupEditButton(currentCondoData.id);
        } else {
            throw new Error('Não foi possível carregar os dados do condomínio ou você não tem acesso.');
        }
    } catch (error) {
        console.error("Erro ao inicializar a página:", error.message);
        const body = document.querySelector('body');
        if (body) body.innerHTML = `<h1>Erro ao carregar dados. Verifique o console.</h1><p>${error.message}</p>`;
    }
}


// --- EVENT LISTENER PRINCIPAL ---
document.addEventListener('DOMContentLoaded', () => {
    initializeCondoPage();
    
    const showMoreBtnCondoName = document.getElementById('show-more-btn-condo-name');
    const infoModal = document.getElementById('info-modal');
    const navbarToggle = document.getElementById('navbar-toggle');
    const navbarDropdown = document.getElementById('navbar-dropdown');
    const guideModalCloseBtn = document.getElementById('guide-modal-close-btn');

    if (navbarToggle) {
        navbarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (navbarDropdown) navbarDropdown.classList.toggle('show');
        });
    }

    document.addEventListener('click', (e) => {
        if (navbarToggle && navbarDropdown && !navbarToggle.contains(e.target) && !navbarDropdown.contains(e.target)) {
            navbarDropdown.classList.remove('show');
        }
        if (e.target.classList.contains('modal-close-x') || e.target.classList.contains('modal-overlay')) {
            const modal = e.target.closest('.modal-overlay');
            if (modal) hideModalDisplay(modal);
        }
    });

    if (showMoreBtnCondoName) {
        showMoreBtnCondoName.addEventListener('click', () => {
            if (currentCondoData && infoModal) {
                showModalDisplay(infoModal);
            }
        });
    }
    
    const guideButtons = document.querySelectorAll('.guide-btn');
    guideButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const guideId = button.dataset.guideId;
            openGuideModalDisplay(guideId);
        });
    });

    if (guideModalCloseBtn) {
        guideModalCloseBtn.addEventListener('click', closeGuideModalDisplay);
    }
});