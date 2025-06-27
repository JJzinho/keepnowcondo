// Adicionar em index_animations.js, dentro do DOMContentLoaded e expor em window.pageIndexAnimations
function handlePageTransitionRequest(destinationUrl) {
    document.body.classList.add('is-fading-out');
    document.body.addEventListener('transitionend', function onTransitionEnd() {
        document.body.removeEventListener('transitionend', onTransitionEnd);
        window.location.href = destinationUrl;
    }, { once: true });
    setTimeout(() => { window.location.href = destinationUrl; }, 300);
}
// ...
window.pageIndexAnimations = {
    // ... (outras funções)
    handlePageTransitionRequest
};