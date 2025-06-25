// www/script/notificacoes.js (v3 - Unified List)

const LocalNotifications = Capacitor.Plugins?.LocalNotifications;

if (!String.prototype.hashCode) {
    String.prototype.hashCode = function() {
        var hash = 0, i, chr;
        if (this.length === 0) return hash;
        for (i = 0; i < this.length; i++) {
            chr   = this.charCodeAt(i);
            hash  = ((hash << 5) - hash) + chr;
            hash |= 0;
        }
        return hash;
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[NotifJS_v3] DOMContentLoaded - Iniciando script de notificações unificadas.');

    const unifiedListContainer = document.getElementById('unified-notifications-list');
    const notificationCountBadge = document.getElementById('notification-count-badge');

    const STORAGE_KEYS_NOTIF = {
        DOCUMENTS: 'documentPagesData_localForage_v1_com_notificacao_corrigida',
        CHECKLIST_ACTIVITIES: 'activities_v4',
        TICKETS: TICKET_STORAGE_KEY_V2, // Garantir que dados.js seja carregado antes
        OCCURRENCE_TYPES: 'condoAllOccurrenceTypes_v2'
    };

    localforage.config({
        driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
        name: 'documentosApp',
        storeName: 'documentPages',
    });

    async function getStoredData(key, isLocalForage = false) {
        try {
            if (isLocalForage) {
                const data = await localforage.getItem(key);
                return data || [];
            } else {
                const dataStr = localStorage.getItem(key);
                return dataStr ? JSON.parse(dataStr) : [];
            }
        } catch (error) {
            console.error(`[NotifJS] Erro ao ler de ${isLocalForage ? 'localForage' : 'localStorage'} para '${key}':`, error);
            return [];
        }
    }

    async function saveData(key, data, isLocalForage = false) {
        try {
            const dataToStore = JSON.stringify(data);
            if (isLocalForage) {
                await localforage.setItem(key, JSON.parse(dataToStore));
            } else {
                localStorage.setItem(key, dataToStore);
            }
        } catch (error) { console.error(`[NotifJS] Erro ao salvar para '${key}':`, error); }
    }

    function formatDateForDisplay(dateString, includeTime = false) {
        if (!dateString) return 'Data não definida';
        try {
            const date = new Date(dateString);
             if (isNaN(date.getTime())) {
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const parsedDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    if (!isNaN(parsedDate.getTime())) {
                        return parsedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    }
                }
                return 'Data inválida';
            }
            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return date.toLocaleDateString('pt-BR', options);
        } catch (e) {
            console.error("Erro ao formatar data para display:", dateString, e);
            return dateString;
        }
    }

    let allKnownOccurrenceTypes = [];
    function getOccurrenceName(key) {
        if (!allKnownOccurrenceTypes || allKnownOccurrenceTypes.length === 0) {
            const storedTypes = localStorage.getItem(STORAGE_KEYS_NOTIF.OCCURRENCE_TYPES);
            allKnownOccurrenceTypes = storedTypes ? JSON.parse(storedTypes) : [];
        }
        const known = allKnownOccurrenceTypes.find(o => o.key === key);
        return known ? known.name : (key || "N/A");
    }

    function generateDeterministicNotificationId(prefix, itemId, itemName = "") {
        const prefixHash = prefix.hashCode();
        const itemHash = String(itemId).hashCode();
        const nameHash = itemName ? String(itemName).hashCode() : 0;
        return (prefixHash + itemHash + nameHash) & 0x7FFFFFFF;
    }

    async function cancelNotification(notificationId) {
        if (!LocalNotifications || notificationId === null || notificationId === undefined) return;
        try {
            await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
            console.log(`[NotifJS] Notificação PUSH (ID: ${notificationId}) cancelada (reconciliação).`);
        } catch (e) {
            console.error(`[NotifJS] Erro ao cancelar PUSH (ID: ${notificationId}) na reconciliação:`, e);
        }
    }

    async function reconcileNotifications() {
        if (!LocalNotifications) {
            console.warn("[NotifJS] LocalNotifications plugin não disponível. Reconciliação de PUSH pulada.");
            return;
        }
        try {
             await LocalNotifications.requestPermissions();
        } catch(e) {console.error("[NotifJS] Erro ao pedir permissão para PUSH:", e)}

        console.log("[NotifJS] Iniciando reconciliação de notificações PUSH...");
        const allPages = await getStoredData(STORAGE_KEYS_NOTIF.DOCUMENTS, true);
        const allActivities = await getStoredData(STORAGE_KEYS_NOTIF.CHECKLIST_ACTIVITIES);

        const activeScheduledNotifications = await LocalNotifications.getPending();
        const activeSystemIds = new Set(activeScheduledNotifications.notifications.map(n => n.id));
        console.log(`[NotifJS] Notificações PUSH ativas no sistema: ${activeSystemIds.size}`);

        const validTrackedIds = new Set();
        let documentsModified = false;
        let activitiesModified = false;

        // Reconciliar Documentos
        for (const page of allPages) {
            if (page.currentDocument) {
                const doc = page.currentDocument;
                const expectedId = generateDeterministicNotificationId("doc_", page.id, doc.fileName);
                if (page.category === "expiring" && doc.endDate && doc.fileName) {
                    const expiryDate = new Date(doc.endDate + "T09:00:00");
                    if (!isNaN(expiryDate.getTime()) && expiryDate > new Date()) {
                        validTrackedIds.add(expectedId);
                        if (doc.notificationId !== expectedId) {
                            if (doc.notificationId && activeSystemIds.has(doc.notificationId)) await cancelNotification(doc.notificationId);
                            doc.notificationId = expectedId; documentsModified = true;
                        }
                    } else {
                        if (doc.notificationId && activeSystemIds.has(doc.notificationId)) await cancelNotification(doc.notificationId);
                        if (doc.notificationId !== null) { doc.notificationId = null; documentsModified = true; }
                    }
                } else {
                    if (doc.notificationId && activeSystemIds.has(doc.notificationId)) await cancelNotification(doc.notificationId);
                    if (doc.notificationId !== null) { doc.notificationId = null; documentsModified = true; }
                }
            }
        }
        if (documentsModified) await saveData(STORAGE_KEYS_NOTIF.DOCUMENTS, allPages, true);

        // Reconciliar Atividades do Checklist
        for (const activity of allActivities) {
            const expectedId = generateDeterministicNotificationId("checklist_", activity.id);
            if (activity.nextDeadlineDate && activity.customPeriod !== "Conforme necessidade") {
                const deadline = new Date(activity.nextDeadlineDate + "T09:00:00");
                if (!isNaN(deadline.getTime()) && deadline > new Date()) {
                     validTrackedIds.add(expectedId);
                     if (activity.notificationId !== expectedId) {
                        if (activity.notificationId && activeSystemIds.has(activity.notificationId)) await cancelNotification(activity.notificationId);
                        activity.notificationId = expectedId; activitiesModified = true;
                     }
                } else {
                    if (activity.notificationId && activeSystemIds.has(activity.notificationId)) await cancelNotification(activity.notificationId);
                    if (activity.notificationId !== null) { activity.notificationId = null; activitiesModified = true; }
                }
            } else {
                if (activity.notificationId && activeSystemIds.has(activity.notificationId)) await cancelNotification(activity.notificationId);
                if (activity.notificationId !== null) { activity.notificationId = null; activitiesModified = true; }
            }
        }
        if (activitiesModified) await saveData(STORAGE_KEYS_NOTIF.CHECKLIST_ACTIVITIES, allActivities);

        for (const systemId of activeSystemIds) {
            if (!validTrackedIds.has(systemId)) {
                console.log(`[NotifJS] Notificação PUSH órfã (ID: ${systemId}). Cancelando.`);
                await cancelNotification(systemId);
            }
        }
        console.log("[NotifJS] Reconciliação de PUSH concluída.");
    }


    async function processAndRenderNotifications() {
        const allPages = await getStoredData(STORAGE_KEYS_NOTIF.DOCUMENTS, true);
        const allActivities = await getStoredData(STORAGE_KEYS_NOTIF.CHECKLIST_ACTIVITIES);
        const allTickets = await getStoredData(STORAGE_KEYS_NOTIF.TICKETS);

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const sevenDaysFromToday = new Date(today); sevenDaysFromToday.setDate(today.getDate() + 7);
        const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);
        const ARCHIVE_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

        let unifiedAlerts = [];

        // Processar Documentos
        allPages.forEach(page => {
            if (page.category === "expiring" && page.currentDocument && page.currentDocument.endDate) {
                try {
                    const endDate = new Date(page.currentDocument.endDate + "T00:00:00");
                    if (isNaN(endDate.getTime())) return;
                    endDate.setHours(0, 0, 0, 0);
                    
                    let status = 'ok';
                    let urgency = 4; // Default para itens futuros distantes
                    if (endDate < today) { status = 'expired'; urgency = 1; }
                    else if (endDate <= sevenDaysFromToday) { status = 'expiring-soon'; urgency = 2; }
                    
                    if (status !== 'ok') { // Apenas adiciona se for alerta
                        unifiedAlerts.push({
                            id: page.id,
                            type: 'document',
                            title: page.currentDocument.fileName || "Documento sem nome",
                            context: `Pasta: ${page.name}`,
                            detail: `Vence em: ${formatDateForDisplay(page.currentDocument.endDate)}`,
                            rawDate: page.currentDocument.endDate,
                            statusClass: `status-${status}`,
                            urgency: urgency,
                            icon: 'folder_shared'
                        });
                    }
                } catch (e) { console.error("Erro processando data de documento:", e); }
            }
        });

        // Processar Atividades do Checklist
        allActivities.forEach(activity => {
            if (activity.nextDeadlineDate && activity.customPeriod !== "Conforme necessidade") {
                try {
                    const deadline = new Date(activity.nextDeadlineDate + "T00:00:00");
                    if (isNaN(deadline.getTime())) return;
                    deadline.setHours(0, 0, 0, 0);

                    let status = 'ok';
                    let urgency = 4;
                    if (deadline < today) { status = 'overdue'; urgency = 1; }
                    else if (deadline <= sevenDaysFromToday) { status = 'expiring-soon'; urgency = 2; }

                    if (status !== 'ok') {
                        unifiedAlerts.push({
                            id: activity.id,
                            type: 'checklist',
                            title: activity.titulo || "Atividade sem título",
                            context: `Sistema: ${getOccurrenceName(activity.occurrence)}`,
                            detail: `Prazo: ${formatDateForDisplay(activity.nextDeadlineDate)}`,
                            rawDate: activity.nextDeadlineDate,
                            statusClass: `status-${status}`,
                            urgency: urgency,
                            icon: 'checklist_rtl'
                        });
                    }
                } catch (e) { console.error("Erro processando data de atividade:", e); }
            }
        });

        // Processar Chamados
        allTickets.forEach(ticket => {
            try {
                if (ticket.status === 'Pendente') {
                    const createdAt = new Date(ticket.createdAt);
                    if (createdAt < threeDaysAgo) {
                        unifiedAlerts.push({
                            id: ticket.id,
                            type: 'ticket',
                            title: `Chamado Pendente: ${getOccurrenceName(ticket.occurrence)}`,
                            context: `Local: ${ticket.location || 'N/A'}`,
                            detail: `Aberto em: ${formatDateForDisplay(ticket.createdAt, true)}`,
                            rawDate: ticket.createdAt, // Usado para ordenação
                            statusClass: 'status-pending-attention',
                            urgency: 2, // Urgência média para chamados pendentes antigos
                            icon: 'support_agent'
                        });
                    }
                } else if (ticket.status === 'Concluido' && ticket.completionStatus === 'concluida' && ticket.completedAt) {
                    const completedDate = new Date(ticket.completedAt);
                    if (!isNaN(completedDate.getTime()) && (new Date().getTime() > (completedDate.getTime() + ARCHIVE_DELAY_MS))) {
                        unifiedAlerts.push({
                            id: ticket.id,
                            type: 'ticket',
                            title: `Chamado Concluído: ${getOccurrenceName(ticket.occurrence)}`,
                            context: `Local: ${ticket.location || 'N/A'}`,
                            detail: `Pronto para arquivar (Concluído em: ${formatDateForDisplay(ticket.completedAt, true)})`,
                            rawDate: ticket.completedAt, // Usado para ordenação
                            statusClass: 'status-archive-ready',
                            urgency: 3, // Urgência menor para arquivamento
                            icon: 'archive'
                        });
                    }
                }
            } catch(e) { console.error("Erro processando chamado:", ticket, e); }
        });

        // Ordenar alertas: primeiro por urgência (menor é mais urgente), depois por data (mais antiga primeiro)
        unifiedAlerts.sort((a, b) => {
            if (a.urgency !== b.urgency) {
                return a.urgency - b.urgency;
            }
            const dateA = new Date(a.rawDate);
            const dateB = new Date(b.rawDate);
            if (isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) return 1; // Datas inválidas no final
            if (!isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return -1;
            if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
            return dateA - dateB; // Mais antigo/próximo primeiro
        });

        renderUnifiedList(unifiedAlerts, unifiedListContainer, "Nenhuma notificação no momento.");
        updateGlobalBadge(unifiedAlerts.length);
    }

    function renderUnifiedList(items, container, emptyMessage) {
        if (!container) {
            console.error("Container da lista unificada não encontrado.");
            return;
        }
        
        const listElement = container.querySelector('ul') || document.createElement('ul');
        listElement.innerHTML = '';
        
        const oldEmptyMsg = container.querySelector('.empty-list-message');
        if (oldEmptyMsg) oldEmptyMsg.remove();

        if (items.length === 0) {
            const p = document.createElement('p');
            p.className = 'empty-list-message';
            p.textContent = emptyMessage;
            container.appendChild(p);
            return;
        }

        items.forEach(item => {
            const li = document.createElement('li');
            li.className = `notification-item type-${item.type} ${item.statusClass || ''}`;
            li.dataset.itemId = item.id;
            li.dataset.itemType = item.type;

            // Adiciona um ícone representativo do tipo de notificação
            let iconName = 'notifications'; // Padrão
            if (item.icon) iconName = item.icon;
            else if (item.type === 'document') iconName = 'folder_shared';
            else if (item.type === 'checklist') iconName = 'checklist_rtl';
            else if (item.type === 'ticket') iconName = 'support_agent';

            li.innerHTML = `
                <i class="material-icons item-icon">${iconName}</i>
                <div class="item-content-wrapper">
                    <div class="item-main-content">
                        <strong class="item-title">${item.title}</strong>
                        <span class="item-detail">${item.detail}</span>
                    </div>
                    ${item.context ? `<span class="item-context">${item.context}</span>` : ''}
                </div>
            `;
            // Adicionar event listener para navegação
            li.addEventListener('click', () => navigateToItem(item.id, item.type));
            listElement.appendChild(li);
        });
        
        if (!container.querySelector('ul')) {
            container.appendChild(listElement);
        }
    }

    function navigateToItem(itemId, itemType) {
        // console.log(`Navegar para: ID ${itemId}, Tipo: ${itemType}`);
        let url = '';
        switch (itemType) {
            case 'document':
                url = `../pages/documentos.html#pageId=${itemId}`; // Implementar deep linking em documentos.js
                break;
            case 'checklist':
                url = `../pages/checklist.html#activityId=${itemId}`; // Implementar deep linking em checklist.js
                break;
            case 'ticket':
                url = `../pages/chamados.html#ticketId=${itemId}`; // Implementar deep linking em chamados.js
                break;
            default:
                console.warn("Tipo de item desconhecido para navegação:", itemType);
                return;
        }
        if (url) {
             if (window.AppAnimations && typeof window.AppAnimations.handlePageTransitionRequest === 'function') {
                window.AppAnimations.handlePageTransitionRequest(url);
            } else {
                window.location.href = url;
            }
        }
    }

    function updateGlobalBadge(count) {
        if (notificationCountBadge) {
            if (count > 0) {
                notificationCountBadge.textContent = count > 99 ? '99+' : count;
                notificationCountBadge.style.display = 'flex';
            } else {
                notificationCountBadge.style.display = 'none';
            }
        }
    }

    // Listeners para atualizações de outros módulos
    window.addEventListener('documentStoreUpdated', () => {
        console.log('[NotifJS_v3] Evento "documentStoreUpdated" recebido.');
        reconcileNotifications().then(processAndRenderNotifications);
    });
    window.addEventListener('checklistStoreUpdated', () => {
        console.log('[NotifJS_v3] Evento "checklistStoreUpdated" recebido.');
        reconcileNotifications().then(processAndRenderNotifications);
    });
    window.addEventListener('ticketStoreUpdated', () => {
        console.log('[NotifJS_v3] Evento "ticketStoreUpdated" recebido.');
        processAndRenderNotifications(); // Reconciliação de PUSH para tickets não implementada ainda
    });

    // Inicialização
    reconcileNotifications().then(processAndRenderNotifications);
});