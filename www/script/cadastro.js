import { supabase } from './supabaseClient.js';

// ---- SELEÇÃO DOS ELEMENTOS DO DOM ----
const form = document.getElementById('condo-form');
const pageTitle = document.getElementById('page-title'); // Assumindo que você tem um <h1> ou <h2> com este ID
const photoPreview = document.getElementById('photo-preview');
const selectPhotoButton = document.getElementById('select-photo-btn');
const submitButton = document.getElementById('submit-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const cnpjInput = document.getElementById('cnpj');
const cepInput = document.getElementById('cep');
const cnpjError = document.getElementById('cnpj-error');
const photoInput = document.getElementById('photo-input');

// ---- ESTADO DO FORMULÁRIO ----
let photoFile = null; // Armazena o novo ficheiro da foto (Blob/File)
let currentCondoId = null; // AJUSTE: Armazena o ID do condomínio em modo de edição
let originalPhotoUrl = null; // AJUSTE: Armazena a URL da foto original

// ---- VALIDAÇÃO DE CNPJ (Função mantida como estava) ----
function validateCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj === '' || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
    let size = cnpj.length - 2;
    let numbers = cnpj.substring(0, size);
    let digits = cnpj.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result != digits.charAt(0)) return false;
    size = size + 1;
    numbers = cnpj.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
        sum += numbers.charAt(size - i) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return result == digits.charAt(1);
}

// ---- BUSCA DE ENDEREÇO VIA CEP (Função mantida como estava) ----
async function fetchAddressFromCEP() {
    const cep = cepInput.value.replace(/\D/g, '');
    if (cep.length !== 8) return;
    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('CEP não encontrado');
        const data = await response.json();
        if (data.erro) {
            alert('CEP não encontrado. Verifique o número digitado.');
            return;
        }
        document.getElementById('endereco').value = data.logradouro || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = data.localidade || '';
    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Não foi possível buscar o endereço. Verifique a sua conexão e o CEP digitado.');
    }
}

// ---- SELEÇÃO DE FOTO (Função mantida como estava) ----
async function selectPhoto() {
    if (window.Capacitor && window.Capacitor.isPluginAvailable('Camera')) {
        try {
            const { Camera } = Capacitor.Plugins;
            const image = await Camera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: 'uri',
                source: 'PROMPT',
                promptLabelHeader: 'Escolha uma opção',
                promptLabelPhoto: 'Escolher da galeria',
                promptLabelPicture: 'Tirar uma foto'
            });
            const response = await fetch(image.webPath);
            photoFile = await response.blob();
            photoPreview.src = image.webPath;
        } catch (error) {
            if (error.message !== "User cancelled photos app") {
                 console.error('Erro na câmera do Capacitor:', error);
                 alert('Não foi possível usar a câmera.');
            }
        }
    } else {
        photoInput.click();
    }
}
photoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        photoFile = file;
        photoPreview.src = URL.createObjectURL(file);
    }
});


// ---- AJUSTE: FUNÇÃO PARA PREENCHER O FORMULÁRIO COM DADOS EXISTENTES ----
function populateForm(condoData) {
    document.getElementById('nome').value = condoData.nome || '';
    cnpjInput.value = condoData.cnpj || '';
    cepInput.value = condoData.cep || '';
    document.getElementById('endereco').value = condoData.endereco || '';
    document.getElementById('bairro').value = condoData.bairro || '';
    document.getElementById('cidade').value = condoData.cidade || '';
    document.getElementById('telefone_condo').value = condoData.telefone_condo || '';
    document.getElementById('telefone_sindico').value = condoData.telefone_sindico || '';
    document.getElementById('unidades').value = condoData.unidades || '';
    document.getElementById('moradores').value = condoData.moradores || '';
    document.getElementById('torres').value = condoData.torres || '';
    document.getElementById('admin_nome').value = condoData.admin_nome || '';
    document.getElementById('admin_telefone').value = condoData.admin_telefone || '';

    if (condoData.foto_url) {
        photoPreview.src = condoData.foto_url;
        originalPhotoUrl = condoData.foto_url;
    }
    // Aplica as máscaras novamente após preencher os dados
    IMask(document.getElementById('telefone_condo'), { mask: '+{55} (00) 0000[0]-0000' });
    IMask(document.getElementById('telefone_sindico'), { mask: '+{55} (00) 0000[0]-0000' });
    IMask(document.getElementById('admin_telefone'), { mask: '+{55} (00) 0000[0]-0000' });
}


// ---- AJUSTE: FUNÇÃO PARA CARREGAR DADOS DO CONDOMÍNIO PARA EDIÇÃO ----
async function loadCondoForEditing(id) {
    try {
        const { data, error } = await supabase.rpc('get_user_condo_details', { condo_id_param: id });
        if (error) throw error;
        if (data && data.length > 0) {
            populateForm(data[0]);
        } else {
            throw new Error("Condomínio não encontrado ou você não tem permissão para editá-lo.");
        }
    } catch (error) {
        console.error("Erro ao carregar dados do condomínio:", error);
        alert(error.message);
        window.location.href = '../condo.html'; // Volta para a página principal em caso de erro
    }
}


// ---- AJUSTE: LÓGICA DE ENVIO DO FORMULÁRIO ATUALIZADA ----
async function handleFormSubmit(event) {
    event.preventDefault();

    if (!validateCNPJ(cnpjInput.value)) {
        alert('O CNPJ inserido é inválido. Por favor, corrija.');
        cnpjInput.focus();
        return;
    }

    submitButton.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    let finalPhotoUrl = originalPhotoUrl; // Começa com a foto original

    try {
        // Se uma nova foto foi selecionada, faz o upload
        if (photoFile) {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilizador não autenticado.');
            
            const fileExtension = photoFile.name ? photoFile.name.split('.').pop() : 'jpg';
            const filePath = `public/${user.id}/${Date.now()}.${fileExtension}`;
            
            const { error: uploadError } = await supabase.storage
                .from('fotoscondominios')
                .upload(filePath, photoFile);
            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('fotoscondominios')
                .getPublicUrl(filePath);
            
            finalPhotoUrl = urlData.publicUrl;
        }

        // Prepara os dados para enviar para a função RPC
        const condoData = {
            nome_condo: document.getElementById('nome').value,
            cnpj_condo: cnpjInput.value,
            cep_condo: cepInput.value,
            endereco_condo: document.getElementById('endereco').value,
            bairro_condo: document.getElementById('bairro').value,
            cidade_condo: document.getElementById('cidade').value,
            telefone_c: document.getElementById('telefone_condo').value,
            telefone_s: document.getElementById('telefone_sindico').value,
            unidades_qnt: parseInt(document.getElementById('unidades').value) || 0,
            moradores_qnt: parseInt(document.getElementById('moradores').value) || 0,
            torres_qnt: parseInt(document.getElementById('torres').value) || 0,
            admin_nome_condo: document.getElementById('admin_nome').value,
            admin_telefone_condo: document.getElementById('admin_telefone').value,
            foto_url_condo: finalPhotoUrl
        };

        // Decide se vai CRIAR ou ATUALIZAR
        if (currentCondoId) {
            // -- MODO EDIÇÃO --
            const { error: rpcError } = await supabase.rpc('update_condo_details', {
                condo_id_to_update: currentCondoId,
                ...condoData
            });
            if (rpcError) throw rpcError;
            alert('Condomínio atualizado com sucesso!');
        } else {
            // -- MODO CRIAÇÃO --
            const { data: rpcData, error: rpcError } = await supabase.rpc('create_new_condo', {
                ...condoData,
                location_config_data: {} // Mantido para compatibilidade com a função
            });
            if (rpcError) throw rpcError;
            alert('Condomínio registado com sucesso!');
            sessionStorage.setItem('selectedCondoId', rpcData);
        }

        window.location.href = '../condo.html';

    } catch (error) {
        console.error('Erro ao submeter formulário:', error);
        alert(`Falha na operação: ${error.message}`);
    } finally {
        submitButton.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }
}


// ---- INICIALIZAÇÃO E EVENTOS ----
document.addEventListener('DOMContentLoaded', () => {
    // Aplica as máscaras aos campos
    const phoneOptions = { mask: '+{55} (00) 0000[0]-0000' };
    IMask(document.getElementById('telefone_condo'), phoneOptions);
    IMask(document.getElementById('telefone_sindico'), phoneOptions);
    IMask(document.getElementById('admin_telefone'), phoneOptions);
    IMask(cepInput, { mask: '00000-000' });
    IMask(cnpjInput, { mask: '00.000.000/0000-00' });

    // Verifica se está em modo de edição
    const urlParams = new URLSearchParams(window.location.search);
    const condoIdFromUrl = urlParams.get('id');

    if (condoIdFromUrl) {
        // --- MODO EDIÇÃO ---
        currentCondoId = condoIdFromUrl;
        if (pageTitle) pageTitle.textContent = "Editar Condomínio";
        submitButton.textContent = "Salvar Alterações";
        loadCondoForEditing(currentCondoId);
    } else {
        // --- MODO CRIAÇÃO ---
        if (pageTitle) pageTitle.textContent = "Cadastrar Novo Condomínio";
        submitButton.textContent = "Cadastrar";
    }

    // Adiciona os eventos
    selectPhotoButton.addEventListener('click', selectPhoto);
    form.addEventListener('submit', handleFormSubmit);
    cepInput.addEventListener('blur', fetchAddressFromCEP);

    cnpjInput.addEventListener('blur', () => {
        if (cnpjInput.value && !validateCNPJ(cnpjInput.value)) {
            cnpjError.textContent = 'CNPJ inválido.';
            cnpjInput.classList.add('invalid');
        } else {
            cnpjError.textContent = '';
            cnpjInput.classList.remove('invalid');
        }
    });
});