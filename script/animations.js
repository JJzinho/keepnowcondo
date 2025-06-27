// www/script/animations.js

function handlePageTransitionRequest(destinationUrl) {
    document.body.classList.add('is-fading-out');
    // Listen for the end of the transition, or fallback to a timeout
    let transitioned = false;
    function onTransitionEnd() {
        if (transitioned) return;
        transitioned = true;
        document.body.removeEventListener('transitionend', onTransitionEnd);
        window.location.href = destinationUrl;
    }
    document.body.addEventListener('transitionend', onTransitionEnd);
    // Fallback timeout in case transitionend doesn't fire (e.g., if no transition properties on body)
    setTimeout(() => {
        if (!transitioned) {
             console.warn("Transitionend event did not fire, navigating after timeout.");
            window.location.href = destinationUrl;
        }
    }, 350); // Should be slightly longer than CSS transition
}

document.addEventListener('DOMContentLoaded', () => {
    // ... (your other animation functions like applyStaggeredAnimation, applyScrollRevealAnimation)

    // Apply initial fade-in for the body if it wasn't handled by CSS directly
    // (Though the CSS approach in login.css is usually better for initial load)
    // document.body.style.opacity = '0';
    // document.body.classList.add('is-fading-in'); // Assumes animations.css defines this
    // requestAnimationFrame(() => {
    //     setTimeout(() => {
    //         document.body.style.opacity = '1';
    //     }, 20);
    // });


    // --- Expor funções ---
    window.AppAnimations = {
        // applyStaggeredAnimation,
        // applyScrollRevealAnimation,
        handlePageTransitionRequest // Make sure this is exposed
    };

    console.log("animations.js loaded and AppAnimations object created.");
});