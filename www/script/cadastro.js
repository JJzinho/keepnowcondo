// www/script/cadastro.js

import { supabase } from './supabaseClient.js';
import { initializeLocationConfig, getLocationConfigData } from './location_config.js';

// --- Variáveis de Estado ---
let condoId = null;
let currentCondoData = null;

// --- Máscaras de Input ---
const setupInputMasks = () => {
    const masks = {
        '#cnpj': { mask: '00.000.000/0000-00' },
        '#cep': { mask: '00000-000' },
        '#telefone_condo': { mask: '+{55} (00) 00000-0000' },
        '#telefone_sindico': { mask: '+{55} (00) 00000-0000' },
        '#admin_telefone': { mask: '+{55} (00) 00000-0000' }
    };
    for (const selector in masks) {
        const element = document.querySelector(selector);
        if (element) IMask(element, masks[selector]);
    }
};

// --- Busca de CEP ---
const searchCep = async () => {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, '');
    const errorElement = document.getElementById('cep-error');
    const searchBtn = document.getElementById('cep-search-btn');

    if (cep.length !== 8) {
        errorElement.textContent = 'CEP inválido.';
        return;
    }

    errorElement.textContent = '';
    searchBtn.innerHTML = '<div class="spinner-small"></div>';
    searchBtn.disabled = true;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok) throw new Error('Falha ao buscar CEP.');
        const data = await response.json();
        if (data.erro) throw new Error('CEP não encontrado.');

        document.getElementById('endereco').value = data.logradouro || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = `${data.localidade} - ${data.uf}`;

    } catch (error) {
        errorElement.textContent = error.message;
        console.error('Erro no VIACEP:', error);
    } finally {
        searchBtn.innerHTML = '<span class="material-icons">search</span>';
        searchBtn.disabled = false;
    }
};

// --- Upload de Foto ---
const setupPhotoUpload = () => {
    const photoInput = document.getElementById('photo-input');
    const selectBtn = document.getElementById('select-photo-btn');
    const photoPreview = document.getElementById('photo-preview');

    selectBtn.addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = e => photoPreview.src = e.target.result;
            reader.readAsDataURL(file);
        }
    });
};

const uploadCondoPhoto = async (file, condoId) => {
    if (!file) return null;
    const fileName = `condo-photo-${condoId}-${Date.now()}`;
    const { data, error } = await supabase.storage
        .from('fotoscondominios')
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Erro no upload da foto:', error);
        throw new Error('Não foi possível fazer o upload da foto do condomínio.');
    }

    const { data: { publicUrl } } = supabase.storage
        .from('fotoscondominios')
        .getPublicUrl(data.path);

    return publicUrl;
};

// --- Validação do Formulário ---
const validateCnpj = (cnpj) => {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpj)) return false;
    // Lógica de validação do CNPJ (algoritmo)
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(0)) return false;
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += numbers.charAt(length - i) * pos--;
        if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result != digits.charAt(1)) return false;
    return true;
};

const validateForm = () => {
    const cnpjInput = document.getElementById('cnpj');
    const cnpjError = document.getElementById('cnpj-error');
    if (!validateCnpj(cnpjInput.value)) {
        cnpjError.textContent = 'CNPJ inválido.';
        cnpjInput.classList.add('invalid');
        cnpjInput.focus();
        return false;
    } else {
        cnpjError.textContent = '';
        cnpjInput.classList.remove('invalid');
    }
    // Adicionar outras validações se necessário
    return true;
};

// --- Submissão do Formulário (Ponto da Correção) ---
const submitForm = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    const form = document.getElementById('condo-form');
    const submitBtn = document.getElementById('submit-btn');
    const loadingIndicator = document.getElementById('loading-indicator');

    submitBtn.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    try {
        let photoUrl = currentCondoData?.foto_url || null;
        const photoFile = document.getElementById('photo-input').files[0];

        // Se há uma nova foto, faz o upload primeiro (precisamos de um ID)
        if (photoFile && condoId) {
             photoUrl = await uploadCondoPhoto(photoFile, condoId);
        }

        const cleanPhone = (value) => value.replace(/\D/g, '');

        // *** CORREÇÃO APLICADA AQUI ***
        // Captura os dados da configuração de localização
        const locationConfig = getLocationConfigData();

        const condoData = {
            nome_condo: document.getElementById('nome').value,
            cnpj_condo: document.getElementById('cnpj').value,
            cep_condo: document.getElementById('cep').value,
            endereco_condo: document.getElementById('endereco').value,
            bairro_condo: document.getElementById('bairro').value,
            cidade_condo: document.getElementById('cidade').value,
            telefone_c: cleanPhone(document.getElementById('telefone_condo').value),
            telefone_s: cleanPhone(document.getElementById('telefone_sindico').value),
            unidades_qnt: parseInt(document.getElementById('unidades').value, 10) || null,
            moradores_qnt: parseInt(document.getElementById('moradores').value, 10) || null,
            torres_qnt: parseInt(document.getElementById('torres').value, 10) || null,
            admin_nome_condo: document.getElementById('admin_nome').value,
            admin_telefone_condo: cleanPhone(document.getElementById('admin_telefone').value),
            foto_url_condo: photoUrl, // Começa com a URL atual
            location_config_data: locationConfig, // *** Passa o objeto JSON para a função RPC
        };

        if (condoId) {
            // Atualização
            condoData.condo_id_to_update = condoId;
            condoData.foto_url_condo = photoUrl; // Garante que a nova URL seja salva

            const { error } = await supabase.rpc('update_condo_details', condoData);
            if (error) throw error;
            alert('Condomínio atualizado com sucesso!');

        } else {
            // Criação
            const { data: newCondoId, error: createError } = await supabase.rpc('create_new_condo', condoData);
            if (createError) throw createError;

            // Se uma foto foi selecionada, faz o upload agora com o ID recém-criado
            if (photoFile) {
                const newPhotoUrl = await uploadCondoPhoto(photoFile, newCondoId);
                // Atualiza a URL da foto no registro recém-criado
                const { error: updatePhotoError } = await supabase
                    .from('condominio')
                    .update({ foto_url: newPhotoUrl })
                    .eq('id', newCondoId);
                if (updatePhotoError) throw updatePhotoError;
            }
            alert('Condomínio cadastrado com sucesso!');
        }

        window.location.href = './pages/inicio.html';

    } catch (error) {
        console.error('Erro ao salvar condomínio:', error);
        alert(`Erro ao salvar: ${error.message}`);
        submitBtn.style.display = 'block';
        loadingIndicator.style.display = 'none';
    }
};

// --- Carregamento de Dados para Edição ---
const loadCondoDataForEdit = async (id) => {
    try {
        const { data, error } = await supabase
            .from('condominio')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        currentCondoData = data;

        document.getElementById('nome').value = data.nome || '';
        document.getElementById('cnpj').value = data.cnpj || '';
        document.getElementById('cep').value = data.cep || '';
        document.getElementById('endereco').value = data.endereco || '';
        document.getElementById('bairro').value = data.bairro || '';
        document.getElementById('cidade').value = data.cidade || '';
        document.getElementById('telefone_condo').value = data.telefone_condo || '';
        document.getElementById('telefone_sindico').value = data.telefone_sindico || '';
        document.getElementById('unidades').value = data.unidades || '';
        document.getElementById('moradores').value = data.moradores || '';
        document.getElementById('torres').value = data.torres || '';
        document.getElementById('admin_nome').value = data.admin_nome || '';
        document.getElementById('admin_telefone').value = data.admin_telefone || '';
        document.getElementById('photo-preview').src = data.foto_url || 'https://sdmntprcentralus.oaiusercontent.com/files/00000000-7334-61f5-8321-7908be2dfdca/raw?se=2025-06-26T21%3A55%3A08Z&sp=r&sv=2024-08-04&sr=b&scid=bf7c5ce2-0d59-56af-ba3d-5220fc9a386f&skoid=0da8417a-a4c3-4a19-9b05-b82cee9d8868&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2025-06-26T19%3A20%3A20Z&ske=2025-06-27T19%3A20%3A20Z&sks=b&skv=2024-08-04&sig=Hzw3zUDp5Ag82NtK%2BrgcKHjch2R04xbjvhWTLTIWpAU%3D';

        // Inicializa a configuração de localização com os dados existentes
        initializeLocationConfig('location-config-wrapper', data.location_config);
        
        setupInputMasks(); // Aplica máscaras depois de preencher os valores
    } catch (error) {
        console.error('Erro ao carregar dados do condomínio:', error);
        alert('Não foi possível carregar os dados para edição.');
        window.location.href = './pages/inicio.html';
    }
};

// --- Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    condoId = urlParams.get('id');

    const pageTitle = document.getElementById('page-title');
    const submitBtn = document.getElementById('submit-btn');

    if (condoId) {
        pageTitle.textContent = 'Editar Condomínio';
        submitBtn.textContent = 'Salvar Alterações';
        loadCondoDataForEdit(condoId);
    } else {
        pageTitle.textContent = 'Cadastrar Novo Condomínio';
        submitBtn.textContent = 'Cadastrar Condomínio';
        // Inicializa a configuração de localização para um novo formulário
        initializeLocationConfig('location-config-wrapper');
        setupInputMasks();
    }

    setupPhotoUpload();
    document.getElementById('condo-form').addEventListener('submit', submitForm);
    document.getElementById('cep-search-btn').addEventListener('click', searchCep);
    document.getElementById('cnpj').addEventListener('input', () => {
        document.getElementById('cnpj-error').textContent = '';
        document.getElementById('cnpj').classList.remove('invalid');
    });
});