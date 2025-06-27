const OVERLAY_ID = 'loading-overlay';
const ICON_CONTAINER_ID = 'loading-icon-container';

// Variáveis para controlar o timer da animação
let progressInterval = null;
let currentProgress = 0;

/**
 * Cria o HTML do loading se ele ainda não existir.
 */
function ensureLoadingExists() {
    if (document.getElementById(OVERLAY_ID)) {
        return;
    }
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'loading-overlay';

    const iconContainer = document.createElement('div');
    iconContainer.id = ICON_CONTAINER_ID;
    iconContainer.className = 'loading-icon-container';

    overlay.appendChild(iconContainer);
    document.body.appendChild(overlay);
}

/**
 * Define o percentual de preenchimento do ícone.
 * @param {number} percentage - Um valor de 0 a 100.
 */
function setLoadingProgress(percentage) {
    const iconContainer = document.getElementById(ICON_CONTAINER_ID);
    if (iconContainer) {
        // Define o valor da variável CSS '--fill-percentage'
        iconContainer.style.setProperty('--fill-percentage', `${percentage}%`);
    }
}

/**
 * Exibe a tela de carregamento e inicia a animação de preenchimento.
 */
export function showLoading() {
    ensureLoadingExists();
    const overlay = document.getElementById(OVERLAY_ID);
    
    // Reseta o estado inicial
    overlay.style.opacity = '1';
    overlay.style.display = 'flex';
    currentProgress = 0;
    setLoadingProgress(0);

    // Inicia um timer para simular o progresso do carregamento
    // Isso faz o ícone se preencher gradualmente
    progressInterval = setInterval(() => {
        if (currentProgress < 90) { // Sobe rápido até 90%
            currentProgress += 5;
            setLoadingProgress(currentProgress);
        }
    }, 80); // a cada 80ms
}

/**
 * Finaliza a animação e esconde a tela de carregamento.
 */
export function hideLoading() {
    clearInterval(progressInterval); // Para o timer de progresso
    progressInterval = null;
    
    // Preenche os 100% finais
    setLoadingProgress(100);

    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) {
        // Espera um pouco para o usuário ver os 100% e então esconde com fade-out
        setTimeout(() => {
            overlay.style.opacity = '0';
            // Espera a animação de fade-out terminar para esconder o elemento
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300); // 300ms (duração da transição no CSS)
        }, 200); // mostra 100% por 200ms
    }
}