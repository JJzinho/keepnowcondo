// Conteúdo completo para www/script/configuracoes.js

import { supabase } from './supabaseClient.js';

/**
 * Função assíncrona que realiza o logout do usuário no Supabase.
 */
async function performLogout() {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error('Erro ao fazer logout:', error.message);
            alert('Não foi possível encerrar a sessão. Por favor, tente novamente.');
        } else {
            // Redireciona para a página de login com o parâmetro '?logout=true'
            // para sinalizar ao index.js que o login automático deve ser impedido.
            window.location.replace('../index.html?logout=true');
        }
    } catch (e) {
        console.error('Um erro inesperado ocorreu durante o logout:', e);
        alert('Ocorreu um erro inesperado ao tentar sair.');
    }
}

/**
 * Função global chamada pelo evento 'onclick' do botão "Sair" no HTML.
 */
window.handleLogout = function() {
    if (confirm("Tem certeza que deseja sair?")) {
        performLogout();
    }
}

// Lógica para o menu dropdown da barra de navegação (app-bar).
const navbarToggle = document.getElementById('navbar-toggle');
const navbarDropdown = document.getElementById('navbar-dropdown');

if (navbarToggle && navbarDropdown) {
    navbarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        navbarDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (navbarToggle && navbarDropdown && !navbarToggle.contains(e.target) && !navbarDropdown.contains(e.target)) {
            navbarDropdown.classList.remove('show');
        }
    });
}