// www/script/signup.js
import { supabase } from './supabaseClient.js';

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Impede o envio padrão do formulário

        emailError.textContent = '';
        passwordError.textContent = '';

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            if (!email) emailError.textContent = 'Email é obrigatório.';
            if (!password) passwordError.textContent = 'Senha é obrigatória.';
            return;
        }

        try {
            // Realiza o cadastro com o Supabase
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (error) {
                console.error('Erro no cadastro:', error.message);
                // Exibe uma mensagem de erro mais amigável para o usuário
                if (error.message.includes('User already registered')) {
                    emailError.textContent = 'Este email já está cadastrado.';
                } else if (error.message.includes('Password should be at least 6 characters')) {
                    passwordError.textContent = 'A senha deve ter no mínimo 6 caracteres.';
                } else {
                    alert('Erro ao cadastrar: ' + error.message);
                }
            } else if (data.user) {
                console.log('Usuário cadastrado com sucesso:', data.user);
                alert('Cadastro realizado com sucesso! Você será redirecionado para o pagamento da assinatura.');
                // Redireciona para a página de pagamento após o cadastro
                window.location.href = 'payment.html'; 
            } else {
                // Caso de sucesso mas sem user, pode indicar necessidade de verificação de email
                alert('Cadastro efetuado. Verifique seu e-mail para confirmar a conta antes de prosseguir com o pagamento.');
                // Você pode optar por redirecionar para uma página de "verificar email"
                // window.location.href = 'verify-email.html';
            }

        } catch (err) {
            console.error('Erro inesperado:', err);
            alert('Ocorreu um erro inesperado ao tentar cadastrar. Tente novamente.');
        }
    });
});