// www/script/AuthManager.js

// Suas credenciais Supabase (certifique-se de que estão aqui e são as corretas)
const SUPABASE_URL = 'https://cshnufsmcyruyesnvoqx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzaG51ZnNtY3lydXllc252b3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzQ4NDEsImV4cCI6MjA2NTE1MDg0MX0.ZiafyB294G6ajQE0iN2Jevm4SrQuPc_MPhux5XWc650';

const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Gerencia a autenticação do usuário com Supabase
const AuthManager = {
    // Função para registrar um novo usuário e criar o perfil na tabela public.Users
    async signUpUser(email, password, name) {
        try {
            // 1. Tentar registrar o usuário no sistema de autenticação do Supabase
            const { data, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
            });

            if (authError) {
                console.error('Erro ao registrar usuário (auth):', authError.message);
                throw authError; // Lança o erro para ser tratado pelo chamador
            }

            // O usuário foi registrado no Supabase Auth. Agora, criar o perfil na tabela public.Users
            const authUserId = data.user.id; // Este é o UUID do usuário no auth.users

            const { data: userProfile, error: profileError } = await supabase
                .from('Users')
                .insert([
                    {
                        name: name,
                        email: email,
                        auth_user_id: authUserId // Linkando com o ID do Supabase Auth
                    }
                ])
                .select(); // Retorna o registro inserido

            if (profileError) {
                console.error('Erro ao criar perfil do usuário (public.Users):', profileError.message);
                // Se falhar aqui, você pode considerar deletar o usuário do auth.users
                // para evitar usuários sem perfil, mas isso exige mais lógica.
                throw profileError;
            }

            console.log('Usuário registrado e perfil criado:', userProfile);
            return { user: data.user, profile: userProfile[0] }; // Retorna tanto o usuário auth quanto o perfil
        } catch (error) {
            console.error('Erro completo no signUpUser:', error);
            throw error;
        }
    },

    // Função para fazer login de um usuário
    async signInUser(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });
            if (error) {
                console.error('Erro ao fazer login:', error.message);
                throw error;
            }
            console.log('Usuário logado:', data.user);
            return data.user;
        } catch (error) {
            console.error('Erro completo no signInUser:', error);
            throw error;
        }
    },

    // Função para fazer logout
    async signOutUser() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Erro ao fazer logout:', error.message);
                throw error;
            }
            console.log('Usuário deslogado.');
            return true;
        } catch (error) {
            console.error('Erro completo no signOutUser:', error);
            throw error;
        }
    },

    // Retorna o usuário logado atualmente (do auth.users)
    async getCurrentUser() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Erro ao obter usuário atual:', error.message);
            return null;
        }
    },

    // NOVO: Função para obter o ID do perfil do usuário da tabela public.Users
    // Este ID (bigint) será usado como user_profile_id em Condominiums
    async getUserProfileId() {
        try {
            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                console.warn('Nenhum usuário logado para obter o ID do perfil.');
                return null;
            }

            // Buscar o perfil do usuário na tabela public.Users usando o auth_user_id (UUID)
            const { data: userProfile, error } = await supabase
                .from('Users')
                .select('id') // Seleciona apenas o ID bigint da tabela public.Users
                .eq('auth_user_id', currentUser.id) // O ID do usuário logado é um UUID
                .single(); // Espera um único resultado

            if (error) {
                console.error('Erro ao buscar o ID do perfil do usuário:', error.message);
                throw error;
            }

            if (userProfile) {
                return userProfile.id; // Retorna o ID bigint do perfil
            } else {
                console.warn('Perfil do usuário não encontrado na tabela public.Users.');
                return null;
            }
        } catch (error) {
            console.error('Erro completo no getUserProfileId:', error);
            return null;
        }
    },

    // Escutador de mudanças de estado de autenticação
    onAuthStateChange(callback) {
        supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    }
};
