// script/inicio.js
import { supabase } from './supabaseClient.js';

/**
 * Guarda o ID do condomínio selecionado no sessionStorage e redireciona.
 * @param {string} condoId - O UUID do condomínio clicado.
 */
function navigateToCondo(condoId) {
    if (!condoId) {
        console.error("ID do condomínio é inválido.");
        return;
    }
    // Armazenamos o ID na sessão do navegador para a próxima página saber qual condomínio carregar.
    sessionStorage.setItem('selectedCondoId', condoId);
    window.location.href = './condo.html'; // Redireciona para o painel principal
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

    container.innerHTML = ''; // Limpa a mensagem de "carregando"

    if (!condos || condos.length === 0) {
        container.innerHTML = '<p>Nenhum condomínio encontrado para seu usuário.</p>';
        return;
    }

    condos.forEach(condo => {
        const condoItem = document.createElement('div');
        condoItem.className = 'condo-item';
        // Adicionamos o ID do condomínio ao elemento para referência
        condoItem.dataset.condoId = condo.id;

        condoItem.innerHTML = `
            <div class="condo-info">
                <div class="condo-icon blue"></div>
                <span class="condo-name">${condo.nome}</span>
            </div>
            <span class="material-icons condo-arrow">play_arrow</span>
        `;

        // Adiciona o evento de clique para navegar para o condomínio selecionado
        condoItem.addEventListener('click', () => navigateToCondo(condo.id));
        
        container.appendChild(condoItem);
    });
}


/**
 * Função principal que roda quando a página carrega.
 */
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Proteção: Garante que o usuário está logado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.replace('/www/index.html');
        return;
    }

    // 2. Associa a função ao botão de adicionar
    document.getElementById('add-condo-btn').addEventListener('click', addCondo);

    // 3. Busca e renderiza a lista de condomínios
    try {
        const { data, error } = await supabase.rpc('get_user_condos');
        if (error) throw error;
        renderCondoList(data);
    } catch (error) {
        console.error('Erro ao buscar lista de condomínios:', error.message);
        const container = document.getElementById('condo-list-container');
        if (container) container.innerHTML = '<p style="color: red;">Falha ao carregar condomínios.</p>';
    }
});