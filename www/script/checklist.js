document.addEventListener('DOMContentLoaded', () => {
    console.log("Checklist JS Loaded (v8.0 - Capacitor Push Notifications)...");

    // CAPACITOR PLUGINS
    const LocalNotifications = (typeof Capacitor !== 'undefined' && Capacitor.Plugins) ? Capacitor.Plugins.LocalNotifications : null;

    // Adiciona hashCode a String para gerar IDs (simples)
    // É importante que esta função seja idêntica à usada em documentos.js e notificacoes.js
    if (!String.prototype.hashCode) {
        String.prototype.hashCode = function() {
            var hash = 0, i, chr;
            if (this.length === 0) return hash;
            for (i = 0; i < this.length; i++) {
                chr   = this.charCodeAt(i);
                hash  = ((hash << 5) - hash) + chr;
                hash |= 0; // Convert to 32bit integer
            }
            return hash;
        };
    }


    const STORAGE_KEYS = {
        MAINTENANCE_ACTIVITIES: 'activities_v4',
        MAINTENANCE_ARCHIVED: 'archivedRecords_v2',
        OCCURRENCE_TYPES: 'condoAllOccurrenceTypes_v2', // Garanta que esta chave é consistente com fornecedores.js
        LOCATION_CONFIG: 'condoLocationConfig_v7_full_modal',
        CHAMADO_SUPPLIERS: 'condoSuppliersChamado_manutencao',
        CONDO_DATA: 'condominioData',
        ACTIVITY_FORM_DRAFT: 'checklistActivityFormDraft_v1'
    };

    // PREDEFINED_OCCURRENCE_TYPES_LIST é esperado de preloaded_activities.js
    // Se não estiver global, você precisará carregá-lo ou referenciá-lo corretamente.

    let state = {
        pendingActivities: [],
        archivedRecords: [],
        allKnownOccurrenceTypes: [],
        locationConfig: null,
        suppliersChamado: [],
        currentTicketChamado: {},
        currentEditingActivityId: null,
        loadedActivityDraft: null
    };

    const utils = {
        getById: (id) => document.getElementById(id),
        formatDate: (dateInput) => {
            if (!dateInput) return 'N/A';
            try {
                let date;
                if (dateInput instanceof Date) { date = dateInput; }
                else if (typeof dateInput === 'string' && dateInput.includes('T')) { date = new Date(dateInput); } // ISO String
                else if (typeof dateInput === 'string') { // YYYY-MM-DD
                    const parts = dateInput.split('-');
                    if (parts.length === 3) { date = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10)); }
                    else { date = new Date(dateInput); } // Fallback
                } else { date = new Date(dateInput); } // Fallback for other types
                return !isNaN(date.getTime()) ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Data inválida';
            } catch (e) { console.error("Erro formatando data:", dateInput, e); return 'Erro data'; }
        },
        saveData: (key, data) => {
            try {
                localStorage.setItem(key, JSON.stringify(data));
                console.log(`LS Salvo: ${key}`);
                // Disparar evento para notificar outros scripts (como notificacoes.js)
                window.dispatchEvent(new CustomEvent('checklistStoreUpdated', { detail: { key: key, count: Array.isArray(data) ? data.length : undefined } }));
            }
            catch (e) { console.error(`LS Erro ao salvar ${key}:`, e); alert(`Erro ao salvar dados (${key}).`); }
        },
        loadData: (key, defaultVal = []) => {
            const d = localStorage.getItem(key);
            if (d === null) {
                console.warn(`LS: Nenhum dado para ${key}. Usando default.`);
                // Se o defaultVal for uma função (para casos de inicialização complexa), chame-a
                return typeof defaultVal === 'function' ? defaultVal() : defaultVal;
            }
            try {
                const p = JSON.parse(d);
                // console.log(`LS: Dados carregados para '${key}'.`);
                return p;
            }
            catch (e) {
                console.error(`LS Erro ao carregar/parsear '${key}':`, d, e);
                return typeof defaultVal === 'function' ? defaultVal() : defaultVal;
            }
        },
        toggleModal: (modalId, show) => {
            const modal = utils.getById(modalId);
            if (modal) {
                modal.style.display = show ? 'flex' : 'none';
                modal.classList.toggle('hidden', !show);
                document.body.classList.toggle('modal-open', show);
            } else { console.warn(`Modal ${modalId} não encontrado.`); }
        },
        resetForm: (formId) => {
            const form = utils.getById(formId);
            if (form) form.reset();

            if (formId === 'activityForm') {
                populateOccurrenceSelect('occurrence-checklist');
                const customPeriodInput = utils.getById('customPeriod-checklist');
                if (customPeriodInput) { customPeriodInput.style.display = 'none'; customPeriodInput.value = ''; customPeriodInput.required = false; }
                const periodSelect = utils.getById('period-checklist');
                if(periodSelect) periodSelect.value = ""; // Reseta o select de período
                const modalTitleElement = utils.getById('createActivityModal')?.querySelector('h2');
                if (modalTitleElement) modalTitleElement.textContent = "Nova Atividade para Plano de gestão";
                const submitButton = utils.getById('activityForm')?.querySelector('button[type="submit"]');
                if (submitButton) submitButton.textContent = "Criar Item para Checklist";
                 state.currentEditingActivityId = null; // Garante que não estamos em modo de edição
            } else if (formId === 'ticketFormChecklist') {
                populateOccurrenceSelect('occurrence-type-chamado-checklist'); //Popula o select de sistema/ocorrência do chamado
                const locCat = utils.getById('ticket-location-category-chamado-checklist');
                if (locCat) locCat.innerHTML = '<option value="" selected disabled>Carregando...</option>'; // Reseta categorias de localização
                const locArea = utils.getById('ticket-location-area-chamado-checklist');
                if (locArea) { locArea.innerHTML = '<option value="" selected disabled>Selecione Categoria...</option>'; locArea.disabled = true; } // Reseta áreas
                utils.getById('ticket-area-custom-chamado-checklist')?.classList.add('hidden'); // Esconde input de área customizada
                utils.getById('equipment-section-chamado-checklist')?.classList.add('hidden'); // Esconde seção de equipamentos
                const equipList = utils.getById('equipment-list-chamado-checklist'); if(equipList) equipList.innerHTML = ''; // Limpa lista de equipamentos
                const assocIdInput = utils.getById('ticketAssociatedActivityIdChecklist'); if(assocIdInput) assocIdInput.value = ''; // Limpa ID de atividade associada
                // Garante que o select de ocorrência do chamado esteja habilitado ao resetar para um novo chamado
                const occSelect = utils.getById('occurrence-type-chamado-checklist');
                if (occSelect) { occSelect.disabled = false;}
            }
        },
        getOccurrenceName: (key) => {
            if (!state.allKnownOccurrenceTypes || state.allKnownOccurrenceTypes.length === 0) {
                loadAllKnownOccurrenceTypes(); // Carrega se ainda não estiver carregado
            }
            const known = state.allKnownOccurrenceTypes.find(o => o.key === key);
            return known ? known.name : (key || 'N/A');
        },
        calculateNextDeadlineDate: (period, customValue = '', startDateInput = null) => {
            let startDate;
            if (startDateInput && typeof startDateInput === 'string' && startDateInput.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const parts = startDateInput.split('-'); // YYYY-MM-DD
                startDate = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10));
            } else if (startDateInput instanceof Date) {
                startDate = new Date(startDateInput);
            } else {
                startDate = new Date(); // Default to today if no valid start date provided
            }

            const date = new Date(startDate); // Cria uma nova instância para não modificar a original
            if (isNaN(date.getTime())) { console.error("calculateNextDeadlineDate: Data de início inválida", startDateInput); return null; }

            date.setHours(0, 0, 0, 0); // Normaliza para o início do dia

            try {
                let amount = 1;
                let unit = '';

                if(period === 'Customizado' && customValue){
                    const m = customValue.match(/(\d+)\s*(dias?|meses?|anos?|semanas?)/i);
                    if(m){ amount = parseInt(m[1]); unit = m[2].toLowerCase().replace(/s$/,'');}
                    else if (customValue === "Conforme necessidade") { return null; } // Não calcula prazo
                    else { console.warn("Período customizado inválido:", customValue); return null; }
                } else {
                    // Mapeamento direto de período para unidade e quantidade (se aplicável)
                    const map = {
                        "Diaria":"dia", "Segunda a sexta":"segunda a sexta", "Segunda a sábado":"segunda a sábado",
                        "Semanal":"semana", "Quinzenal":"quinzena", "Mensal":"mes",
                        "Bimestral":"bimestre", "Trimestral":"trimestre", "Semestral":"semestre",
                        "Anual":"ano", "Bienal":"bienio", "Quinquenal": "quinquenio" // Adicionado
                    };
                    unit = map[period] || period.toLowerCase(); // Fallback se não estiver no mapa (improvável com select)
                }

                switch(unit){
                    case "dia": date.setDate(date.getDate()+amount); break;
                    case "semana": date.setDate(date.getDate()+7*amount); break;
                    case "quinzena": date.setDate(date.getDate()+15*amount); break; // Ou 14, dependendo da definição
                    case "mes": date.setMonth(date.getMonth()+amount); break;
                    case "bimestre": date.setMonth(date.getMonth()+2*amount); break;
                    case "trimestre": date.setMonth(date.getMonth()+3*amount); break;
                    case "semestre": date.setMonth(date.getMonth()+6*amount); break;
                    case "ano": date.setFullYear(date.getFullYear()+amount); break;
                    case "bienio": date.setFullYear(date.getFullYear()+2*amount); break;
                    case "quinquenio": date.setFullYear(date.getFullYear() + 5 * amount); break; // Adicionado
                    // Para "Segunda a sexta" e "Segunda a sábado", a lógica é mais complexa se for para pular o dia atual
                    // Se for a partir do dia atual, e hoje for um dia de semana, o próximo é amanhã (ou segunda se for sexta/sábado)
                    case "segunda a sexta":
                        let d=1; const cd=date.getDay(); /* 0=Dom, 1=Seg, ..., 6=Sab */
                        if(cd===0)d=1; /* Se Dom, próximo é Seg */
                        else if(cd===5)d=3; /* Se Sex, próximo é Seg */
                        else if(cd===6)d=2; /* Se Sab, próximo é Seg */
                        else d=1; /* Caso contrário, dia seguinte */
                        date.setDate(date.getDate()+d);break;
                    case "segunda a sábado":
                        let ds=1; const csDay=date.getDay();
                        if(csDay===0)ds=1; /* Se Dom, próximo é Seg */
                        else if(csDay===6)ds=2; /* Se Sab, próximo é Seg (pula Dom) */
                        else ds=1; /* Caso contrário, dia seguinte */
                        date.setDate(date.getDate()+ds);break;
                    default:
                        if(period!=='Customizado') { // Só avisa se não for customizado e não reconhecido
                            console.warn("Periodicidade não reconhecida para cálculo de prazo:", period);
                            return null;
                        }
                }
                return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            } catch (e) { console.error("Error calculando deadline:", e); return null; }
        },
        getSelectedData: (selectElement) => { // Para pegar valor e texto de um select
             if (!selectElement || selectElement.selectedIndex < 0 || !selectElement.options[selectElement.selectedIndex]) {
                return { value: '', text: '' };
            }
            return { value: selectElement.value, text: selectElement.options[selectElement.selectedIndex].text };
        },
        cleanInput: (value = '') => String(value).replace(/\D/g, ''), // Remove não dígitos
    };

    // --- Lógica de Notificação Push para Checklist ---
    const checklistNotificationManager = {
        generateNotificationId: (activityId) => {
            // Gera um ID numérico de 32 bits a partir do ID da atividade
            const prefixHash = "checklist_".hashCode();
            const activityHash = String(activityId).hashCode();
            return (prefixHash + activityHash) & 0x7FFFFFFF; // Garante positivo e dentro do limite de int32
        },

        schedule: async (activity) => {
            if (!LocalNotifications) {
                console.warn("Checklist: LocalNotifications plugin não está disponível. Não é possível agendar.");
                return null;
            }
            if (!activity.nextDeadlineDate || activity.customPeriod === "Conforme necessidade") {
                // console.log(`Checklist: Atividade "${activity.titulo}" não tem prazo definido ou é sob demanda. Não agendando.`);
                return null;
            }

            const notificationId = checklistNotificationManager.generateNotificationId(activity.id);
            const scheduleDateTime = new Date(`${activity.nextDeadlineDate}T09:00:00`); // Agendar para 9h da manhã do dia do vencimento

            if (isNaN(scheduleDateTime.getTime())) {
                console.error(`Checklist: Data de vencimento inválida para agendamento: ${activity.nextDeadlineDate}`);
                return null;
            }

            if (scheduleDateTime <= new Date()) {
                // console.log(`Checklist: Prazo da atividade "${activity.titulo}" (${utils.formatDate(activity.nextDeadlineDate)}) já passou ou é hoje. Não agendando notificação push.`);
                return null;
            }

            try {
                await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
                // console.log(`Checklist: Notificação anterior (ID: ${notificationId}) cancelada para "${activity.titulo}", se existia.`);

                await LocalNotifications.schedule({
                    notifications: [
                        {
                            title: "Atividade do Plano de Gestão Vence Hoje!",
                            body: `A atividade "${activity.titulo || 'Sem título'}" (Sistema: ${utils.getOccurrenceName(activity.occurrence)}) está programada para vencer hoje.`,
                            id: notificationId,
                            schedule: { at: scheduleDateTime },
                            smallIcon: 'res://mipmap/ic_launcher', // VERIFICAR se este ícone existe em android/app/src/main/res/mipmap
                                                                // ou use 'res://drawable/ic_notification' se tiver um drawable específico.
                            // sound: 'res://raw/notification_sound', // Opcional: se tiver um som customizado
                            extra: { activityId: activity.id, type: 'checklistExpiry' }
                        },
                    ],
                });
                console.log(`Checklist: Notificação PUSH agendada para atividade ID ${activity.id} em ${scheduleDateTime.toLocaleString()} (ID Notif: ${notificationId})`);
                return notificationId;
            } catch (error) {
                console.error(`Checklist: Erro ao agendar notificação push para atividade ID ${activity.id}:`, error);
                return null;
            }
        },

        cancel: async (activityId) => {
            if (!LocalNotifications) {
                console.warn("Checklist: LocalNotifications plugin não está disponível. Não é possível cancelar.");
                return;
            }
            const notificationId = checklistNotificationManager.generateNotificationId(activityId);
            try {
                await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
                console.log(`Checklist: Notificação PUSH (ID: ${notificationId}) cancelada para atividade ID ${activity.id}.`);
            } catch (error) {
                console.error(`Checklist: Erro ao cancelar notificação push para atividade ID ${activity.id}:`, error);
            }
        },

        reconcileAndScheduleAll: async () => {
            if (!LocalNotifications) {
                 console.warn("Checklist: LocalNotifications plugin não disponível. Reconciliação de notificações push pulada.");
                 return;
            }
            try { // Tenta pedir permissão (silenciosamente se já concedida)
                 const permStatus = await LocalNotifications.requestPermissions();
                 if (permStatus.display !== 'granted') {
                     console.warn('Checklist: Permissão para notificações não concedida. Notificações push podem não funcionar.');
                 }
            } catch (e) { console.error("Checklist: Erro ao solicitar permissões de notificação:", e); }

            console.log("[Checklist] Iniciando reconciliação de notificações PUSH para atividades...");
            const activities = utils.loadData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, []);
            let activitiesModified = false;

            const pendingSystemNotifications = await LocalNotifications.getPending();
            const activeSystemNotificationIds = new Set(pendingSystemNotifications.notifications.map(n => n.id));

            for (const activity of activities) {
                const expectedNotificationId = checklistNotificationManager.generateNotificationId(activity.id);
                let currentStoredNotificationId = activity.notificationId || null;
                let needsReschedule = false;

                if (activity.nextDeadlineDate && activity.customPeriod !== "Conforme necessidade") {
                    const deadline = new Date(activity.nextDeadlineDate + "T09:00:00");
                    if (!isNaN(deadline.getTime()) && deadline > new Date()) { // Prazo válido e futuro
                        if (currentStoredNotificationId !== expectedNotificationId) {
                            // ID armazenado é diferente do esperado, ou nulo.
                            // Se havia um ID antigo e ele estava ativo, cancela.
                            if (currentStoredNotificationId && activeSystemNotificationIds.has(currentStoredNotificationId)) {
                                await checklistNotificationManager.cancel(activity.id); // Usa o activity.id para gerar o ID correto a cancelar
                            }
                            needsReschedule = true;
                        } else if (!activeSystemNotificationIds.has(expectedNotificationId)) {
                            // ID esperado está correto, mas não está agendado no sistema.
                            needsReschedule = true;
                        }
                        // Se needsReschedule for true, tentaremos agendar.
                        if (needsReschedule) {
                            const scheduledId = await checklistNotificationManager.schedule(activity);
                            if (activity.notificationId !== scheduledId) {
                                activity.notificationId = scheduledId; // Atualiza com o ID real agendado (pode ser null)
                                activitiesModified = true;
                            }
                        }
                    } else { // Prazo passou ou é inválido
                        if (currentStoredNotificationId && activeSystemNotificationIds.has(currentStoredNotificationId)) {
                            await checklistNotificationManager.cancel(activity.id);
                        }
                        if (activity.notificationId !== null) {
                            activity.notificationId = null;
                            activitiesModified = true;
                        }
                    }
                } else { // Sem prazo ou "Conforme necessidade"
                    if (currentStoredNotificationId && activeSystemNotificationIds.has(currentStoredNotificationId)) {
                        await checklistNotificationManager.cancel(activity.id);
                    }
                    if (activity.notificationId !== null) {
                        activity.notificationId = null;
                        activitiesModified = true;
                    }
                }
            }

            // Limpar notificações PUSH no sistema que não correspondem a nenhuma atividade válida
            for (const systemNotifId of activeSystemNotificationIds) {
                const foundActivity = activities.find(act =>
                    checklistNotificationManager.generateNotificationId(act.id) === systemNotifId &&
                    act.notificationId === systemNotifId && // O ID armazenado na atividade deve bater
                    act.nextDeadlineDate && new Date(act.nextDeadlineDate + "T09:00:00") > new Date() && // E ainda ser futuro
                    act.customPeriod !== "Conforme necessidade"
                );
                if (!foundActivity) {
                    console.log(`[Checklist] Notificação PUSH órfã no sistema (ID: ${systemNotifId}). Cancelando.`);
                    await LocalNotifications.cancel({ notifications: [{ id: systemNotifId }] });
                }
            }


            if (activitiesModified) {
                utils.saveData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, activities);
                console.log("[Checklist] Atividades atualizadas com IDs de notificação PUSH reconciliados.");
            }
            console.log("[Checklist] Reconciliação de notificações PUSH para atividades concluída.");
        }
    };

    function loadAllKnownOccurrenceTypes() {
        let storedTypes = utils.loadData(STORAGE_KEYS.OCCURRENCE_TYPES, null);
        let initialTypes;

        // Tenta carregar os tipos predefinidos do script preloaded_activities.js
        // A função getPredefinedChecklistData deve retornar um objeto com uma propriedade occurrenceTypes
        let predefinedFromScript = [];
        if (typeof getPredefinedChecklistData === 'function') {
            try {
                const data = getPredefinedChecklistData(utils.calculateNextDeadlineDate); // Passa a função de cálculo de prazo
                if (data && Array.isArray(data.occurrenceTypes)) {
                    predefinedFromScript = data.occurrenceTypes;
                } else {
                    console.warn("getPredefinedChecklistData não retornou a estrutura esperada para occurrenceTypes.");
                }
            } catch (e) {
                console.error("Erro ao chamar getPredefinedChecklistData:", e);
            }
        } else {
            console.warn("Função getPredefinedChecklistData não encontrada. Verifique se preloaded_activities.js está carregado.");
        }


        if (storedTypes === null) { // Se não há nada no localStorage, usa os predefinidos do script
            initialTypes = [...predefinedFromScript];
            console.log("Occurrence types initialized from preloaded_activities.js as localStorage was empty.");
        } else if (Array.isArray(storedTypes) && storedTypes.every(item => typeof item === 'object' && item.key && item.name)) {
            // Se há tipos no localStorage, faz merge com os predefinidos do script,
            // dando preferência aos do localStorage em caso de conflito de chave, mas adicionando novos do script.
            initialTypes = [...storedTypes];
            const storedKeys = new Set(storedTypes.map(st => st.key));
            predefinedFromScript.forEach(pt => {
                if (!storedKeys.has(pt.key)) {
                    initialTypes.push(pt);
                }
            });
            console.log("Occurrence types loaded from storage and merged with predefined from script.");
        } else { // Fallback se os dados do localStorage forem inválidos
            console.warn("Stored occurrence types are invalid. Using predefined from script if available, otherwise empty list.");
            initialTypes = [...predefinedFromScript];
        }
        state.allKnownOccurrenceTypes = initialTypes.sort((a, b) => a.name.localeCompare(b.name));
        utils.saveData(STORAGE_KEYS.OCCURRENCE_TYPES, state.allKnownOccurrenceTypes); // Salva a lista consolidada
    }


    function populateOccurrenceSelect(selectElementId, includeDefaultOption = true, selectedKey = null, defaultOptionText = "Selecione...") {
        const selectElement = utils.getById(selectElementId);
        if (!selectElement) { console.warn(`Select ${selectElementId} não encontrado para popular ocorrências.`); return; }

        if (!state.allKnownOccurrenceTypes || state.allKnownOccurrenceTypes.length === 0) {
            loadAllKnownOccurrenceTypes(); // Carrega se o estado estiver vazio
        }

        const currentVal = selectedKey || selectElement.value; // Salva o valor atual se não for para definir um novo
        selectElement.innerHTML = ''; // Limpa opções existentes

        if (includeDefaultOption) {
            selectElement.add(new Option(defaultOptionText, ""));
        }

        state.allKnownOccurrenceTypes.forEach(occType => {
            selectElement.add(new Option(occType.name, occType.key));
        });

        // Tenta restaurar o valor selecionado
        if (selectedKey && Array.from(selectElement.options).some(o => o.value === selectedKey)) {
            selectElement.value = selectedKey;
        } else if (Array.from(selectElement.options).some(o => o.value === currentVal) && currentVal !== "") {
            selectElement.value = currentVal;
        } else if (includeDefaultOption) {
            selectElement.value = ""; // Volta para o default se nada mais funcionar
        }
    }

    const activityDraftManager = {
        save: () => {
            const form = utils.getById('activityForm');
            const modal = utils.getById('createActivityModal');
            // Só salva o rascunho se o modal estiver aberto E NÃO estiver em modo de edição
            if (!form || !modal || modal.classList.contains('hidden') || state.currentEditingActivityId) {
                return;
            }
            const draft = {
                titulo: utils.getById('titulo-checklist').value,
                occurrence: utils.getById('occurrence-checklist').value,
                description: utils.getById('description-checklist').value,
                norm: utils.getById('norm-checklist').value,
                team: utils.getById('team-checklist').value,
                type: utils.getById('type-checklist').value,
                period: utils.getById('period-checklist').value,
                customPeriod: utils.getById('customPeriod-checklist').value,
            };
            utils.saveData(STORAGE_KEYS.ACTIVITY_FORM_DRAFT, draft);
        },
        load: () => {
            // Não carrega rascunho se estiver em modo de edição
            if (state.currentEditingActivityId) return false;

            state.loadedActivityDraft = utils.loadData(STORAGE_KEYS.ACTIVITY_FORM_DRAFT, null);
            if (state.loadedActivityDraft) {
                utils.getById('titulo-checklist').value = state.loadedActivityDraft.titulo || "";

                // Garante que o select de ocorrências esteja populado antes de tentar setar o valor
                const occSelect = utils.getById('occurrence-checklist');
                if (occSelect.options.length <= 1 || occSelect.innerHTML.includes("Selecione")) { // Verifica se está vazio ou só com default
                    populateOccurrenceSelect('occurrence-checklist'); // Popula agora
                }
                occSelect.value = state.loadedActivityDraft.occurrence || "";


                utils.getById('description-checklist').value = state.loadedActivityDraft.description || "";
                utils.getById('norm-checklist').value = state.loadedActivityDraft.norm || "";
                utils.getById('team-checklist').value = state.loadedActivityDraft.team || "";
                utils.getById('type-checklist').value = state.loadedActivityDraft.type || "";
                utils.getById('period-checklist').value = state.loadedActivityDraft.period || "";

                createActivityFeature.toggleCustomPeriodInput(); // Chama para ajustar visibilidade do campo customizado
                if (state.loadedActivityDraft.period === "Customizado") {
                    utils.getById('customPeriod-checklist').value = state.loadedActivityDraft.customPeriod || "";
                }
                return true;
            }
            return false;
        },
        clear: () => {
            localStorage.removeItem(STORAGE_KEYS.ACTIVITY_FORM_DRAFT);
            state.loadedActivityDraft = null;
        },
        _saveTimeoutActivity: null,
        saveDebounced: () => {
            clearTimeout(activityDraftManager._saveTimeoutActivity);
            activityDraftManager._saveTimeoutActivity = setTimeout(activityDraftManager.save, 700);
        },
        attachListenersToActivityForm: () => {
            const form = utils.getById('activityForm');
            if (form) {
                form.addEventListener('input', activityDraftManager.saveDebounced);
                form.addEventListener('change', activityDraftManager.saveDebounced); // Para selects e checkboxes
            }
        }
    };

    const createActivityFeature = {
        openModal: (isEdit = false) => {
            utils.resetForm('activityForm'); // Reseta o formulário e currentEditingActivityId
            // state.currentEditingActivityId já é setado para null em utils.resetForm
            populateOccurrenceSelect('occurrence-checklist'); // Popula ocorrências sempre

            if (!isEdit) { // Se não for edição, tenta carregar um rascunho
                activityDraftManager.load();
            }
            // Se for edição, handleOpenEditActivityModal cuidará de popular o form.
            createActivityFeature.toggleCustomPeriodInput(); // Ajusta visibilidade do campo customizado
            utils.toggleModal('createActivityModal', true);
        },
        closeModal: () => {
            // Salva rascunho ANTES de fechar, mas só se não estiver editando.
            if (!state.currentEditingActivityId) {
                activityDraftManager.save();
            }
            utils.toggleModal('createActivityModal', false);
            state.currentEditingActivityId = null; // Garante que o modo de edição é limpo ao fechar
            // O reset do formulário é melhor feito ao ABRIR para um novo item,
            // ou após um submit bem-sucedido. Se o usuário só fechar, o rascunho persiste.
            // setTimeout(() => utils.resetForm('activityForm'), 300); // Delay para UI
        },
        toggleCustomPeriodInput: () => {
            const periodSelect = utils.getById('period-checklist');
            const customInput = utils.getById('customPeriod-checklist');
            if (!periodSelect || !customInput) return;

            const showCustom = periodSelect.value === 'Customizado';
            customInput.style.display = showCustom ? 'block' : 'none';
            customInput.required = showCustom;
            if (!showCustom) {
                customInput.value = ''; // Limpa se não for customizado
            }
        },
        handleSubmit: async (event) => { // Tornada async para lidar com notificações
            event.preventDefault();
            const title = utils.getById('titulo-checklist').value.trim();
            const occurrence = utils.getById('occurrence-checklist').value;
            const description = utils.getById('description-checklist').value.trim();
            const norm = utils.getById('norm-checklist').value.trim();
            const team = utils.getById('team-checklist').value;
            const type = utils.getById('type-checklist').value;
            const period = utils.getById('period-checklist').value;
            const customPeriodValue = utils.getById('customPeriod-checklist').value.trim();

            if (!title || !occurrence || !description || !team || !type || !period) {
                alert("Preencha todos os campos obrigatórios."); return;
            }
            if (period === 'Customizado' && !customPeriodValue.match(/(\d+)\s*(dias?|meses?|anos?|semanas?)/i) && customPeriodValue !== "Conforme necessidade") {
                alert('Período customizado inválido. Use formatos como "X dias", "X meses", "X anos", "X semanas" ou "Conforme necessidade".'); return;
            }

            let deadlineDate;
            let successMessage = "";
            let activityToUpdateOrAdd; // Para armazenar a atividade que será salva/atualizada

            if (state.currentEditingActivityId) {
                const activityIndex = state.pendingActivities.findIndex(act => act.id === state.currentEditingActivityId);
                if (activityIndex === -1) { alert("Erro: Atividade para edição não encontrada."); createActivityFeature.closeModal(); return; }

                const originalActivity = state.pendingActivities[activityIndex];
                deadlineDate = utils.calculateNextDeadlineDate(period, customPeriodValue, originalActivity.created); // Usa data de criação original como base
                if (!deadlineDate && period !== '' && !(period === 'Customizado' && !customPeriodValue) && customPeriodValue !== "Conforme necessidade") {
                     alert('Não foi possível calcular o próximo prazo para a atividade editada.'); return;
                }

                activityToUpdateOrAdd = {
                    ...originalActivity, // Mantém IDs e outras props
                    titulo: title, occurrence, description, norm, team, period,
                    customPeriod: period === 'Customizado' ? customPeriodValue : '', type,
                    nextDeadlineDate: customPeriodValue === "Conforme necessidade" ? null : deadlineDate,
                    // O notificationId será tratado abaixo
                };
                state.pendingActivities[activityIndex] = activityToUpdateOrAdd;
                successMessage = "Atividade atualizada!";
            } else {
                deadlineDate = utils.calculateNextDeadlineDate(period, customPeriodValue); // Para novas, usa data atual como base
                if (!deadlineDate && period !== '' && !(period === 'Customizado' && !customPeriodValue) && customPeriodValue !== "Conforme necessidade") {
                    alert('Não foi possível calcular o próximo prazo para a nova atividade.'); return;
                }
                activityToUpdateOrAdd = {
                    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, //
                    titulo: title, occurrence, description, norm, team, period,
                    customPeriod: period === 'Customizado' ? customPeriodValue : '',
                    type, created: new Date().toISOString(), lastPerformed: null, // Data de criação
                    nextDeadlineDate: customPeriodValue === "Conforme necessidade" ? null : deadlineDate,
                    notificationId: null // Iniciado como null para novas atividades
                };
                if (!Array.isArray(state.pendingActivities)) state.pendingActivities = [];
                state.pendingActivities.push(activityToUpdateOrAdd);
                successMessage = "Nova atividade adicionada!";
            }

            // Agendar/Reagendar notificação PUSH
            if (activityToUpdateOrAdd.notificationId) { // Se já tinha uma (caso de edição com notificação anterior)
                await checklistNotificationManager.cancel(activityToUpdateOrAdd.id); // Cancela a antiga usando o ID da atividade
            }
            const newNotificationId = await checklistNotificationManager.schedule(activityToUpdateOrAdd); // Tenta agendar a nova
            activityToUpdateOrAdd.notificationId = newNotificationId; // Atualiza com o novo ID (pode ser null)


            utils.saveData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, state.pendingActivities);
            if (!state.currentEditingActivityId) { // Limpa rascunho apenas se for uma nova atividade
                activityDraftManager.clear();
            }
            renderChecklistItems(); // Atualiza a UI
            createActivityFeature.closeModal(); // Fecha o modal
            alert(successMessage);
            state.currentEditingActivityId = null; // Limpa o ID de edição após o sucesso
        }
    };

    async function handleOpenEditActivityModal(activityId) {
        const activityToEdit = state.pendingActivities.find(act => act.id === activityId);
        if (!activityToEdit) { alert("Atividade não encontrada para edição."); return; }

        state.currentEditingActivityId = activityId; // Define que estamos editando
        activityDraftManager.clear(); // Limpa qualquer rascunho de "nova atividade"

        populateOccurrenceSelect('occurrence-checklist', true, activityToEdit.occurrence);
        utils.getById('titulo-checklist').value = activityToEdit.titulo;
        utils.getById('description-checklist').value = activityToEdit.description;
        utils.getById('norm-checklist').value = activityToEdit.norm || "";
        utils.getById('team-checklist').value = activityToEdit.team;
        utils.getById('type-checklist').value = activityToEdit.type;
        utils.getById('period-checklist').value = activityToEdit.period;

        createActivityFeature.toggleCustomPeriodInput(); // Ajusta visibilidade do campo customizado
        if (activityToEdit.period === 'Customizado') {
            utils.getById('customPeriod-checklist').value = activityToEdit.customPeriod || "";
        }

        const modalTitle = utils.getById('createActivityModal').querySelector('h2');
        if (modalTitle) modalTitle.textContent = "Editar Atividade do Checklist";
        const submitButton = utils.getById('activityForm').querySelector('button[type="submit"]');
        if (submitButton) submitButton.textContent = "Salvar Alterações";

        utils.toggleModal('createActivityModal', true);
    }

    async function handleRemoveActivity(activityId) {
        const activityTitle = state.pendingActivities.find(act => act.id === activityId)?.titulo || "esta atividade";
        if (confirm(`Tem certeza que deseja remover "${activityTitle}"?`)) {
            // Cancelar notificação PUSH antes de remover
            await checklistNotificationManager.cancel(activityId);

            state.pendingActivities = state.pendingActivities.filter(act => act.id !== activityId);
            utils.saveData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, state.pendingActivities);
            renderChecklistItems();
            alert("Atividade removida.");
        }
    }

    function loadChecklistData() {
        loadAllKnownOccurrenceTypes(); // Garante que os tipos de ocorrência sejam carregados

        let activities = utils.loadData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, null);

        if (activities === null) { // Se não há nada no localStorage para atividades
            if (typeof getPredefinedChecklistData === 'function') {
                const predefinedData = getPredefinedChecklistData(utils.calculateNextDeadlineDate);
                activities = predefinedData.activities || []; // Garante que seja um array
                 // Ao carregar atividades predefinidas, garantir que tenham um campo notificationId (null inicialmente)
                activities = activities.map(act => ({ ...act, notificationId: act.notificationId || null }));
                console.log("Atividades iniciais carregadas de preloaded_activities.js");
            } else {
                console.error("Função getPredefinedChecklistData não está definida. Verifique se preloaded_activities.js está carregado.");
                activities = [];
            }
            utils.saveData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, activities); // Salva as atividades iniciais (ou vazias)
        } else {
            // Garantir que atividades carregadas do LS tenham o campo notificationId
           activities = activities.map(act => ({ ...act, notificationId: act.notificationId || null }));
           console.log("Atividades carregadas do localStorage.");
        }

        state.pendingActivities = activities;
        state.archivedRecords = utils.loadData(STORAGE_KEYS.MAINTENANCE_ARCHIVED, []);
        state.locationConfig = utils.loadData(STORAGE_KEYS.LOCATION_CONFIG, { enabledCategories: {}, enabledAreas: {}, enabledEquipment: {}, pavimentos: [], customLocations: [], customAreas: {}, customEquipment: {} });
        state.suppliersChamado = utils.loadData(STORAGE_KEYS.CHAMADO_SUPPLIERS, []);

        // Reconciliar notificações PUSH ao carregar os dados
        checklistNotificationManager.reconcileAndScheduleAll();
    }

    function renderChecklistItems() {
        const container = utils.getById('checklist-items-container');
        if (!container) { console.error("Container 'checklist-items-container' não encontrado."); return; }

        // Pega valores dos filtros
        const filterEquipe = utils.getById('filter-equipe').value;
        const filterPeriodicidade = utils.getById('filter-periodicidade').value;
        const filterSistema = utils.getById('filter-sistema').value;

        // Filtra e ordena as atividades
        const filteredActivities = state.pendingActivities.filter(activity => {
            const matchesEquipe = !filterEquipe || activity.team === filterEquipe;
            const matchesPeriodicidade = !filterPeriodicidade || activity.period === filterPeriodicidade;
            const matchesSistema = !filterSistema || activity.occurrence === filterSistema;
            return matchesEquipe && matchesPeriodicidade && matchesSistema;
        }).sort((a, b) => { // Ordena por data de vencimento (mais próximas primeiro)
            const dateA = a.nextDeadlineDate ? new Date(a.nextDeadlineDate) : new Date(8640000000000000); // Datas futuras distantes para N/A
            const dateB = b.nextDeadlineDate ? new Date(b.nextDeadlineDate) : new Date(8640000000000000);
            const isValidA = !isNaN(dateA.getTime());
            const isValidB = !isNaN(dateB.getTime());

            if (isValidA && !isValidB) return -1; // Válidas antes de inválidas
            if (!isValidA && isValidB) return 1;  // Inválidas depois de válidas
            if (!isValidA && !isValidB) return 0; // Ambas inválidas, mantém ordem
            return dateA - dateB; // Ordena por data
         });

        // Limpa o container e adiciona os itens (ou mensagem de vazio)
        if (filteredActivities.length === 0) {
            container.innerHTML = `<p class="empty-list-message">Nenhuma atividade encontrada com os filtros atuais. Considere limpar os filtros ou <a href="#" id="resetFiltersLinkChecklist">mostrar todas as atividades</a>.</p>`;
            const resetLink = container.querySelector('#resetFiltersLinkChecklist');
            if (resetLink) {
                resetLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    utils.getById('filter-equipe').value = "";
                    utils.getById('filter-periodicidade').value = "";
                    utils.getById('filter-sistema').value = "";
                    renderChecklistItems(); // Re-renderiza com filtros limpos
                });
            }
            return;
        }

        container.innerHTML = ''; // Limpa antes de adicionar
        const fragment = document.createDocumentFragment();
        filteredActivities.forEach(activity => {
            fragment.appendChild(createChecklistItemElement(activity));
        });
        container.appendChild(fragment);
    }

    function createChecklistItemElement(activity) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'checklist-item';
        itemDiv.dataset.activityId = activity.id;

        const deadlineStr = activity.nextDeadlineDate;
        let deadline = null;
        let deadlineFormatted = 'N/A';
        let isOverdue = false;

        if (deadlineStr) { // Verifica se existe prazo
            const parts = deadlineStr.split('-'); // YYYY-MM-DD
            if (parts.length === 3) {
                deadline = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10));
                if (!isNaN(deadline.getTime())) {
                    deadline.setHours(0,0,0,0); // Normaliza para início do dia
                    deadlineFormatted = utils.formatDate(deadline);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Normaliza hoje também
                    isOverdue = deadline < today;
                } else {
                     deadlineFormatted = "Data inválida"; // Caso a data no LS esteja corrompida
                }
            } else { // Formato inesperado
                deadlineFormatted = "Formato de data inválido";
            }
        } else if (activity.customPeriod === "Conforme necessidade") {
            deadlineFormatted = "Sob Demanda";
        }


        if (isOverdue) {
            itemDiv.classList.add('overdue-item'); // Adiciona classe para destaque visual
        }

        const occurrenceName = utils.getOccurrenceName(activity.occurrence);

        // Botão "Abrir Chamado" ou "Ver Vencidas" dinâmico
        const abrirChamadoBtnText = isOverdue ? "Ver Vencidas" : "Abrir Chamado";
        const abrirChamadoBtnTitle = isOverdue ? "Ver atividades vencidas e abrir chamado" : "Abrir Chamado Corretivo para esta atividade";
        const abrirChamadoIcon = isOverdue ? 'notification_important' : 'bug_report'; // Ícone diferente para vencidas

        // ENCAPSULA OS DETALHES E AÇÕES EM UM CONTAINER EXPANSÍVEL
        itemDiv.innerHTML = `
            <div class="checklist-item-header">
                <h3>${activity.titulo || 'Sem Título'}</h3>
                <span class="checklist-item-deadline">Prazo: ${deadlineFormatted} ${isOverdue ? '<strong class="overdue-text-checklist">(Vencido!)</strong>' : ''}</span>
                <button class="toggle-details-btn-checklist" title="Mostrar/Esconder Detalhes">
                    <i class="material-icons">expand_more</i>
                </button>
            </div>
            <div class="checklist-item-expandable-content hidden">
                <div class="checklist-item-details">
                    <p><strong>Sistema:</strong> ${occurrenceName}</p>
                    <p><strong>Descrição:</strong> ${activity.description || 'N/A'}</p>
                    <p><strong>Ref/Norma:</strong> ${activity.norm || 'N/A'}</p>
                    <p><strong>Equipe:</strong> ${activity.team || 'N/A'}</p>
                    <p><strong>Tipo Manut.:</strong> ${activity.type || 'N/A'}</p>
                    <p><strong>Periodicidade:</strong> ${activity.period || 'N/A'} ${activity.customPeriod ? `(${activity.customPeriod})` : ''}</p>
                </div>
                <div class="checklist-item-actions">
                    <button class="btn btn-edit-activity" data-id="${activity.id}" title="Editar Atividade"><i class="material-icons">edit</i> Editar</button>
                    <button class="btn btn-remove-activity" data-id="${activity.id}" title="Remover Atividade"><i class="material-icons">delete</i> Remover</button>
                    <button class="btn btn-abrir-chamado ${isOverdue ? 'btn-warning-custom' : ''}" data-id="${activity.id}" title="${abrirChamadoBtnTitle}"><i class="material-icons">${abrirChamadoIcon}</i> ${abrirChamadoBtnText}</button>
                </div>
            </div>
        `;

        // Adiciona listeners para os botões de ação (dentro do conteúdo expansível)
        itemDiv.querySelector('.btn-edit-activity').addEventListener('click', (e) => {
            e.stopPropagation();
            handleOpenEditActivityModal(activity.id);
        });
        itemDiv.querySelector('.btn-remove-activity').addEventListener('click', (e) => {
            e.stopPropagation();
            handleRemoveActivity(activity.id);
        });

        // Listener para o botão "Abrir Chamado" / "Ver Vencidas"
        itemDiv.querySelector('.btn-abrir-chamado').addEventListener('click', (e) => {
            e.stopPropagation();
            if (isOverdue) {
                // MODIFICAÇÃO AQUI: Redirecionar para manutencao.html e passar o ID
                sessionStorage.setItem('highlightOverdueActivityId', activity.id); // Armazena o ID
                window.location.href = '../pages/manutencao.html'; // Redireciona para manutenção
            } else {
                openTicketModalForActivity(activity);
            }
        });

        // NOVO: Listener para o botão de toggle de detalhes
        const toggleButton = itemDiv.querySelector('.toggle-details-btn-checklist');
        const expandableContent = itemDiv.querySelector('.checklist-item-expandable-content');
        if (toggleButton && expandableContent) {
            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que o clique no botão ative o itemDiv.click()
                expandableContent.classList.toggle('hidden');
                toggleButton.querySelector('.material-icons').textContent = expandableContent.classList.contains('hidden') ? 'expand_more' : 'expand_less';
            });
            // Opcional: Clique em qualquer lugar do header para expandir/recolher
            itemDiv.querySelector('.checklist-item-header').addEventListener('click', (e) => {
                if (e.target !== toggleButton && !toggleButton.contains(e.target)) { // Garante que não é o próprio botão de toggle
                    expandableContent.classList.toggle('hidden');
                    toggleButton.querySelector('.material-icons').textContent = expandableContent.classList.contains('hidden') ? 'expand_more' : 'expand_less';
                }
            });
        }

        return itemDiv;
    }

    const chamadosCorretivosChecklist = {
        populateLocationCategories: () => {
            const sel = utils.getById('ticket-location-category-chamado-checklist');
            if (!sel) { console.error("Select de categoria de chamado (checklist) não encontrado."); return; }
            const cfg = state.locationConfig;
            sel.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            if (!cfg || (!Object.keys(cfg.enabledCategories || {}).length && !(cfg.customLocations || []).length)) {
                sel.options[0].textContent = 'Nenhuma config. de localização'; sel.disabled = true; return;
            }
            const categoriesToDisplay = [];
            const predefinedLabels = { "SUBSOLO": "🧱 SUBSOLO", "TERREO": "🏢 TÉRREO", "ANDARES_TIPO": "🏠 ANDARES TIPO", "COBERTURA": "🏗️ COBERTURA" };
            if (cfg.enabledCategories) {
                for (const key in predefinedLabels) { if (cfg.enabledCategories[key]) categoriesToDisplay.push({ value: key, text: predefinedLabels[key] }); }
            }
            if (cfg.customLocations && Array.isArray(cfg.customLocations)) {
                cfg.customLocations.forEach(customLoc => { if (customLoc.id && customLoc.name) categoriesToDisplay.push({ value: customLoc.id, text: `📍 ${customLoc.name} (Personalizado)` }); });
            }
            if (categoriesToDisplay.length > 0) {
                categoriesToDisplay.sort((a, b) => a.text.localeCompare(b.text)).forEach(cat => sel.add(new Option(cat.text, cat.value)));
                sel.disabled = false;
            } else { sel.options[0].textContent = 'Nenhuma categoria ativa'; sel.disabled = true; }
        },
        populateLocationAreas: (categoryKeyOrId) => {
            const sel = utils.getById('ticket-location-area-chamado-checklist');
            const customAreaInput = utils.getById('ticket-area-custom-chamado-checklist');
            if (!sel || !customAreaInput) return;
            const cfg = state.locationConfig;
            sel.innerHTML = '<option value="" selected disabled>Selecione Área/Local...</option>';
            sel.disabled = true; customAreaInput.classList.add('hidden'); customAreaInput.required = false; customAreaInput.value = '';
            if (!categoryKeyOrId || !cfg) return;
            const areasToDisplay = [];
            const predefinedCategories = ["SUBSOLO", "TERREO", "ANDARES_TIPO", "COBERTURA"];
            const isPredefinedCategory = predefinedCategories.includes(categoryKeyOrId);
            if (isPredefinedCategory) {
                if (cfg.enabledAreas?.[categoryKeyOrId]?.length) cfg.enabledAreas[categoryKeyOrId].forEach(areaName => areasToDisplay.push({ value: areaName, text: areaName }));
                if (categoryKeyOrId === "ANDARES_TIPO" && cfg.pavimentos?.length) cfg.pavimentos.forEach(pav => { const pText = `Pavimento ${pav}`; if (!areasToDisplay.some(a => a.value === pText)) areasToDisplay.push({ value: pText, text: pText }); });
                if (cfg.customAreas?.[categoryKeyOrId]?.length) cfg.customAreas[categoryKeyOrId].forEach(ca => areasToDisplay.push({ value: ca.id, text: `${ca.name} (Personalizado)` }));
            } else { // Categoria Customizada
                if (cfg.customAreas?.[categoryKeyOrId]?.length) cfg.customAreas[categoryKeyOrId].forEach(ca => areasToDisplay.push({ value: ca.id, text: ca.name }));
            }
            if (areasToDisplay.length > 0) {
                areasToDisplay.sort((a, b) => a.text.localeCompare(b.text)).forEach(area => sel.add(new Option(area.text, area.value)));
                if (isPredefinedCategory) sel.add(new Option("Outro (Especificar)", "Outro (Especificar)"));
                sel.disabled = false;
            } else {
                sel.options[0].textContent = isPredefinedCategory ? 'Nenhuma área específica, usar "Outro"' : 'Nenhuma área configurada';
                if (isPredefinedCategory) { sel.innerHTML = '<option value="Outro (Especificar)" selected>Outro (Especificar)</option>'; sel.disabled = false; sel.dispatchEvent(new Event('change'));}
            }
        },
        populateEquipment: (categoryKeyOrId, areaKeyOrId) => {
            const section = utils.getById('equipment-section-chamado-checklist');
            const listDiv = utils.getById('equipment-list-chamado-checklist');
            if (!section || !listDiv) return;
            section.classList.add('hidden'); listDiv.innerHTML = '';
            if (!categoryKeyOrId || !areaKeyOrId || areaKeyOrId === "Outro (Especificar)") return;
            const cfg = state.locationConfig; if (!cfg) return;
            const equipmentSet = new Set();
            const generalKey = categoryKeyOrId; // Para equipamentos gerais da categoria
            const specificKey = `${categoryKeyOrId}::${areaKeyOrId}`; // Para equipamentos específicos da área

            // Equipamentos gerais da categoria
            (cfg.enabledEquipment?.[generalKey] || []).forEach(eq => equipmentSet.add(eq.name || eq));
            (cfg.customEquipment?.[generalKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));

            // Equipamentos específicos da área ou pavimento
            if (categoryKeyOrId === 'ANDARES_TIPO' && areaKeyOrId.startsWith('Pavimento ')) {
                // Equipamentos padrão de áreas comuns de andar tipo
                ["Corredor/Hall de Andar Padrão", "Escada de Emergência Padrão", "Shaft de Medidores do Andar"].forEach(andarArea => {
                    const key = `${categoryKeyOrId}::${andarArea}`;
                    (cfg.enabledEquipment?.[key] || []).forEach(eq => equipmentSet.add(eq.name || eq));
                });
                // Equipamentos customizados do pavimento específico
                (cfg.customEquipment?.[specificKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));
            } else { // Para outras categorias ou áreas customizadas
                (cfg.enabledEquipment?.[specificKey] || []).forEach(eq => equipmentSet.add(eq.name || eq));
                (cfg.customEquipment?.[specificKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));
            }

            if (equipmentSet.size > 0) {
                Array.from(equipmentSet).sort().forEach((equipName, idx) => {
                    const idBase = `checklist-chamado-equip-${categoryKeyOrId.replace(/\W/g,'')}-${areaKeyOrId.replace(/\W/g,'')}-${idx}`;
                    const item = document.createElement('div'); item.className = 'equipment-item';
                    item.innerHTML = `<input type="checkbox" id="${idBase}" name="equipment_chamado_checklist" value="${equipName}"><label for="${idBase}">${equipName}</label><input type="number" class="form-control equip-qty-input" id="qty-${idBase}" placeholder="Qtd" min="1" value="1" style="display:none;">`;
                    const cb = item.querySelector('input[type="checkbox"]'); const qtyIn = item.querySelector('input.equip-qty-input');
                    cb.onchange = (e) => { qtyIn.style.display = e.target.checked ? 'inline-block' : 'none'; if (!e.target.checked) qtyIn.value = '1';};
                    listDiv.appendChild(item);
                });
                section.classList.remove('hidden');
            }
        },
        updatePreviewModal: () => {
            const previewContainer = utils.getById('previewModalChecklist').querySelector('.preview-container');
            if (!previewContainer) return;

            const ticket = state.currentTicketChamado;
            if (!ticket || Object.keys(ticket).length === 0) {
                previewContainer.innerHTML = "<p>Dados do chamado não disponíveis para pré-visualização.</p>"; return;
            }
            const equipText = ticket.equipment && ticket.equipment.length > 0
                ? ticket.equipment.map(eq => `${eq.name} (Qtd: ${eq.quantity})`).join('\n')
                : 'Nenhum';

            previewContainer.innerHTML = `
                <div class="preview-title">Detalhes</div>
                <div class="preview-item"><span class="preview-label">Sistema:</span><span class="preview-value">${utils.getOccurrenceName(ticket.occurrence)}</span> <span id="preview-occurrence-contract-info-checklist-value" style="font-size: 0.8em; margin-left: 10px; color: green; display: none;"></span></div>
                <div class="preview-item"><span class="preview-label">Localização:</span><span class="preview-value">${ticket.location || 'N/A'}</span></div>
                ${ticket.equipment && ticket.equipment.length > 0 ? `<div class="preview-item"><span class="preview-label">Equipamento(s):</span><span class="preview-value" style="white-space: pre-wrap;">${equipText}</span></div>` : ''}
                <div class="preview-item"><span class="preview-label">Descrição:</span><span class="preview-value">${ticket.description || 'N/A'}</span></div>
                <div class="preview-item"><span class="preview-label">Prioridade:</span><span class="preview-value">${ticket.priority || 'N/A'}</span></div>
            `;
            chamadosCorretivosChecklist.populatePreviewSupplierDropdown();
        },
        populatePreviewSupplierDropdown: () => {
            const supplierSection = utils.getById('previewModalChecklist').querySelector('.whatsapp-section');
            if (!supplierSection) return;

            const ticket = state.currentTicketChamado;
            if (!ticket || !ticket.occurrence) {
                supplierSection.innerHTML = "<p>Erro ao carregar fornecedores.</p>"; return;
            }

            const filteredSuppliers = state.suppliersChamado.filter(s => s.mainOccurrence === ticket.occurrence);
            let supplierHtml = `<h3 class="preview-title">Enviar para Fornecedor</h3>`;

            if (filteredSuppliers.length > 0) {
                supplierHtml += `<label for="supplier-select-chamado-checklist" class="form-label">Selecione o fornecedor para esta ocorrência:</label>
                                 <select class="form-select" id="supplier-select-chamado-checklist">
                                     <option value="">Selecione um fornecedor...</option>
                                     ${filteredSuppliers.sort((a,b) => a.name.localeCompare(b.name)).map(s => `<option value="${s.id}" ${ticket.supplierId === s.id ? 'selected' : ''}>${s.name} (${utils.getOccurrenceName(s.mainOccurrence)})</option>`).join('')}
                                 </select>`;
            } else {
                supplierHtml += `<div class="status-message status-info">Nenhum fornecedor cadastrado para este tipo de ocorrência.</div>
                                 <p style="margin-top: 10px;">Não encontrou o fornecedor ou precisa de outro tipo de serviço?
                                     <a href="../pages/fornecedores.html" target="_blank" class="btn btn-info" style="text-decoration: none; display: inline-block; padding: 5px 10px; font-size:0.8em; color:white; background-color: var(--primary); border-radius:4px;">
                                         Gerenciar Fornecedores
                                     </a>
                                 </p>`;
            }
            supplierHtml += `<button class="whatsapp-btn" id="send-whatsapp-btn-chamado-checklist" ${!ticket.supplierId || filteredSuppliers.length === 0 ? 'disabled' : ''}><i class="fab fa-whatsapp"></i> Enviar via WhatsApp</button>`;
            supplierSection.innerHTML = supplierHtml;

            const sel = utils.getById('supplier-select-chamado-checklist');
            if (sel) {
                sel.addEventListener('change', (e) => {
                    const selectedSupplierId = e.target.value;
                    const whatsappBtn = utils.getById('send-whatsapp-btn-chamado-checklist');
                    if (whatsappBtn) whatsappBtn.disabled = !selectedSupplierId;

                    if (!state.currentTicketChamado) state.currentTicketChamado = {};
                    if (selectedSupplierId && state.suppliersChamado) {
                        const supplier = state.suppliersChamado.find(s => String(s.id) === String(selectedSupplierId));
                        if (supplier) {
                            state.currentTicketChamado.supplierId = supplier.id;
                            state.currentTicketChamado.supplierName = supplier.name;
                            state.currentTicketChamado.supplierPhone = supplier.phone;
                        }
                    } else {
                        state.currentTicketChamado.supplierId = null;
                        state.currentTicketChamado.supplierName = "Nenhum fornecedor selecionado";
                        state.currentTicketChamado.supplierPhone = null;
                    }
                    // Atualiza info de contrato no preview do sistema
                    const contractInfoSpan = utils.getById('preview-occurrence-contract-info-checklist-value');
                    if (contractInfoSpan) {
                         const selectedSupplier = state.suppliersChamado.find(s => String(s.id) === String(selectedSupplierId));
                         if (selectedSupplier?.hasContract && selectedSupplier.mainOccurrence) {
                             contractInfoSpan.textContent = ticket.occurrence === selectedSupplier.mainOccurrence ? '(Contrato principal para esta ocorrência)' : `(Contrato principal para: ${utils.getOccurrenceName(selectedSupplier.mainOccurrence)})`;
                             contractInfoSpan.style.display = 'inline';
                         } else {
                             contractInfoSpan.style.display = 'none';
                         }
                    }
                });
                // Dispara o evento change se um fornecedor já estiver selecionado no currentTicketChamado (ex: ao voltar do preview)
                if (ticket.supplierId) sel.dispatchEvent(new Event('change'));
            }

             // Adiciona listener para o botão do WhatsApp SE ELE EXISTIR
             const whatsappBtn = utils.getById('send-whatsapp-btn-chamado-checklist');
             if (whatsappBtn) {
                 whatsappBtn.addEventListener('click', chamadosCorretivosChecklist.handleSendWhatsApp);
             }
        },
        handleTicketFormSubmit: (event) => {
            event.preventDefault();
            const occEl = utils.getById('occurrence-type-chamado-checklist'); const descEl = utils.getById('description-chamado-checklist'); const priEl = utils.getById('priority-chamado-checklist');
            const catSel = utils.getById('ticket-location-category-chamado-checklist'); const areaSel = utils.getById('ticket-location-area-chamado-checklist'); const customAreaEl = utils.getById('ticket-area-custom-chamado-checklist');

            if (!occEl?.value || !descEl?.value.trim() || !priEl?.value) { alert("Preencha Sistema, Descrição e Prioridade."); return; }
            if (!catSel?.value) { alert('Selecione a Categoria da localização.'); return; }
            const areaVal = areaSel?.value; const customAreaVal = customAreaEl?.value.trim();
            if (!areaVal && !customAreaVal && areaSel?.options[areaSel.selectedIndex]?.text !== 'Especifique abaixo') { alert('Selecione ou especifique a Área.'); return; }
            if (areaVal === 'Outro (Especificar)' && !customAreaVal) { alert('Especifique a área customizada.'); customAreaEl.focus(); return; }

            const catData = utils.getSelectedData(catSel); const areaData = utils.getSelectedData(areaSel);
            let locStr = catData.text.replace(/ \(Personalizado\)$/, '').replace(/^(🧱|🏢|🏠|🏗️|📍)\s*/, '');
            if (areaData.value === 'Outro (Especificar)' || (areaData.value === "" && customAreaVal)) { locStr += ` - Outro: ${customAreaVal}`; }
            else if (areaData.value) { locStr += ` - ${areaData.text.replace(/ \(Personalizado\)$/, '')}`; }

            const equipSel = [];
            document.querySelectorAll('#equipment-list-chamado-checklist input[type="checkbox"]:checked').forEach(cb => {
                const qtyIn = utils.getById(`qty-${cb.id}`);
                equipSel.push({ name: cb.value, quantity: (qtyIn ? parseInt(qtyIn.value) : 1) || 1 });
            });

            state.currentTicketChamado = {
                occurrence: occEl.value,
                location: locStr,
                equipment: equipSel,
                description: descEl.value.trim(),
                priority: priEl.value,
                supplierId: state.currentTicketChamado?.supplierId || null, // Mantém o fornecedor se já selecionado no preview
                supplierName: state.currentTicketChamado?.supplierName || "Nenhum fornecedor selecionado",
                supplierPhone: state.currentTicketChamado?.supplierPhone || null,
                associatedActivityId: utils.getById('ticketAssociatedActivityIdChecklist').value || null
            };
            chamadosCorretivosChecklist.updatePreviewModal();
            utils.toggleModal('ticketModalChecklist', false);
            utils.toggleModal('previewModalChecklist', true);
        },
        handleSendWhatsApp: () => {
            const supplierIdToUse = state.currentTicketChamado.supplierId;
            if (!supplierIdToUse) { alert('Selecione um fornecedor.'); return; }
            const sup = state.suppliersChamado.find(s => String(s.id) === String(supplierIdToUse));
            if (!sup || !sup.phone) { alert('Dados do fornecedor (telefone) não encontrados.'); return; }

            const condo = utils.loadData(STORAGE_KEYS.CONDO_DATA, { nomecondo: "Seu Condomínio" }); // Carrega dados do condomínio

            let equipTxt = "";
            if (state.currentTicketChamado.equipment?.length > 0) {
                 equipTxt = "\n\n*Equipamento(s) Afetado(s):*\n" + state.currentTicketChamado.equipment.map(eq => `- ${eq.name || ''} (Qtd: ${eq.quantity || 1})`).join("\n");
            }

            const ticket = state.currentTicketChamado;
            const prioridadeText = ticket.priority || 'N/A';
            const prazoEstimadoText = getPrazoPorPrioridadeText(prioridadeText); // Usa a função de formatação de prazo

            let contatoCondoMsg = "";
            const contatoTelefone = condo.telefonesindico || condo.telefonecondo; // Prioriza telefone do síndico
            if (contatoTelefone) {
                 contatoCondoMsg = `\n\n*Contato do Condomínio (${condo.nomecondo || 'Não especificado'}):*\n${utils.formatPhone(contatoTelefone)}`;
            }


            const msg = `📢 *NOVO CHAMADO CORRETIVO* 📢\n` +
                          `--------------------------------------------------\n` +
                          `*Condomínio:* ${condo.nomecondo || 'Não especificado'}\n` +
                          `*Data da Solicitação:* ${new Date().toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit', year: 'numeric'})} às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}\n\n` +
                          `*Detalhes do Chamado:*\n` +
                          `  • *Serviço Solicitado:* ${utils.getOccurrenceName(ticket.occurrence) || 'N/A'}\n` +
                          `  • *Localização:* ${ticket.location || 'N/A'}` +
                          `${equipTxt}\n` + // Equipamentos já formatados
                          `  • *Descrição do Problema:* ${ticket.description || 'N/A'}\n\n` +
                          `*Nível de Prioridade:* ${prioridadeText}\n` +
                          `*Prazo Desejado para Atendimento:* ${prazoEstimadoText}` +
                          `${contatoCondoMsg}\n`+ // Informações de contato do condomínio
                          `--------------------------------------------------\n` +
                          `_Aguardamos o contato para agendamento e informações sobre disponibilidade e orçamento (se aplicável)._`;

            const cleanedPhone = utils.cleanInput(sup.phone); // Remove caracteres não numéricos
            if (!cleanedPhone) { alert("Número de telefone do fornecedor inválido."); return; }
            alert(`Ao continuar, será enviado um chamado via WhatsApp para a empresa ${sup.name} (${utils.formatPhone(sup.phone)}).`); // Alerta adicionado
            if (confirm("Confirmar envio do chamado via WhatsApp?")) { // Confirmação adicionada
                const whatsappLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(msg)}`;
                window.open(whatsappLink, '_blank');
            }
        },
        handleConfirmAndRedirectTicket: () => {
            const finalSupplierId = state.currentTicketChamado.supplierId;
            const sup = finalSupplierId && state.suppliersChamado ? state.suppliersChamado.find(s => String(s.id) === String(finalSupplierId)) : null;
            const condo = utils.loadData(STORAGE_KEYS.CONDO_DATA, { nomecondo: "Condomínio Padrão" });

            if (!state.currentTicketChamado.occurrence || !state.currentTicketChamado.location || !state.currentTicketChamado.priority || !state.currentTicketChamado.description) {
                alert("Erro: Dados essenciais do chamado estão faltando. Por favor, revise o formulário.");
                utils.toggleModal('previewModalChecklist', false);
                utils.toggleModal('ticketModalChecklist', true); // Volta para o formulário
                return;
            }

            const newTicketEntry={
                id:`ch_${Date.now()}_${Math.random().toString(36).substring(2,7)}`,
                createdAt:new Date().toISOString(),
                condoName:condo.nomecondo,
                occurrence:state.currentTicketChamado.occurrence,
                location:state.currentTicketChamado.location,
                description:state.currentTicketChamado.description,
                priority:state.currentTicketChamado.priority,
                equipment:state.currentTicketChamado.equipment||[],
                supplierId:sup?sup.id:null,
                supplierName:sup?sup.name:(finalSupplierId ? "Fornecedor não encontrado" : "Nenhum fornecedor selecionado"),
                supplierPhone:sup?sup.phone:null,
                status:'Pendente', // Status inicial
                // Campos para etapas futuras, inicializados como null
                proposalValue:null,
                completionStatus:null, // 'concluida', 'cancelada'
                completionDescription:null,
                completedAt:null,
                serviceOrderPhoto:null,
                finalDescription:null,
                archivedAt:null,
                archivedReason:null,
                sourceMaintenanceActivityId: state.currentTicketChamado.associatedActivityId // ID da atividade do checklist que originou o chamado
            };

            try {
                sessionStorage.setItem('newTicketData',JSON.stringify(newTicketEntry));
                state.currentTicketChamado = {}; // Limpa o estado do chamado atual
                utils.resetForm('ticketFormChecklist'); // Reseta o formulário de chamado
                // Redireciona para a página de acompanhamento de chamados
                window.location.href = '../pages/chamados.html';
            } catch(e) {
                console.error("Erro ao salvar chamado (checklist):", e);
                alert("Erro ao salvar chamado. Verifique o console para detalhes.");
                sessionStorage.removeItem('newTicketData'); // Limpa em caso de erro
            }
            finally {
                utils.toggleModal('previewModalChecklist', false); // Fecha o modal de preview
            }
        }
    };
    // Função auxiliar para formatação de prazo de atendimento por prioridade
    function getPrazoPorPrioridadeText(priorityLevel) { // Copiada de manutencao.js para consistência
        switch (priorityLevel) {
            case 'Baixo':
                return "Atendimento preferencialmente em 1 a 7 dias (flexível, a negociar).";
            case 'Média':
                return "Atendimento preferencialmente em 1 a 5 dias.";
            case 'Alta':
                return "Atendimento URGENTE - Necessário em até 72 horas.";
            case 'Urgência':
                return "Atendimento EMERGENCIAL - Necessário em até 48 horas.";
            default:
                return "Prazo a definir.";
        }
    }

    function openTicketModalForActivity(activity) {
        utils.resetForm('ticketFormChecklist'); // Reseta e prepara o formulário
        state.currentTicketChamado = {}; // Limpa qualquer rascunho de chamado anterior

        chamadosCorretivosChecklist.populateLocationCategories(); // Popula categorias de localização

        // Preenche o sistema/ocorrência baseado na atividade e desabilita
        populateOccurrenceSelect('occurrence-type-chamado-checklist', true, activity.occurrence);
        const occSelect = utils.getById('occurrence-type-chamado-checklist');
        if (occSelect) {
            occSelect.value = activity.occurrence; // Define o valor
            occSelect.disabled = true; // Desabilita para o usuário não mudar
        }

        // Preenche a descrição com informações da atividade
        const descInput = utils.getById('description-chamado-checklist');
        if (descInput) {
            descInput.value = `Chamado referente à atividade: "${activity.titulo || utils.getOccurrenceName(activity.occurrence)}".\nDescrição original: ${activity.description || 'N/A'}.\nPrazo original: ${activity.nextDeadlineDate ? utils.formatDate(activity.nextDeadlineDate) : 'N/A (Sob Demanda)'}.`;
        }

        // Guarda o ID da atividade que originou o chamado
        const assocIdInput = utils.getById('ticketAssociatedActivityIdChecklist');
        if (assocIdInput) {
            assocIdInput.value = activity.id;
        }

        utils.toggleModal('ticketModalChecklist', true); // Abre o modal
    }

    // --- Inicialização e Event Listeners ---
    function init() {
        console.log("Checklist JS: Iniciando init()...");
        loadChecklistData(); // Carrega dados e reconcilia notificações PUSH

        // Popula filtros e renderiza a lista inicial
        populateOccurrenceSelect('filter-sistema', true, null, "Todos os Sistemas");
        renderChecklistItems();

        // Rascunho para formulário de nova atividade
        activityDraftManager.attachListenersToActivityForm();

        // Listeners para botões e formulários
        const openCreateActivityBtn = utils.getById('openCreateActivityModalButtonChecklist');
        if (openCreateActivityBtn) openCreateActivityBtn.addEventListener('click', () => createActivityFeature.openModal(false));

        const activityForm = utils.getById('activityForm');
        if (activityForm) activityForm.addEventListener('submit', createActivityFeature.handleSubmit);

        const periodSelectModal = utils.getById('period-checklist');
        if (periodSelectModal) periodSelectModal.addEventListener('change', createActivityFeature.toggleCustomPeriodInput);

        // Listeners para filtros da lista
        utils.getById('filter-equipe').addEventListener('change', renderChecklistItems);
        utils.getById('filter-periodicidade').addEventListener('change', renderChecklistItems);
        utils.getById('filter-sistema').addEventListener('change', renderChecklistItems);

        // Listeners para o fluxo de criação de chamado a partir do checklist
        const ticketFormChecklistEl = utils.getById('ticketFormChecklist');
        if(ticketFormChecklistEl) ticketFormChecklistEl.addEventListener('submit', chamadosCorretivosChecklist.handleTicketFormSubmit);

        const ticketLocCatChecklist = utils.getById('ticket-location-category-chamado-checklist');
        if(ticketLocCatChecklist) ticketLocCatChecklist.addEventListener('change', (e) => chamadosCorretivosChecklist.populateLocationAreas(e.target.value));

        const ticketLocAreaChecklist = utils.getById('ticket-location-area-chamado-checklist');
        if(ticketLocAreaChecklist) {
            ticketLocAreaChecklist.addEventListener('change', (e) => {
                const area = e.target.value; const catSel = utils.getById('ticket-location-category-chamado-checklist');
                const cat = catSel ? catSel.value : null; const customAreaInput = utils.getById('ticket-area-custom-chamado-checklist');
                // Lógica para mostrar/esconder input de área customizada
                if(customAreaInput && cat){
                    const showCustomArea = area === 'Outro (Especificar)';
                    customAreaInput.classList.toggle('hidden', !showCustomArea);
                    customAreaInput.required = showCustomArea;
                    if(!showCustomArea) customAreaInput.value = ''; else if(showCustomArea) customAreaInput.focus();
                }
                if(cat) chamadosCorretivosChecklist.populateEquipment(cat, area); // Popula equipamentos
            });
        }

        const backToFormBtnChecklist = utils.getById('back-to-form-btn-chamado-checklist-btn');
        if(backToFormBtnChecklist) backToFormBtnChecklist.addEventListener('click', () => { utils.toggleModal('previewModalChecklist', false); utils.toggleModal('ticketModalChecklist', true);});

        const confirmTicketBtnChecklist = utils.getById('confirm-ticket-btn-chamado-checklist-btn');
        if(confirmTicketBtnChecklist) confirmTicketBtnChecklist.addEventListener('click', chamadosCorretivosChecklist.handleConfirmAndRedirectTicket);

        // Listeners globais para fechar modais (ESC e clique fora)
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            let modalIdToClose = null;
            const dynamicCloseButton = target.closest('.modal-dynamic-close');

            if (dynamicCloseButton) { // Se clicou em um botão de fechar com a classe .modal-dynamic-close
                modalIdToClose = dynamicCloseButton.dataset.modalId || dynamicCloseButton.closest('.modal, .modal-overlay')?.id;
            }
            // Se clicou diretamente no overlay (fundo do modal)
            else if (target.classList.contains('modal-overlay')) {
                const modalContent = target.querySelector('.modal-content, .modal-container');
                // Garante que o clique foi no overlay e não no conteúdo do modal
                if (modalContent && !modalContent.contains(e.target)) { // Checa se o clique foi fora do conteúdo
                     modalIdToClose = target.id;
                }
            }

            if (modalIdToClose) {
                if (modalIdToClose === 'createActivityModal') { createActivityFeature.closeModal(); }
                else if (modalIdToClose === 'ticketModalChecklist' || modalIdToClose === 'previewModalChecklist' || modalIdToClose === 'imageViewerModal') {
                    utils.toggleModal(modalIdToClose, false);
                }
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === "Escape") {
                const modals = ['createActivityModal', 'ticketModalChecklist', 'previewModalChecklist', 'imageViewerModal'];
                for (const modalId of modals) {
                    const modal = utils.getById(modalId);
                    if (modal && !modal.classList.contains('hidden')) {
                        if (modalId === 'createActivityModal') createActivityFeature.closeModal();
                        else utils.toggleModal(modalId, false);
                        break; // Fecha apenas o modal mais ativo
                    }
                }
            }
        });
        console.log("Checklist JS: init() concluído.");
    }

    init(); // Chama a função de inicialização
});