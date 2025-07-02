// www/script/PushNotificationManager.js
import { supabase } from './supabaseClient.js';

const PushNotificationManager = {
    async register() {
        // CORREÇÃO: Acessamos o plugin através do objeto global `Capacitor.Plugins`
        // em vez de usar 'import'.
        const { PushNotifications } = Capacitor.Plugins;

        // A API de Push não funciona em um navegador web, apenas no app nativo.
        if (typeof window.Capacitor === 'undefined' || !window.Capacitor.isNativePlatform()) {
            console.log("Push notifications não estão disponíveis nesta plataforma.");
            return;
        }

        // 1. Verificar permissões
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            console.warn('A permissão para notificações não foi concedida.');
            return;
        }

        // 2. Registrar o dispositivo no serviço de push (FCM/APN)
        await PushNotifications.register();
        console.log("Processo de registro de Push iniciado.");

        this.addListeners();
    },

    async addListeners() {
        // CORREÇÃO: Acessamos o plugin da mesma forma aqui.
        const { PushNotifications } = Capacitor.Plugins;

        // Ocorre quando o registro é bem-sucedido e o token é recebido
        await PushNotifications.addListener('registration', async (token) => {
            console.info('Registro de Push bem-sucedido. Token:', token.value);
            // 3. Salvar o token no seu banco de dados
            await this.saveTokenToSupabase(token.value);
        });

        // Ocorre se houver um erro no registro
        await PushNotifications.addListener('registrationError', (err) => {
            console.error('Erro no registro de Push:', JSON.stringify(err));
        });

        // Ocorre quando uma notificação é recebida com o app em primeiro plano
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Notificação Push recebida:', notification);
            // Opcional: Você pode exibir um alerta ou uma UI customizada aqui
            alert(`Notificação: ${notification.title}\n${notification.body}`);
        });

        // Ocorre quando o usuário toca na notificação (app em segundo plano ou fechado)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Ação de Push executada:', action);
            const page = action.notification.data.page;
            if (page) {
                // Redireciona para a página especificada nos dados da notificação
                window.location.href = page;
            }
        });
    },

    async saveTokenToSupabase(token) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.error("Usuário não logado, não é possível salvar o token de push.");
            return;
        }

        // Tabela: device_tokens | Colunas: id, user_id, token, created_at
        // A cláusula `upsert` com `onConflict` garante que o mesmo token não seja duplicado.
        const { error } = await supabase
            .from('device_tokens')
            .upsert({ user_id: user.id, token: token }, { onConflict: 'token' });

        if (error) {
            console.error('Erro ao salvar o token de push:', error);
        } else {
            console.log('Token de push salvo com sucesso.');
        }
    }
};

export default PushNotificationManager;