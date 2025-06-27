// script/inicio.js

import { supabase } from './supabaseClient.js';
// NOVO: Importa as funções do nosso sistema de loading centralizado.
import { showLoading, hideLoading } from './ui.js';

/**
 * Guarda o ID do condomínio selecionado no sessionStorage e redireciona.
 * @param {string} condoId - O UUID do condomínio clicado.
 */
function navigateToCondo(condoId) {
    if (!condoId) {
        console.error("ID do condomínio é inválido.");
        return;
    }
    sessionStorage.setItem('selectedCondoId', condoId);
    window.location.href = './condo.html';
}

/**
 * Redireciona para a página de cadastro de um novo condomínio.
 */
function addCondo() {
    window.location.href = './pages/cadastro.html';
}

/**
 * Renderiza a lista de condomínios na tela.
 * @param {Array<object>} condos - Um array com os objetos de condomínio.
 */
function renderCondoList(condos) {
    const container = document.getElementById('condo-list-container');
    if (!container) return;

    container.innerHTML = ''; 

    if (!condos || condos.length === 0) {
        container.innerHTML = '<p>Nenhum condomínio encontrado para seu usuário.</p>';
        return;
    }

    condos.forEach(condo => {
        const condoItem = document.createElement('div');
        condoItem.className = 'condo-item';
        condoItem.dataset.condoId = condo.id;

        condoItem.innerHTML = `
            <div class="condo-info">
                <div class="condo-icon blue"></div>
                <span class="condo-name">${condo.nome}</span>
            </div>
            <span class="material-icons condo-arrow">play_arrow</span>
        `;
        
        condoItem.addEventListener('click', () => navigateToCondo(condo.id));
        
        container.appendChild(condoItem);
    });
}

/**
 * Função principal que roda quando a página carrega.
 */
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/www/index.html'); // ou a página de login correta
        return;
    }

    document.getElementById('add-condo-btn').addEventListener('click', addCondo);

    // NOVO: Mostra a tela de loading antes de buscar os dados.
    showLoading();

    try {
        const { data, error } = await supabase.rpc('get_user_condos');
        if (error) throw error;
        renderCondoList(data);
    } catch (error) {
        console.error('Erro ao buscar lista de condomínios:', error.message);
        const container = document.getElementById('condo-list-container');
        if (container) container.innerHTML = '<p style="color: red;">Falha ao carregar condomínios.</p>';
    } finally {
        // NOVO: Garante que a tela de loading seja escondida ao final,
        // tanto em caso de sucesso quanto de falha.
        hideLoading();
    }
});