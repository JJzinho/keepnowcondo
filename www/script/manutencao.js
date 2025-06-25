// ================================================
// SECTION 1: CONFIGURAÇÃO E ESTADO GLOBAL
// ================================================
const STORAGE_KEYS = {
    MAINTENANCE_ACTIVITIES: 'activities_v3',
    CHAMADO_SUPPLIERS: 'condoSuppliersChamado_manutencao',
    LOCATION_CONFIG: 'condoLocationConfig_v7_full_modal',
    CONDO_DATA: 'condominioData',
    OCCURRENCE_TYPES: 'condoAllOccurrenceTypes_v1',
    TICKET_FORM_DRAFT: 'manutencaoTicketFormDraft_v3',
    SCHEDULED_VISITS: 'scheduledVisits_v2',
    ARCHIVED_VISITS: 'archivedVisits_v1'
};

let state = {
    activities: [],
    suppliersChamado: [],
    allKnownOccurrenceTypes: [],
    currentTicketChamado: {},
    locationConfig: {
        enabledCategories: {}, enabledAreas: {}, enabledEquipment: {},
        pavimentos: [], customLocations: [], customAreas: {}, customEquipment: {}
    },
    loadedTicketDraft: null,
    scheduledVisits: [],
    currentEditingVisitId: null,
    archivedVisits: []
};

// ================================================
// SECTION 2: FUNÇÕES UTILITÁRIAS
// ================================================
const utils = {
    getById: (id) => document.getElementById(id),
    formatDate: (dateInput, includeTime = false) => {
        if (!dateInput) return 'N/A';
        try {
            let date;
            if (dateInput instanceof Date) { date = dateInput; }
            else if (typeof dateInput === 'string' && (dateInput.includes('T') || dateInput.includes(' '))) { date = new Date(dateInput); }
            else if (typeof dateInput === 'string') {
                const parts = dateInput.split('-');
                if (parts.length === 3) { date = new Date(parseInt(parts[0],10), parseInt(parts[1],10) - 1, parseInt(parts[2],10)); }
                else { date = new Date(dateInput); }
            } else { date = new Date(dateInput); }

            if (isNaN(date.getTime())) return 'Data inválida';

            const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return date.toLocaleDateString('pt-BR', options);
        } catch (e) { console.error("Erro formatando data:", dateInput, e); return 'Erro data'; }
    },
    formatPhone: (phone) => {
        if (!phone) return "Não informado";
        const cleaned = ('' + phone).replace(/\D/g, '');
        if (!cleaned) return "Não informado";
         if (cleaned.startsWith('55') && cleaned.length >= 12) {
             const ddd = cleaned.substring(2, 4);
             const numberPart = cleaned.substring(4);
             if (numberPart.length === 9) return `+55 (${ddd}) ${numberPart.substring(0, 5)}-${numberPart.substring(5)}`;
             if (numberPart.length === 8) return `+55 (${ddd}) ${numberPart.substring(0, 4)}-${numberPart.substring(4)}`;
         }
         if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
         if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        return phone;
    },
    saveData: (key, data) => {
        try { localStorage.setItem(key, JSON.stringify(data)); console.log(`LS Salvo: ${key}`); }
        catch (e) { console.error(`LS Erro ao salvar ${key}:`, e); alert(`Erro ao salvar dados (${key}).`); }
    },
    loadData: (key, defaultVal = null) => {
        const d = localStorage.getItem(key);
        if (d === null) { console.warn(`LS: Nenhum dado para chave '${key}'. Retornando padrão.`); return defaultVal; }
        try { const p = JSON.parse(d); console.log(`LS: Dados carregados para '${key}'.`); return p; }
        catch (e) { console.error(`LS Erro ao carregar/parsear '${key}':`, d, e); return defaultVal; }
    },
    getOccurrenceName: (key) => {
        if (!state.allKnownOccurrenceTypes || state.allKnownOccurrenceTypes.length === 0) {
             state.allKnownOccurrenceTypes = utils.loadData(STORAGE_KEYS.OCCURRENCE_TYPES, []);
             if (state.allKnownOccurrenceTypes.length === 0) {
                state.allKnownOccurrenceTypes = [
                    { key: "Hidraulica", name: "Hidráulica" }, { key: "Eletrica", name: "Elétrica" },
                    { key: "Elevador", name: "Elevador" }, { key: "Gerador", name: "Gerador" },
                    { key: "Pintura", name: "Pintura" }, { key: "Alvenaria", name: "Alvenaria / Estrutura" },
                    { key: "Jardinagem", name: "Jardinagem / Paisagismo" }, { key: "Limpeza", name: "Limpeza Específica" },
                    { key: "Seguranca", name: "Segurança (Câmeras, Portões, Interfone)" },
                    { key: "ArCondicionado", name: "Ar Condicionado Central" }, { key: "Pragas", name: "Controle de Pragas" },
                    { key: "Telecom", name: "Telecomunicações (Antena, Cabeamento)" },
                    { key: "Incendio", name: "Sistema de Incêndio" }, { key: "Gas", name: "Sistema de Gás" },
                    { key: "Outros", name: "Geral / Outros" }
                ];
            }
            state.allKnownOccurrenceTypes.sort((a, b) => a.name.localeCompare(b.name));
        }
        const known = state.allKnownOccurrenceTypes.find(o => o.key === key);
        return known ? known.name : (key || "N/A");
    },
    resetForm: (formId) => {
        const form = utils.getById(formId);
        if (form) form.reset();
        if (formId === 'ticket-form-manutencao') {
            console.log("Resetando formulário ticket-form-manutencao");
            populateOccurrenceSelectManutencao('occurrence-type-chamado');
            const locCat = utils.getById('ticket-location-category-chamado');
            if (locCat) locCat.innerHTML = '<option value="" selected disabled>Selecione...</option>';
            const locArea = utils.getById('ticket-location-area-chamado');
            if (locArea) { locArea.innerHTML = '<option value="" selected disabled>Selecione Categoria...</option>'; locArea.disabled = true; }
            utils.getById('ticket-area-custom-chamado')?.classList.add('hidden');
            utils.getById('equipment-section-chamado')?.classList.add('hidden');
            const equipList = utils.getById('equipment-list-chamado');
            if(equipList) equipList.innerHTML = '';
            const assocIdInput = utils.getById('ticketAssociatedActivityId');
            if(assocIdInput) assocIdInput.value = '';
            const occSelect = utils.getById('occurrence-type-chamado');
            if (occSelect) occSelect.disabled = false;
        } else if (formId === 'scheduledVisitForm') {
            console.log("Resetando formulário scheduledVisitForm");
            utils.getById('scheduledVisitId').value = '';
            const modalTitle = utils.getById('scheduledVisitModalTitle');
            if (modalTitle) modalTitle.textContent = "Programar Nova Visita Técnica";
            const saveBtn = utils.getById('saveScheduledVisitBtn');
            if (saveBtn) saveBtn.textContent = "Salvar Agendamento";
            scheduledVisitsLogic.populateContractSuppliersDropdown();
            utils.getById('visitRecurrence').value = 'none';
            scheduledVisitsLogic.toggleCustomRecurrenceInput();
        } else if (formId === 'markVisitDoneForm') {
            utils.getById('markDoneVisitId').value = '';
            utils.getById('realizationNotes').value = '';
            utils.getById('markDoneSupplierName').textContent = '';
            utils.getById('markDoneVisitScheduledDate').textContent = '';
        }
    },
    toggleModal: (modalId, show) => {
        const modal = utils.getById(modalId);
        if (modal) {
            console.log(`${show ? 'ABRINDO' : 'FECHANDO'} modal: ${modalId}`);
            modal.style.display = show ? 'flex' : 'none';
            modal.classList.toggle('hidden', !show);
            document.body.classList.toggle('modal-open', show);
        } else {
            console.error(`Modal com ID ${modalId} NÃO FOI ENCONTRADO ao tentar toggle.`);
        }
    },
    loadLocationConfig: () => {
        const defaultConfig = { enabledCategories: {}, enabledAreas: {}, enabledEquipment: {}, pavimentos: [], customLocations: [], customAreas: {}, customEquipment: {} };
        const loadedConfig = utils.loadData(STORAGE_KEYS.LOCATION_CONFIG, defaultConfig);
        state.locationConfig = { ...defaultConfig, ...loadedConfig };
        if (!loadedConfig || (!Object.keys(state.locationConfig.enabledCategories || {}).length && !(state.locationConfig.customLocations || []).length)) {
            console.warn("UTILS: Configuração de localização está VAZIA ou não foi carregada do localStorage. Usando estrutura padrão vazia.");
        }
        return state.locationConfig;
    },
    getSelectedData: (selectElement) => {
        if (!selectElement || selectElement.selectedIndex < 0 || !selectElement.options[selectElement.selectedIndex]) { return { value: '', text: '' }; }
        return { value: selectElement.value, text: selectElement.options[selectElement.selectedIndex].text };
    },
    cleanInput: (value = '') => String(value).replace(/\D/g, ''),
};

function populateOccurrenceSelectManutencao(selectElementId, includeDefaultOption = true, selectedKey = null) {
    const selectElement = utils.getById(selectElementId);
    if (!selectElement) { console.warn(`Select ${selectElementId} não encontrado.`); return; }
    const currentVal = selectedKey || selectElement.value;
    selectElement.innerHTML = '';
    if (includeDefaultOption) selectElement.add(new Option("Selecione...", ""));
    utils.getOccurrenceName('');
    state.allKnownOccurrenceTypes.forEach(occType => selectElement.add(new Option(occType.name, occType.key)));
    if (selectedKey && Array.from(selectElement.options).some(o => o.value === selectedKey)) {
        selectElement.value = selectedKey;
    } else if (Array.from(selectElement.options).some(o => o.value === currentVal) && currentVal !== "") {
        selectElement.value = currentVal;
    } else if (includeDefaultOption) {
        selectElement.value = "";
    }
}

// ================================================
// SECTION 3: LÓGICA DE MANUTENÇÃO (Atividades Vencidas)
// ================================================
const maintenanceLogic = {
    renderUI: () => { maintenanceLogic.displayOverdueActivities(); },
    displayOverdueActivities: () => {
        const overdueContainer = utils.getById('overdueActivitiesList');
        const overdueSectionCard = utils.getById('overdue-activities-section');

        if (!overdueContainer || !overdueSectionCard) {
            console.error("Container 'overdueActivitiesList' ou 'overdue-activities-section' não encontrado.");
            return;
        }
        const today = new Date(); today.setHours(0, 0, 0, 0);
        if (!state.activities) state.activities = [];
        const overdueActivities = state.activities.filter(activity => {
            if (!activity.nextDeadlineDate) return false;
            const deadlineParts = activity.nextDeadlineDate.split('-');
            const deadline = new Date(parseInt(deadlineParts[0],10), parseInt(deadlineParts[1],10) - 1, parseInt(deadlineParts[2],10));
            deadline.setHours(0,0,0,0);
            return deadline < today;
        }).sort((a,b) => new Date(a.nextDeadlineDate) - new Date(b.nextDeadlineDate));

        if (overdueActivities.length === 0) {
            overdueContainer.innerHTML = '<p class="empty-list-message">Nenhuma atividade vencida no momento.</p>';
            overdueSectionCard.classList.remove('has-overdue-alert');
            return;
        }

        overdueSectionCard.classList.add('has-overdue-alert');

        overdueContainer.innerHTML = ''; const fragment = document.createDocumentFragment();
        overdueActivities.forEach(activity => {
            const itemDiv = document.createElement('div'); itemDiv.className = 'overdue-activity-item section-card';
            itemDiv.dataset.activityId = activity.id;
            const deadlineParts = activity.nextDeadlineDate.split('-');
            const deadline = new Date(parseInt(deadlineParts[0],10), parseInt(deadlineParts[1],10) - 1, parseInt(deadlineParts[2],10));
            deadline.setHours(0,0,0,0);
            const diffTime = Math.abs(today - deadline);
            const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const occurrenceName = utils.getOccurrenceName(activity.occurrence);
            itemDiv.innerHTML = `
                <div class="overdue-item-header"><h4>${activity.titulo || 'Atividade Sem Título'}</h4><span class="overdue-status">Vencida há ${diffDays} dia(s)</span></div>
                <div class="overdue-item-details">
                    <p><strong>Sistema:</strong> ${occurrenceName}</p>
                    <p><strong>Descrição:</strong> ${activity.description || 'N/A'}</p>
                    <p><strong>Prazo Original:</strong> ${utils.formatDate(activity.nextDeadlineDate)}</p>
                    <p><strong>Periodicidade:</strong> ${activity.period} ${activity.customPeriod ? `(${activity.customPeriod})` : ''}</p>
                    <p><strong>Equipe Responsável:</strong> ${activity.team || 'N/A'}</p>
                </div>
                <div class="overdue-item-actions"><button class="btn btn-warning open-ticket-overdue-btn" data-activity-id="${activity.id}"><i class="material-icons">bug_report</i> Abrir Chamado Corretivo</button></div>`;
            const openTicketBtn = itemDiv.querySelector('.open-ticket-overdue-btn');
            if (openTicketBtn) {
                openTicketBtn.addEventListener('click', (e) => {
                    const actId = e.currentTarget.dataset.activityId;
                    const overdueActivity = state.activities.find(a => a.id === actId);
                    if (overdueActivity) chamadosCorretivos.openTicketModalForOverdue(overdueActivity);
                });
            }
            fragment.appendChild(itemDiv);
        });
        overdueContainer.appendChild(fragment);
    }
};
// ================================================
// SECTION 4: RASCUNHO DO FORMULÁRIO DE CHAMADO
// ================================================
const ticketDraftManager = {
    save: () => {
        const form = utils.getById('ticket-form-manutencao');
        const modal = utils.getById('ticket-modal');
        if (!form || !modal || modal.classList.contains('hidden')) { return; }
        const draftData = {
            occurrence: utils.getById('occurrence-type-chamado').value,
            locationCategory: utils.getById('ticket-location-category-chamado').value,
            locationArea: utils.getById('ticket-location-area-chamado').value,
            customArea: utils.getById('ticket-area-custom-chamado').value,
            equipment: [],
            description: utils.getById('description-chamado').value,
            priority: utils.getById('priority-chamado').value,
            associatedActivityId: utils.getById('ticketAssociatedActivityId').value,
            supplierId: state.currentTicketChamado?.supplierId || null,
            supplierName: state.currentTicketChamado?.supplierName || "Nenhum fornecedor selecionado",
            supplierPhone: state.currentTicketChamado?.supplierPhone || null
        };
        document.querySelectorAll('#equipment-list-chamado input[type="checkbox"]:checked').forEach(cb => {
            const qtyInput = utils.getById(`qty-${cb.id}`);
            draftData.equipment.push({ name: cb.value, quantity: qtyInput ? parseInt(qtyInput.value) || 1 : 1 });
        });
        utils.saveData(STORAGE_KEYS.TICKET_FORM_DRAFT, draftData);
    },
    load: () => {
        state.loadedTicketDraft = utils.loadData(STORAGE_KEYS.TICKET_FORM_DRAFT, null);
        if (state.loadedTicketDraft) {
            console.log("Rascunho BRUTO carregado do localStorage:", state.loadedTicketDraft);
            utils.getById('occurrence-type-chamado').value = state.loadedTicketDraft.occurrence || "";
            utils.getById('description-chamado').value = state.loadedTicketDraft.description || "";
            utils.getById('priority-chamado').value = state.loadedTicketDraft.priority || "";
            utils.getById('ticketAssociatedActivityId').value = state.loadedTicketDraft.associatedActivityId || "";
            if (!state.currentTicketChamado) state.currentTicketChamado = {};
            state.currentTicketChamado.supplierId = state.loadedTicketDraft.supplierId || null;
            state.currentTicketChamado.supplierName = state.loadedTicketDraft.supplierName || "Nenhum fornecedor selecionado";
            state.currentTicketChamado.supplierPhone = state.loadedTicketDraft.supplierPhone || null;
            return true;
        } else {
            console.log("Nenhum rascunho de chamado encontrado para carregar.");
            return false;
        }
    },
    applyLocationDraft: () => {
        if (!state.loadedTicketDraft || !state.loadedTicketDraft.locationCategory) {
            console.log("Rascunho: Sem categoria de localização para aplicar."); return;
        }
        const locCatSelect = utils.getById('ticket-location-category-chamado');
        if (locCatSelect && locCatSelect.options.length > 1 && Array.from(locCatSelect.options).some(opt => opt.value === state.loadedTicketDraft.locationCategory)) {
            locCatSelect.value = state.loadedTicketDraft.locationCategory;
            console.log(`Rascunho Aplicado: Categoria '${locCatSelect.value}'. Disparando change.`);
            locCatSelect.dispatchEvent(new Event('change'));
        } else {
            console.warn("Rascunho: Categoria do rascunho não encontrada no select:", state.loadedTicketDraft.locationCategory);
        }
    },
    applyAreaDraft: () => {
        if (!state.loadedTicketDraft || !state.loadedTicketDraft.locationArea) {
             console.log("Rascunho: Sem área para aplicar."); return;
        }
        const locAreaSelect = utils.getById('ticket-location-area-chamado');
        if (locAreaSelect && locAreaSelect.options.length > 1 && Array.from(locAreaSelect.options).some(opt => opt.value === state.loadedTicketDraft.locationArea)) {
            locAreaSelect.value = state.loadedTicketDraft.locationArea;
            console.log(`Rascunho Aplicado: Área '${locAreaSelect.value}'. Disparando change.`);
            if (state.loadedTicketDraft.locationArea === "Outro (Especificar)") {
                const customAreaInput = utils.getById('ticket-area-custom-chamado');
                if (customAreaInput) {
                    customAreaInput.value = state.loadedTicketDraft.customArea || "";
                    customAreaInput.classList.remove('hidden'); customAreaInput.required = true;
                }
            }
            locAreaSelect.dispatchEvent(new Event('change'));
        } else {
            console.warn("Rascunho: Área do rascunho não encontrada no select:", state.loadedTicketDraft.locationArea);
        }
    },
    applyEquipmentDraft: () => {
        if (!state.loadedTicketDraft || !state.loadedTicketDraft.equipment || state.loadedTicketDraft.equipment.length === 0) {
             console.log("Rascunho: Sem equipamentos para aplicar."); return;
        }
        console.log("Rascunho Aplicando Equipamentos:", state.loadedTicketDraft.equipment);
        state.loadedTicketDraft.equipment.forEach(draftEq => {
            const eqCheckbox = document.querySelector(`#equipment-list-chamado input[type="checkbox"][value="${draftEq.name}"]`);
            if (eqCheckbox) {
                eqCheckbox.checked = true;
                const qtyInput = utils.getById(`qty-${eqCheckbox.id}`);
                if (qtyInput) { qtyInput.value = draftEq.quantity; qtyInput.style.display = 'inline-block'; }
            } else {
                 console.warn(`Rascunho: Equipamento '${draftEq.name}' não encontrado para marcar.`);
            }
        });
    },
    clear: () => {
        localStorage.removeItem(STORAGE_KEYS.TICKET_FORM_DRAFT);
        state.loadedTicketDraft = null;
        console.log("Rascunho do chamado limpo.");
    },
    _saveTimeout: null,
    saveDebounced: () => {
        clearTimeout(ticketDraftManager._saveTimeout);
        ticketDraftManager._saveTimeout = setTimeout(ticketDraftManager.save, 700);
    },
    attachListenersToForm: () => {
        const form = utils.getById('ticket-form-manutencao');
        if (form) {
            form.addEventListener('input', ticketDraftManager.saveDebounced);
            form.addEventListener('change', ticketDraftManager.saveDebounced);
            console.log("Listeners de rascunho anexados ao formulário de chamado.");
        } else {
            console.error("Formulário 'ticket-form-manutencao' não encontrado para anexar listeners de rascunho.");
        }
    }
};

// ================================================
// SECTION 5: CHAMADOS CORRETIVOS
// ================================================

function getPrazoPorPrioridadeText(priorityLevel) {
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

const chamadosCorretivos = {
    populateLocationCategories: () => {
        console.log("Populando Categorias. state.locationConfig:", !!state.locationConfig);
        const sel = utils.getById('ticket-location-category-chamado');
        if (!sel) { console.error("Select de categoria não encontrado."); return; }
        const cfg = state.locationConfig;
        sel.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        if (!cfg || (!Object.keys(cfg.enabledCategories || {}).length && !(cfg.customLocations || []).length)) {
            sel.options[0].textContent = 'Nenhuma config. de localização'; sel.disabled = true;
            console.warn("populateLocationCategories: Config de localização vazia.");
            return;
        }
        const categoriesToDisplay = [];
        const predefinedLabels = { "SUBSOLO": "🧱 SUBSOLO", "TERREO": "🏢 TÉRREO", "ANDARES_TIPO": "🏠 ANDARES TIPO", "COBERTURA": "🏗️ COBERTURA" };
        if (cfg.enabledCategories) {
            for (const key in predefinedLabels) {
                if (cfg.enabledCategories[key]) categoriesToDisplay.push({ value: key, text: predefinedLabels[key] });
            }
        }
        if (cfg.customLocations && Array.isArray(cfg.customLocations)) {
            cfg.customLocations.forEach(customLoc => {
                if (customLoc.id && customLoc.name) categoriesToDisplay.push({ value: customLoc.id, text: `📍 ${customLoc.name} (Personalizado)` });
            });
        }
        if (categoriesToDisplay.length > 0) {
            categoriesToDisplay.sort((a, b) => a.text.localeCompare(b.text)).forEach(cat => sel.add(new Option(cat.text, cat.value)));
            sel.disabled = false;
        } else {
            sel.options[0].textContent = 'Nenhuma categoria ativa'; sel.disabled = true;
        }
        ticketDraftManager.applyLocationDraft();
    },
    populateLocationAreas: (categoryKeyOrId) => {
        console.log("Populando Áreas para categoria:", categoryKeyOrId);
        const sel = utils.getById('ticket-location-area-chamado');
        const customAreaInput = utils.getById('ticket-area-custom-chamado');
        if (!sel || !customAreaInput) return;
        const cfg = state.locationConfig;
        sel.innerHTML = '<option value="" selected disabled>Selecione Área/Local...</option>';
        sel.disabled = true; customAreaInput.classList.add('hidden'); customAreaInput.required = false; customAreaInput.value = '';
        if (!categoryKeyOrId || !cfg) { console.warn("PopulateAreas: Categoria ou CFG ausente."); return; }
        const areasToDisplay = [];
        const predefinedCategories = ["SUBSOLO", "TERREO", "ANDARES_TIPO", "COBERTURA"];
        const isPredefinedCategory = predefinedCategories.includes(categoryKeyOrId);
        if (isPredefinedCategory) {
            if (cfg.enabledAreas?.[categoryKeyOrId]?.length) cfg.enabledAreas[categoryKeyOrId].forEach(areaName => areasToDisplay.push({ value: areaName, text: areaName }));
            if (categoryKeyOrId === "ANDARES_TIPO" && cfg.pavimentos?.length) cfg.pavimentos.forEach(pav => { const pText = `Pavimento ${pav}`; if (!areasToDisplay.some(a => a.value === pText)) areasToDisplay.push({ value: pText, text: pText }); });
            if (cfg.customAreas?.[categoryKeyOrId]?.length) cfg.customAreas[categoryKeyOrId].forEach(ca => areasToDisplay.push({ value: ca.id, text: `${ca.name} (Personalizado)` }));
        } else {
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
        ticketDraftManager.applyAreaDraft();
    },
    populateEquipment: (categoryKeyOrId, areaKeyOrId) => {
        console.log("Populando Equipamentos para Categoria:", categoryKeyOrId, "Área:", areaKeyOrId);
        const section = utils.getById('equipment-section-chamado');
        const listDiv = utils.getById('equipment-list-chamado');
        if (!section || !listDiv) { console.error("Elementos de equipamento não encontrados."); return; }
        section.classList.add('hidden'); listDiv.innerHTML = '';
        if (!categoryKeyOrId || !areaKeyOrId || areaKeyOrId === "Outro (Especificar)") { ticketDraftManager.applyEquipmentDraft(); return; }
        const cfg = state.locationConfig;
        if (!cfg) { console.warn("PopulateEquipment: CFG de localização ausente."); ticketDraftManager.applyEquipmentDraft(); return; }
        const equipmentSet = new Set();
        const generalKey = categoryKeyOrId;
        const specificKey = `${categoryKeyOrId}::${areaKeyOrId}`;
        (cfg.enabledEquipment?.[generalKey] || []).forEach(eq => equipmentSet.add(eq.name || eq));
        (cfg.customEquipment?.[generalKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));
        if (categoryKeyOrId === 'ANDARES_TIPO' && areaKeyOrId.startsWith('Pavimento ')) {
            ["Corredor/Hall de Andar Padrão", "Escada de Emergência Padrão", "Shaft de Medidores do Andar"].forEach(andarArea => {
                const key = `${categoryKeyOrId}::${andarArea}`;
                (cfg.enabledEquipment?.[key] || []).forEach(eq => equipmentSet.add(eq.name || eq));
            });
            (cfg.customEquipment?.[specificKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));
        } else {
            (cfg.enabledEquipment?.[specificKey] || []).forEach(eq => equipmentSet.add(eq.name || eq));
            (cfg.customEquipment?.[specificKey] || []).forEach(eqObj => equipmentSet.add(eqObj.name));
        }
        if (equipmentSet.size > 0) {
            Array.from(equipmentSet).sort().forEach((equipName, idx) => {
                const idBase = `chamado-equip-${categoryKeyOrId.replace(/\W/g,'')}-${areaKeyOrId.replace(/\W/g,'')}-${idx}`;
                const item = document.createElement('div'); item.className = 'equipment-item';
                item.innerHTML = `<input type="checkbox" id="${idBase}" name="equipment_chamado" value="${equipName}"><label for="${idBase}">${equipName}</label><input type="number" class="form-control equip-qty-input" id="qty-${idBase}" placeholder="Qtd" min="1" value="1" style="display:none;">`;
                const cb = item.querySelector('input[type="checkbox"]');
                const qtyIn = item.querySelector('input.equip-qty-input');
                cb.onchange = (e) => { qtyIn.style.display = e.target.checked ? 'inline-block' : 'none'; if (!e.target.checked) qtyIn.value = '1'; ticketDraftManager.saveDebounced();};
                listDiv.appendChild(item);
            });
            section.classList.remove('hidden');
        }
        ticketDraftManager.applyEquipmentDraft();
    },
    updatePreviewModal: () => {
        console.log("CHAMADO_PREVIEW: updatePreviewModal. currentTicketChamado:", JSON.parse(JSON.stringify(state.currentTicketChamado)));
        if (!state.currentTicketChamado || Object.keys(state.currentTicketChamado).length === 0) {
            console.warn("CHAMADO_PREVIEW: currentTicketChamado está vazio.");
            utils.getById('preview-occurrence-chamado').textContent = 'N/A';
            utils.getById('preview-location-chamado').textContent = 'N/A';
            utils.getById('preview-equipment-item-chamado').style.display = 'none';
            utils.getById('preview-equipment-chamado').textContent = '';
            utils.getById('preview-description-chamado').textContent = 'N/A';
            utils.getById('preview-priority-chamado').textContent = 'N/A';
            utils.getById('preview-occurrence-contract-info').style.display = 'none';
            const supSel = utils.getById('supplier-select-chamado'); if(supSel) supSel.innerHTML = '<option value="">Carregando...</option>';
            utils.getById('no-supplier-chamado').classList.add('hidden');
            const sendBtn = utils.getById('send-whatsapp-btn-chamado'); if(sendBtn) sendBtn.disabled = true;
            return;
        }
        utils.getById('preview-occurrence-chamado').textContent = utils.getOccurrenceName(state.currentTicketChamado.occurrence);
        utils.getById('preview-location-chamado').textContent = state.currentTicketChamado.location || 'N/A';
        const equipItem = utils.getById('preview-equipment-item-chamado');
        const equipVal = utils.getById('preview-equipment-chamado');
        const hasEquip = state.currentTicketChamado.equipment && state.currentTicketChamado.equipment.length > 0;
        if(equipItem) equipItem.style.display = hasEquip ? 'flex' : 'none';
        if(equipVal) equipVal.textContent = hasEquip ? state.currentTicketChamado.equipment.map(eq => `${eq.name} (Qtd: ${eq.quantity})`).join('\n') : '';
        utils.getById('preview-description-chamado').textContent = state.currentTicketChamado.description || 'N/A';
        utils.getById('preview-priority-chamado').textContent = state.currentTicketChamado.priority || 'N/A';
        chamadosCorretivos.populatePreviewSupplierDropdown();
        console.log("CHAMADO_PREVIEW: Preview modal atualizado.");
    },
    populatePreviewSupplierDropdown: () => {
        console.log("CHAMADO_PREVIEW: populatePreviewSupplierDropdown.");
        const sel = utils.getById('supplier-select-chamado');
        const noSupMsgDiv = utils.getById('no-supplier-chamado');
        const btnSendWhatsApp = utils.getById('send-whatsapp-btn-chamado');
        const occInfoSpan = utils.getById('preview-occurrence-contract-info');

        if (!sel || !noSupMsgDiv || !btnSendWhatsApp || !occInfoSpan) { console.error("CHAMADO_PREVIEW: Elementos do preview do fornecedor não encontrados."); return; }
        if (!state.currentTicketChamado || !state.currentTicketChamado.occurrence) {
            sel.innerHTML = `<option value="">Erro</option>`; sel.disabled = true; noSupMsgDiv.classList.remove('hidden'); sel.classList.add('hidden'); btnSendWhatsApp.disabled = true; return;
        }
        if (!state.suppliersChamado || state.suppliersChamado.length === 0) {
            sel.innerHTML = `<option value="">Nenhum fornecedor cadastrado</option>`; sel.disabled = true; noSupMsgDiv.classList.remove('hidden'); sel.classList.add('hidden'); btnSendWhatsApp.disabled = true; return;
        }
        const currentTicketOccurrenceKey = state.currentTicketChamado.occurrence;
        const filteredSuppliers = state.suppliersChamado.filter(s => s.mainOccurrence === currentTicketOccurrenceKey);
        sel.innerHTML = `<option value="">Selecione um fornecedor...</option>`;
        occInfoSpan.textContent = ''; occInfoSpan.style.display = 'none';
        if (filteredSuppliers.length > 0) {
            noSupMsgDiv.classList.add('hidden'); sel.classList.remove('hidden'); sel.disabled = false;
            filteredSuppliers.sort((a, b) => a.name.localeCompare(b.name)).forEach(s => sel.add(new Option(`${s.name} (${utils.getOccurrenceName(s.mainOccurrence)})`, s.id)));
            sel.value = state.currentTicketChamado.supplierId || "";
        } else {
            noSupMsgDiv.classList.remove('hidden'); sel.classList.add('hidden'); sel.disabled = true;
        }
        btnSendWhatsApp.disabled = !sel.value;
        if (sel.value) {
            const selectedSupplier = state.suppliersChamado.find(s => String(s.id) === String(sel.value));
            if (selectedSupplier?.hasContract && selectedSupplier.mainOccurrence) {
                 occInfoSpan.textContent = state.currentTicketChamado.occurrence === selectedSupplier.mainOccurrence ? '(Contrato principal para esta ocorrência)' : `(Contrato principal para: ${utils.getOccurrenceName(selectedSupplier.mainOccurrence)})`;
                 occInfoSpan.style.display = 'inline';
            }
        }
    },
    handleFormSubmit: (e) => {
        e.preventDefault();
        console.log("CHAMADO_FORM_SUBMIT: Iniciado.");
        const occEl = utils.getById('occurrence-type-chamado'); const descEl = utils.getById('description-chamado'); const priEl = utils.getById('priority-chamado');
        const catSel = utils.getById('ticket-location-category-chamado'); const areaSel = utils.getById('ticket-location-area-chamado'); const customAreaEl = utils.getById('ticket-area-custom-chamado');
        if (!occEl?.value || !descEl?.value.trim() || !priEl?.value) { alert("Preencha Sistema, Descrição e Prioridade."); return; }
        if (!catSel?.value) { alert('Selecione a Categoria da localização.'); return; }
        const areaVal = areaSel?.value; const customAreaVal = customAreaEl?.value.trim();
        if (!areaVal && !customAreaVal && areaSel?.options[areaSel.selectedIndex]?.text !== 'Especifique abaixo') { alert('Selecione ou especifique a Área.'); return; }
        if (areaVal === 'Outro (Especificar)' && !customAreaVal) { alert('Especifique a área customizada.'); customAreaEl.focus(); return; }
        const catData = utils.getSelectedData(catSel); const areaData = utils.getSelectedData(areaSel);
        let locStr = catData.text.replace(/ \(Personalizado\)$/, '').replace(/^(🧱|🏢|🏠|🏗️|📍)\s*/, '');
        if (areaData.value === 'Outro (Especificar)' || (areaData.value === "" && customAreaVal)) { locStr += ` - Outro: ${customAreaVal}`; }
        else if (areaData.value) { locStr += ` - ${areaData.text.replace(/ \(Personalizado\)$/, '')}`; }
        const equipSel = []; document.querySelectorAll('#equipment-list-chamado input[type="checkbox"]:checked').forEach(cb => { const qtyIn = utils.getById(`qty-${cb.id}`); equipSel.push({ name: cb.value, quantity: (qtyIn ? parseInt(qtyIn.value) : 1) || 1 }); });

        state.currentTicketChamado = {
            occurrence: occEl.value,
            location: locStr,
            equipment: equipSel,
            description: descEl.value.trim(),
            priority: priEl.value,
            supplierId: state.currentTicketChamado?.supplierId || null,
            supplierName: state.currentTicketChamado?.supplierName || "Nenhum fornecedor selecionado",
            supplierPhone: state.currentTicketChamado?.supplierPhone || null,
            associatedActivityId: utils.getById('ticketAssociatedActivityId').value || null
        };
        console.log("CHAMADO_FORM_SUBMIT: Dados para currentTicketChamado:", JSON.parse(JSON.stringify(state.currentTicketChamado)));
        chamadosCorretivos.updatePreviewModal();
        utils.toggleModal('ticket-modal', false);
        utils.toggleModal('preview-modal', true);
    },
    handleSendWhatsApp: () => {
        console.log("WHATSAPP: handleSendWhatsApp. currentTicketChamado:", JSON.parse(JSON.stringify(state.currentTicketChamado)));
        const supplierIdToUse = state.currentTicketChamado.supplierId;
        if (!supplierIdToUse) { alert('Selecione um fornecedor.'); return; }
        const sup = state.suppliersChamado.find(s => String(s.id) === String(supplierIdToUse));
        if (!sup || !sup.phone) { alert('Dados do fornecedor (telefone) não encontrados.'); return; }
        const condo = utils.loadData(STORAGE_KEYS.CONDO_DATA, { nomecondo: "Seu Condomínio" });

        let equipTxt = "";
        if (state.currentTicketChamado.equipment?.length > 0) {
             equipTxt = "\n\n*Equipamento(s) Afetado(s):*\n" + state.currentTicketChamado.equipment.map(eq => `- ${eq.name || ''} (Qtd: ${eq.quantity || 1})`).join("\n");
        }

        const ticket = state.currentTicketChamado;
        const prioridadeText = ticket.priority || 'N/A';
        const prazoEstimadoText = getPrazoPorPrioridadeText(prioridadeText);

        let contatoTelefone = condo.telefonesindico || condo.telefonecondo;
        let contatoCondoMsg = "";
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
                      `${equipTxt}\n` +
                      `  • *Descrição do Problema:* ${ticket.description || 'N/A'}\n\n` +
                      `*Nível de Prioridade:* ${prioridadeText}\n` +
                      `*Prazo Desejado para Atendimento:* ${prazoEstimadoText}` +
                      `${contatoCondoMsg}\n` +
                      `--------------------------------------------------\n` +
                      `_Aguardamos o contato para agendamento e informações sobre disponibilidade e orçamento (se aplicável)._`;


        const cleanedPhone = utils.cleanInput(sup.phone);
        if (!cleanedPhone) { alert("Número de telefone do fornecedor inválido."); return; }

        alert(`Ao continuar, será enviado um chamado via WhatsApp para a empresa ${sup.name} (${utils.formatPhone(sup.phone)}).`);
        if (confirm("Confirmar envio do chamado via WhatsApp?")) {
            const whatsappLink = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(msg)}`;
            console.log("WHATSAPP: Link:", whatsappLink); window.open(whatsappLink, '_blank');
        }
    },
    handleConfirmAndRedirect: () => {
        console.log("CHAMADO_CONFIRM: Iniciado. currentTicketChamado:", state.currentTicketChamado);
        const finalSupplierId = state.currentTicketChamado.supplierId;
        const sup = finalSupplierId && state.suppliersChamado ? state.suppliersChamado.find(s => String(s.id) === String(finalSupplierId)) : null;
        const condo = utils.loadData(STORAGE_KEYS.CONDO_DATA, { nomecondo: "Condomínio Padrão" });
        if (!state.currentTicketChamado.occurrence || !state.currentTicketChamado.location || !state.currentTicketChamado.priority || !state.currentTicketChamado.description) {
            alert("Erro: Dados essenciais do chamado estão faltando."); utils.toggleModal('preview-modal', false); utils.toggleModal('ticket-modal', true); return;
        }
        const newTicketEntry={
            id:`ch_${Date.now()}_${Math.random().toString(36).substring(2,7)}`, createdAt:new Date().toISOString(), condoName:condo.nomecondo,
            occurrence:state.currentTicketChamado.occurrence, location:state.currentTicketChamado.location,
            description:state.currentTicketChamado.description, priority:state.currentTicketChamado.priority,
            equipment:state.currentTicketChamado.equipment||[],
            supplierId:sup?sup.id:null, supplierName:sup?sup.name:(finalSupplierId ? "Fornecedor não encontrado" : "Nenhum fornecedor selecionado"), supplierPhone:sup?sup.phone:null,
            status:'Pendente', proposalValue:null, completionStatus:null, completionDescription:null, completedAt:null, serviceOrderPhoto:null, finalDescription:null, archivedAt:null, archivedReason:null,
            sourceMaintenanceActivityId: state.currentTicketChamado.associatedActivityId
        };
        try {
            sessionStorage.setItem('newTicketData',JSON.stringify(newTicketEntry));
            console.log("CHAMADO_CONFIRM: Chamado salvo no sessionStorage:", newTicketEntry);
            ticketDraftManager.clear(); state.currentTicketChamado = {}; utils.resetForm('ticket-form-manutencao');
            window.location.href = '../pages/chamados.html';
        } catch(e) { console.error("CHAMADO_CONFIRM: Erro:", e); alert("Erro ao salvar chamado."); sessionStorage.removeItem('newTicketData');}
        finally { utils.toggleModal('preview-modal', false); }
    },
    openTicketModalForOverdue: (activity) => {
        console.log("Abrindo modal de chamado para atividade vencida:", activity);
        utils.resetForm('ticket-form-manutencao');
        state.currentTicketChamado = {};
        ticketDraftManager.load();
        chamadosCorretivos.populateLocationCategories();
        const occSelect = utils.getById('occurrence-type-chamado');
        if (occSelect) { occSelect.value = activity.occurrence; occSelect.disabled = true; }
        const descInput = utils.getById('description-chamado');
        if (descInput) descInput.value = `Chamado ref. atividade vencida: "${activity.titulo || utils.getOccurrenceName(activity.occurrence)}".\nOriginal: ${activity.description || 'N/A'}.\nPrazo: ${utils.formatDate(activity.nextDeadlineDate)}.`;
        const assocIdInput = utils.getById('ticketAssociatedActivityId');
        if (assocIdInput) assocIdInput.value = activity.id;
        utils.toggleModal('ticket-modal', true);
        ticketDraftManager.save();
    }
};


// ================================================
// SECTION 7: AGENDAMENTO DE VISITAS TÉCNICAS
// ================================================
const scheduledVisitsLogic = {
    loadVisits: () => {
        state.scheduledVisits = utils.loadData(STORAGE_KEYS.SCHEDULED_VISITS, []);
        state.archivedVisits = utils.loadData(STORAGE_KEYS.ARCHIVED_VISITS, []);
        console.log("Visitas agendadas carregadas:", state.scheduledVisits.length);
        console.log("Visitas arquivadas carregadas:", state.archivedVisits.length);
    },
    saveVisits: () => {
        utils.saveData(STORAGE_KEYS.SCHEDULED_VISITS, state.scheduledVisits);
    },
    saveArchivedVisits: () => {
        utils.saveData(STORAGE_KEYS.ARCHIVED_VISITS, state.archivedVisits);
    },
    toggleCustomRecurrenceInput: () => {
        const recurrenceSelect = utils.getById('visitRecurrence');
        const customInput = utils.getById('visitCustomRecurrenceValue');
        if (!recurrenceSelect || !customInput) return;

        const showCustom = recurrenceSelect.value === 'custom';
        customInput.classList.toggle('hidden', !showCustom);
        customInput.required = showCustom;
        if (!showCustom) {
            customInput.value = '';
        }
    },
    openScheduledVisitModal: (isEdit = false, visitId = null) => {
        utils.resetForm('scheduledVisitForm');
        state.currentEditingVisitId = null;

        const modalTitle = utils.getById('scheduledVisitModalTitle');
        const saveBtn = utils.getById('saveScheduledVisitBtn');
        const recurrenceSelect = utils.getById('visitRecurrence');
        const customRecurrenceInput = utils.getById('visitCustomRecurrenceValue');

        scheduledVisitsLogic.populateContractSuppliersDropdown();

        if (isEdit && visitId) {
            const visit = state.scheduledVisits.find(v => v.id === visitId);
            if (!visit) { alert("Erro: Visita não encontrada para edição."); return; }
            state.currentEditingVisitId = visitId;
            if (modalTitle) modalTitle.textContent = "Editar Agendamento de Visita";
            if (saveBtn) saveBtn.textContent = "Salvar Alterações";

            utils.getById('scheduledVisitId').value = visit.id;
            utils.getById('visitSupplier').value = visit.supplierId;

            if (visit.dateTime) { // dateTime is ISO string
                const dateObj = new Date(visit.dateTime);
                // Ensure conversion to YYYY-MM-DDTHH:MM format for datetime-local input
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const day = String(dateObj.getDate()).padStart(2, '0');
                const hours = String(dateObj.getHours()).padStart(2, '0');
                const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                utils.getById('visitDateTime').value = `${year}-${month}-${day}T${hours}:${minutes}`;
            }

            utils.getById('visitDescription').value = visit.description;
            recurrenceSelect.value = visit.recurrence; // e.g., 'weekly', 'custom'
            if (visit.recurrence === 'custom' && visit.customRecurrenceValue) {
                customRecurrenceInput.value = visit.customRecurrenceValue;
            }
        } else {
            if (modalTitle) modalTitle.textContent = "Programar Nova Visita Técnica";
            if (saveBtn) saveBtn.textContent = "Salvar Agendamento";
            recurrenceSelect.value = 'none'; // Default for new visits
        }
        scheduledVisitsLogic.toggleCustomRecurrenceInput(); // Call after potentially setting recurrenceSelect
        utils.toggleModal('scheduledVisitModal', true);
    },
    closeScheduledVisitModal: () => {
        utils.toggleModal('scheduledVisitModal', false);
        state.currentEditingVisitId = null;
    },
    populateContractSuppliersDropdown: (selectedSupplierId = null) => {
        const selectElement = utils.getById('visitSupplier');
        if (!selectElement) {
            console.error("Dropdown de fornecedor para visitas não encontrado.");
            return;
        }
        selectElement.innerHTML = '<option value="" selected disabled>Selecione um fornecedor...</option>';

        if (!state.suppliersChamado || state.suppliersChamado.length === 0) {
             selectElement.innerHTML = '<option value="" disabled>Nenhum fornecedor cadastrado</option>';
             return;
        }
        // Ensure suppliersChamado is populated
        if (state.suppliersChamado.length === 0) {
            state.suppliersChamado = utils.loadData(STORAGE_KEYS.CHAMADO_SUPPLIERS, []);
        }

        const contractSuppliers = state.suppliersChamado.filter(s => s.hasContract === true);

        if (contractSuppliers.length === 0) {
            selectElement.innerHTML = '<option value="" disabled>Nenhum fornecedor com contrato</option>';
            return;
        }
        contractSuppliers.sort((a, b) => a.name.localeCompare(b.name)).forEach(supplier => {
            const option = new Option(`${supplier.name} (${utils.getOccurrenceName(supplier.mainOccurrence)})`, supplier.id);
            selectElement.add(option);
        });

        if (selectedSupplierId) { // selectedSupplierId here is a string (from visit.supplierId)
            selectElement.value = selectedSupplierId;
        }
    },
    handleScheduledVisitFormSubmit: (event) => {
        event.preventDefault();
        const id = utils.getById('scheduledVisitId').value || `visit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const supplierId = utils.getById('visitSupplier').value; // String
        const dateTimeString = utils.getById('visitDateTime').value; // YYYY-MM-DDTHH:MM string
        const description = utils.getById('visitDescription').value.trim();
        const recurrence = utils.getById('visitRecurrence').value;
        const customRecurrenceValue = utils.getById('visitCustomRecurrenceValue').value.trim();

        if (!supplierId || !dateTimeString || !description) {
            alert("Por favor, preencha Fornecedor, Data/Hora e Descrição.");
            return;
        }
        if (recurrence === 'custom' && !customRecurrenceValue.match(/(\d+)\s*(dia|dias|semana|semanas|mês|mes|meses|ano|anos)/i)) {
            alert('Período customizado inválido. Use formatos como "X dias", "X semanas", "X meses", "X anos".');
            utils.getById('visitCustomRecurrenceValue').focus();
            return;
        }

        const dateTime = new Date(dateTimeString).toISOString();

        const visitData = {
            id,
            supplierId, // Stored as string
            dateTime,
            description,
            recurrence,
            customRecurrenceValue: recurrence === 'custom' ? customRecurrenceValue : '',
            createdAt: state.currentEditingVisitId
                        ? state.scheduledVisits.find(v=>v.id === state.currentEditingVisitId)?.createdAt
                        : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (state.currentEditingVisitId) {
            const index = state.scheduledVisits.findIndex(v => v.id === state.currentEditingVisitId);
            if (index > -1) {
                state.scheduledVisits[index] = visitData;
            }
        } else {
            state.scheduledVisits.push(visitData);
        }
        scheduledVisitsLogic.saveVisits();
        scheduledVisitsLogic.renderScheduledVisitsList();
        scheduledVisitsLogic.closeScheduledVisitModal();
    },
    calculateNextOccurrence: (visit) => {
        let initialDateTime = new Date(visit.dateTime); // visit.dateTime is ISO string
        if (isNaN(initialDateTime.getTime())) {
            console.error("Data inicial inválida para a visita:", visit);
            return null;
        }

        if (visit.recurrence === 'none') {
            return initialDateTime;
        }

        let nextDate = new Date(initialDateTime);
        const today = new Date();

        // For recurrent visits, if the base date is in the future, it's the next valid occurrence.
        // If the base date is in the past, we need to advance it to the first occurrence >= today.
        if (nextDate > today && visit.recurrence !== 'none') {
            // No advancement needed if the base itself is already the next future occurrence.
        } else {
            // Loop to find the first occurrence that is today or in the future
            while (nextDate < today) {
                let advanced = false;
                let amount = 1;
                let unit = '';

                if (visit.recurrence === 'custom' && visit.customRecurrenceValue) {
                    const match = visit.customRecurrenceValue.match(/(\d+)\s*(dia|dias|semana|semanas|mês|mes|meses|ano|anos)/i);
                    if (match) {
                        amount = parseInt(match[1], 10);
                        unit = match[2].toLowerCase();
                    } else {
                        console.warn("Valor de recorrência customizado inválido:", visit.customRecurrenceValue);
                        return nextDate;
                    }
                } else {
                    unit = visit.recurrence;
                }

                switch (unit) {
                    case 'daily': case 'dia': case 'dias':
                        nextDate.setDate(nextDate.getDate() + amount); advanced = true; break;
                    case 'weekly': case 'semana': case 'semanas':
                        nextDate.setDate(nextDate.getDate() + (amount * 7)); advanced = true; break;
                    case 'biweekly':
                        nextDate.setDate(nextDate.getDate() + 14); advanced = true; break;
                    case 'monthly': case 'mês': case 'mes': case 'meses':
                        nextDate.setMonth(nextDate.getMonth() + amount); advanced = true; break;
                    case 'bimonthly':
                        nextDate.setMonth(nextDate.getMonth() + 2 * amount); advanced = true; break; // Corrected for amount
                    case 'quarterly':
                         nextDate.setMonth(nextDate.getMonth() + 3 * amount); advanced = true; break; // Corrected for amount
                    case 'semiannually':
                        nextDate.setMonth(nextDate.getMonth() + 6 * amount); advanced = true; break; // Corrected for amount
                    case 'annually': case 'ano': case 'anos':
                        nextDate.setFullYear(nextDate.getFullYear() + amount); advanced = true; break;
                    default:
                        console.warn("Tipo de recorrência não tratado ou inválido no loop:", unit);
                        return initialDateTime;
                }
                if (!advanced) break;
            }
        }
        return nextDate;
    },
    renderScheduledVisitsList: () => {
        const container = utils.getById('scheduledVisitsListContainer');
        if (!container) return;
        container.innerHTML = '';

        if (state.scheduledVisits.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma visita programada.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();
        state.scheduledVisits
            .map(visit => {
                const nextOccurrenceDate = scheduledVisitsLogic.calculateNextOccurrence(visit);
                return { ...visit, displayDateTime: nextOccurrenceDate };
            })
            .sort((a, b) => {
                if (a.displayDateTime === null && b.displayDateTime === null) return 0;
                if (a.displayDateTime === null) return 1;
                if (b.displayDateTime === null) return -1;
                return a.displayDateTime - b.displayDateTime;
            })
            .forEach(visit => {
                // FIX: Ensure comparison is string-to-string for IDs
                const supplier = state.suppliersChamado.find(s => String(s.id) === String(visit.supplierId));
                const itemDiv = document.createElement('div');
                itemDiv.className = 'scheduled-visit-item';

                const displayDate = visit.displayDateTime;
                const isPastDueNonRecurrent = displayDate && displayDate < new Date() && visit.recurrence === 'none';

                let recurrenceText = "";
                switch(visit.recurrence) {
                    case "none": recurrenceText = "Não se repete"; break;
                    case "daily": recurrenceText = "Diariamente"; break;
                    case "weekly": recurrenceText = "Semanalmente"; break;
                    case "biweekly": recurrenceText = "Quinzenalmente"; break;
                    case "monthly": recurrenceText = "Mensalmente"; break;
                    case "bimonthly": recurrenceText = "Bimestralmente"; break;
                    case "quarterly": recurrenceText = "Trimestralmente"; break;
                    case "semiannually": recurrenceText = "Semestralmente"; break;
                    case "annually": recurrenceText = "Anualmente"; break;
                    case "custom": recurrenceText = `Customizado (${visit.customRecurrenceValue || 'N/A'})`; break;
                    default: recurrenceText = "N/A";
                }

                itemDiv.innerHTML = `
                    <div class="visit-item-header">
                        <h5>${supplier ? supplier.name : 'Fornecedor Desconhecido'}</h5>
                        <span class="visit-item-date ${isPastDueNonRecurrent ? 'past-due' : ''}">
                            Próxima: ${displayDate ? utils.formatDate(displayDate, true) : 'Data Indefinida'}
                            ${isPastDueNonRecurrent ? ' (Vencida)' : ''}
                        </span>
                    </div>
                    <div class="visit-item-details">
                        <p><strong>Descrição/Anotações:</strong> ${visit.description}</p>
                        <p><strong>Recorrência:</strong> ${recurrenceText}</p>
                        ${supplier ? `<p><strong>Serviço Principal:</strong> ${utils.getOccurrenceName(supplier.mainOccurrence)}</p>` : ''}
                        ${supplier ? `<p><strong>Contato:</strong> ${utils.formatPhone(supplier.phone)}</p>` : ''}
                    </div>
                    <div class="visit-item-actions">
                        <button class="btn btn-success mark-done-visit-btn" data-id="${visit.id}"><i class="material-icons">check_circle</i> Já Realizado</button>
                        <button class="btn btn-info edit-visit-btn" data-id="${visit.id}"><i class="material-icons">edit</i> Editar</button>
                        <button class="btn btn-danger delete-visit-btn" data-id="${visit.id}"><i class="material-icons">delete</i> Excluir</button>
                    </div>
                `;
                itemDiv.querySelector('.edit-visit-btn').addEventListener('click', () => scheduledVisitsLogic.openScheduledVisitModal(true, visit.id));
                itemDiv.querySelector('.delete-visit-btn').addEventListener('click', () => scheduledVisitsLogic.deleteScheduledVisit(visit.id));
                itemDiv.querySelector('.mark-done-visit-btn').addEventListener('click', () => scheduledVisitsLogic.openMarkVisitDoneModal(visit.id));
                fragment.appendChild(itemDiv);
            });
        container.appendChild(fragment);
    },
    deleteScheduledVisit: (visitId) => {
        const visitToDelete = state.scheduledVisits.find(v => v.id === visitId);
        if (visitToDelete && confirm(`Tem certeza que deseja excluir o agendamento para "${visitToDelete.description}"?`)) {
            state.scheduledVisits = state.scheduledVisits.filter(v => v.id !== visitId);
            scheduledVisitsLogic.saveVisits();
            scheduledVisitsLogic.renderScheduledVisitsList();
        }
    },
    openMarkVisitDoneModal: (visitId) => {
        const visit = state.scheduledVisits.find(v => v.id === visitId);
        if (!visit) {
            alert("Visita não encontrada.");
            return;
        }
        utils.resetForm('markVisitDoneForm');
        utils.getById('markDoneVisitId').value = visit.id;

        // FIX: Ensure comparison is string-to-string for IDs
        const supplier = state.suppliersChamado.find(s => String(s.id) === String(visit.supplierId));
        utils.getById('markDoneSupplierName').textContent = supplier ? supplier.name : 'Desconhecido';

        const nextOccurrenceDate = scheduledVisitsLogic.calculateNextOccurrence(visit);
        utils.getById('markDoneVisitScheduledDate').textContent = nextOccurrenceDate ? utils.formatDate(nextOccurrenceDate, true) : 'N/A';

        utils.toggleModal('markVisitDoneModal', true);
    },
    handleMarkVisitDoneFormSubmit: (event) => {
        event.preventDefault();
        const visitId = utils.getById('markDoneVisitId').value;
        const realizationNotes = utils.getById('realizationNotes').value.trim();

        const visitIndex = state.scheduledVisits.findIndex(v => v.id === visitId);
        if (visitIndex === -1) {
            alert("Erro: Visita original não encontrada.");
            return;
        }
        const originalVisit = { ...state.scheduledVisits[visitIndex] };
        const completedInstanceDate = scheduledVisitsLogic.calculateNextOccurrence(originalVisit);

        const archivedEntry = {
            ...originalVisit,
            archivedVisitId: `arch_${originalVisit.id}_${Date.now()}`,
            originalScheduledDateTime: originalVisit.dateTime,
            instanceCompletedDateTime: completedInstanceDate ? completedInstanceDate.toISOString() : new Date().toISOString(),
            realizedAt: new Date().toISOString(),
            realizationNotes: realizationNotes
        };
        state.archivedVisits.push(archivedEntry);
        scheduledVisitsLogic.saveArchivedVisits();

        if (originalVisit.recurrence !== 'none') {
            // Update the base dateTime of the existing scheduled visit for the next calculation
            state.scheduledVisits[visitIndex].dateTime = completedInstanceDate.toISOString();
            state.scheduledVisits[visitIndex].updatedAt = new Date().toISOString();
        } else {
            state.scheduledVisits.splice(visitIndex, 1);
        }

        scheduledVisitsLogic.saveVisits();
        scheduledVisitsLogic.renderScheduledVisitsList();
        scheduledVisitsLogic.renderArchivedVisitsList();
        utils.toggleModal('markVisitDoneModal', false);
    },
    renderArchivedVisitsList: () => {
        const container = utils.getById('archivedVisitsListContainer');
        if (!container) return;
        container.innerHTML = '';

        if (state.archivedVisits.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma visita no histórico.</p>';
            return;
        }
        const fragment = document.createDocumentFragment();
        state.archivedVisits
            .sort((a,b) => new Date(b.realizedAt) - new Date(a.realizedAt))
            .forEach(archivedVisit => {
                // FIX: Ensure comparison is string-to-string for IDs
                const supplier = state.suppliersChamado.find(s => String(s.id) === String(archivedVisit.supplierId));
                const itemDiv = document.createElement('div');
                itemDiv.className = 'archived-visit-item';

                let recurrenceText = "";
                switch(archivedVisit.recurrence) {
                    case "none": recurrenceText = "Não se repetia"; break;
                    case "daily": recurrenceText = "Diariamente"; break;
                    case "weekly": recurrenceText = "Semanalmente"; break;
                    case "biweekly": recurrenceText = "Quinzenalmente"; break;
                    case "monthly": recurrenceText = "Mensalmente"; break;
                    case "bimonthly": recurrenceText = "Bimestralmente"; break;
                    case "quarterly": recurrenceText = "Trimestralmente"; break;
                    case "semiannually": recurrenceText = "Semestralmente"; break;
                    case "annually": recurrenceText = "Anualmente"; break;
                    case "custom": recurrenceText = `Customizado (${archivedVisit.customRecurrenceValue || 'N/A'})`; break;
                    default: recurrenceText = "N/A";
                }

                itemDiv.innerHTML = `
                    <div class="archived-visit-header">
                        <h6>${supplier ? supplier.name : 'Fornecedor Desconhecido'}</h6>
                        <span class="archived-realized-date">Realizada em: ${utils.formatDate(archivedVisit.realizedAt, true)}</span>
                    </div>
                    <div class="archived-visit-details">
                        <p><strong>Serviço Original:</strong> ${archivedVisit.description}</p>
                        <p><strong>Instância Agendada Originalmente para:</strong> ${utils.formatDate(archivedVisit.instanceCompletedDateTime, true)}</p>
                        <p><strong>Recorrência Original:</strong> ${recurrenceText}</p>
                        ${archivedVisit.realizationNotes ? `<div class="archived-visit-notes"><p><strong>Notas:</strong> ${archivedVisit.realizationNotes}</p></div>` : ''}
                    </div>
                `;
                fragment.appendChild(itemDiv);
            });
        container.appendChild(fragment);
    }
};

/**
 * Função para rolar até e destacar uma atividade vencida específica.
 * @param {string} activityId O ID da atividade a ser destacada.
 */
function highlightOverdueActivity(activityId) {
    const activityElement = document.querySelector(`.overdue-activity-item[data-activity-id="${activityId}"]`);
    if (activityElement) {
        // Rola até o elemento
        activityElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Adiciona uma classe de destaque temporária
        activityElement.classList.add('highlighted');
        setTimeout(() => {
            activityElement.classList.remove('highlighted');
        }, 3000); // Remove o destaque após 3 segundos
    }
}


// ================================================
// SECTION 8: INICIALIZAÇÃO E EVENT LISTENERS
// ================================================
const init = () => {
    try {
        console.log("Manutenção JS: Iniciando init()...");
        utils.loadLocationConfig();
        state.suppliersChamado = utils.loadData(STORAGE_KEYS.CHAMADO_SUPPLIERS, []);
        state.activities = utils.loadData(STORAGE_KEYS.MAINTENANCE_ACTIVITIES, []);
        state.allKnownOccurrenceTypes = utils.loadData(STORAGE_KEYS.OCCURRENCE_TYPES, []);
        utils.getOccurrenceName('');

        if (!state.locationConfig || (!Object.keys(state.locationConfig.enabledCategories || {}).length && !(state.locationConfig.customLocations || []).length)) {
            console.warn("INIT: Config. de localização AUSENTE/VAZIA.");
        }
        if (!state.suppliersChamado || state.suppliersChamado.length === 0) {
            console.warn("INIT: Fornecedores AUSENTES/VAZIOS.");
        }

        maintenanceLogic.renderUI();
        ticketDraftManager.attachListenersToForm();

        scheduledVisitsLogic.loadVisits();
        scheduledVisitsLogic.renderScheduledVisitsList();
        scheduledVisitsLogic.renderArchivedVisitsList();

        // NOVO: Verificar se há uma atividade vencida para destacar
        const highlightId = sessionStorage.getItem('highlightOverdueActivityId');
        if (highlightId) {
            sessionStorage.removeItem('highlightOverdueActivityId'); // Limpa para não destacar novamente em recarregamentos futuros
            // Garante que o DOM foi renderizado antes de tentar destacar
            requestAnimationFrame(() => {
                highlightOverdueActivity(highlightId);
            });
        }


        const createTicketBtn = utils.getById('create-ticket-btn-manutencao');
        if (createTicketBtn) {
            createTicketBtn.addEventListener('click', () => {
                console.log("Botão 'Abrir Chamado Corretivo' clicado.");
                utils.resetForm('ticket-form-manutencao');
                state.currentTicketChamado = {};
                ticketDraftManager.load();
                chamadosCorretivos.populateLocationCategories();
                utils.toggleModal('ticket-modal', true);
            });
        } else { console.error("FATAL: Botão 'create-ticket-btn-manutencao' NÃO FOI ENCONTRADO."); }

        const ticketFormManutencao = utils.getById('ticket-form-manutencao');
        if (ticketFormManutencao) ticketFormManutencao.addEventListener('submit', chamadosCorretivos.handleFormSubmit);

        const ticketLocCat = utils.getById('ticket-location-category-chamado');
        if (ticketLocCat) ticketLocCat.addEventListener('change', (e) => chamadosCorretivos.populateLocationAreas(e.target.value));

        const ticketLocArea = utils.getById('ticket-location-area-chamado');
        if (ticketLocArea) {
            ticketLocArea.addEventListener('change', (e) => {
                const area = e.target.value; const catSel = utils.getById('ticket-location-category-chamado');
                const cat = catSel ? catSel.value : null; const customAreaInput = utils.getById('ticket-area-custom-chamado');
                if(customAreaInput && cat){ const showCustomArea = area === 'Outro (Especificar)'; customAreaInput.classList.toggle('hidden', !showCustomArea); customAreaInput.required = showCustomArea; if(!showCustomArea) customAreaInput.value = ''; else if(showCustomArea) customAreaInput.focus(); }
                if(cat) chamadosCorretivos.populateEquipment(cat, area);
            });
        }
        const backToFormBtn = utils.getById('back-to-form-btn-chamado');
        if(backToFormBtn) backToFormBtn.addEventListener('click', () => { utils.toggleModal('preview-modal', false); utils.toggleModal('ticket-modal', true); });

        const confirmTicketBtn = utils.getById('confirm-ticket-btn-chamado');
        if(confirmTicketBtn) {
            confirmTicketBtn.removeEventListener('click', chamadosCorretivos.handleConfirmAndRedirect);
            confirmTicketBtn.addEventListener('click', chamadosCorretivos.handleConfirmAndRedirect);
        } else { console.error("Botão 'confirm-ticket-btn-chamado' NÃO ENCONTRADO."); }

        const sendWhatsappBtn = utils.getById('send-whatsapp-btn-chamado');
        if(sendWhatsappBtn) {
             sendWhatsappBtn.removeEventListener('click', chamadosCorretivos.handleSendWhatsApp);
             sendWhatsappBtn.addEventListener('click', chamadosCorretivos.handleSendWhatsApp);
        } else { console.error("Botão 'send-whatsapp-btn-chamado' NÃO ENCONTRADO."); }

        const supplierSelectChamadoPreview = utils.getById('supplier-select-chamado');
        if (supplierSelectChamadoPreview) {
            supplierSelectChamadoPreview.addEventListener('change', (e) => {
                const selectedSupplierId = e.target.value;
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
                chamadosCorretivos.populatePreviewSupplierDropdown();
                ticketDraftManager.saveDebounced();
            });
        }

        const openScheduledVisitModalButton = utils.getById('openScheduledVisitModalBtn');
        if (openScheduledVisitModalButton) {
            openScheduledVisitModalButton.addEventListener('click', () => scheduledVisitsLogic.openScheduledVisitModal(false));
        }
        const scheduledVisitFormElement = utils.getById('scheduledVisitForm');
        if (scheduledVisitFormElement) {
            scheduledVisitFormElement.addEventListener('submit', scheduledVisitsLogic.handleScheduledVisitFormSubmit);
        }
        const visitRecurrenceSelect = utils.getById('visitRecurrence');
        if (visitRecurrenceSelect) {
            visitRecurrenceSelect.addEventListener('change', scheduledVisitsLogic.toggleCustomRecurrenceInput);
        }
        const markVisitDoneFormElement = utils.getById('markVisitDoneForm');
        if (markVisitDoneFormElement) {
            markVisitDoneFormElement.addEventListener('submit', scheduledVisitsLogic.handleMarkVisitDoneFormSubmit);
        }


        document.body.addEventListener('click', (e) => {
            let modalToClose = null;
            const dynamicCloseButton = e.target.closest('.modal-dynamic-close');
            if (dynamicCloseButton) {
                modalToClose = dynamicCloseButton.dataset.modalId || dynamicCloseButton.closest('.modal, .modal-overlay')?.id;
            } else if (e.target.matches('.modal-overlay') && e.target.id) {
                modalToClose = e.target.id;
            } else if (e.target.matches('.form-actions .btn-secondary')) {
                const parentModal = e.target.closest('.modal, .modal-overlay');
                if (parentModal && parentModal.id === 'ticket-modal') { modalToClose = parentModal.id; }
                else if (parentModal && parentModal.id === 'scheduledVisitModal') { modalToClose = parentModal.id; }
                else if (parentModal && parentModal.id === 'markVisitDoneModal') { modalToClose = parentModal.id; }
                else if (parentModal && parentModal.id && parentModal.id !== 'preview-modal') { modalToClose = parentModal.id; }
            }
            if (modalToClose) {
                if (modalToClose === 'ticket-modal') { ticketDraftManager.saveDebounced(); const occSel = utils.getById('occurrence-type-chamado'); if(occSel) occSel.disabled = false; }
                if (modalToClose === 'preview-modal') { state.currentTicketChamado = {}; ticketDraftManager.saveDebounced(); }
                if (modalToClose === 'scheduledVisitModal') { state.currentEditingVisitId = null; utils.resetForm('scheduledVisitForm'); }
                if (modalToClose === 'markVisitDoneModal') { utils.resetForm('markVisitDoneForm');}
                utils.toggleModal(modalToClose, false);
            }
        });
        document.addEventListener('keydown', (e) => {
             if (e.key === "Escape") {
                const visibleModals = document.querySelectorAll('.modal:not(.hidden), .modal-overlay:not(.hidden)');
                if (visibleModals.length > 0) {
                     const topModal = visibleModals[visibleModals.length - 1];
                     if (topModal.id) {
                        if (topModal.id === 'ticket-modal') { ticketDraftManager.saveDebounced(); const occSel = utils.getById('occurrence-type-chamado'); if(occSel) occSel.disabled = false; }
                        if (topModal.id === 'preview-modal') { state.currentTicketChamado = {}; ticketDraftManager.saveDebounced(); }
                        if (topModal.id === 'scheduledVisitModal') { state.currentEditingVisitId = null; utils.resetForm('scheduledVisitForm'); }
                        if (topModal.id === 'markVisitDoneModal') { utils.resetForm('markVisitDoneForm');}
                        utils.toggleModal(topModal.id, false);
                     }
                }
            }
        });
        console.log("Manutenção JS: init() concluído.");
    } catch (error) {
        console.error("ERRO CRÍTICO DURANTE init():", error);
    }
};
document.addEventListener('DOMContentLoaded', init);