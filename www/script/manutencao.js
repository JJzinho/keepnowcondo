import { supabase } from './supabaseClient.js';

const ManutencaoPage = {
    // ================================================
    // ESTADO GLOBAL DO MÓDULO
    // ================================================
    state: {
        condoId: null,
        userId: null,
        condoDetails: {},
        activities: [], // Atividades do checklist para referência
        overdueActivities: [],
        scheduledVisits: [],
        suppliers: [],
        occurrenceTypes: [],
        locationConfig: {},
        currentTicket: {},
        currentEditingVisitId: null
    },

    // ================================================
    // FUNÇÕES UTILITÁRIAS
    // ================================================
    utils: {
        getById: (id) => document.getElementById(id),
        toggleModal: (modalId, show) => {
            const modal = ManutencaoPage.utils.getById(modalId);
            if (modal) {
                modal.classList.toggle('hidden', !show);
                document.body.classList.toggle('modal-open', show);
            }
        },
        formatDate: (dateInput, includeTime = false) => {
            if (!dateInput) return 'N/A';
            const date = new Date(dateInput);
            if (isNaN(date.getTime())) return 'Data Inválida';
            const options = { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' };
            if (includeTime) {
                options.hour = '2-digit';
                options.minute = '2-digit';
            }
            return date.toLocaleDateString('pt-BR', options);
        }
    },

    // ================================================
    // GERENCIADOR DE RASCUNHOS (DRAFTS)
    // ================================================
    draftManager: {
        ticket: {
            key: 'manutencaoTicketDraft',
            save: () => {
                const form = ManutencaoPage.utils.getById('ticket-form-manutencao');
                if (!form) return;
                const draft = {
                    occurrence: form.querySelector('#occurrence-type-chamado')?.value,
                    locationCategory: form.querySelector('#ticket-location-category-chamado')?.value,
                    locationArea: form.querySelector('#ticket-location-area-chamado')?.value,
                    description: form.querySelector('#description-chamado')?.value,
                    priority: form.querySelector('#priority-chamado')?.value,
                };
                sessionStorage.setItem(ManutencaoPage.draftManager.ticket.key, JSON.stringify(draft));
            },
            load: () => {
                const draftJSON = sessionStorage.getItem(ManutencaoPage.draftManager.ticket.key);
                if (!draftJSON) return;
                const draft = JSON.parse(draftJSON);
                const form = ManutencaoPage.utils.getById('ticket-form-manutencao');
                if (draft && form) {
                    form.querySelector('#occurrence-type-chamado').value = draft.occurrence || '';
                    form.querySelector('#description-chamado').value = draft.description || '';
                    form.querySelector('#priority-chamado').value = draft.priority || '';
                    if (draft.locationCategory) {
                        const catSelect = form.querySelector('#ticket-location-category-chamado');
                        catSelect.value = draft.locationCategory;
                        // AQUI ESTÁ A CORREÇÃO:
                        // Garantimos que a lista de sublocais seja populada antes de tentar selecionar um.
                        ManutencaoPage.populateTicketLocationAreas(draft.locationCategory, draft.locationArea);
                    }
                }
            },
            clear: () => sessionStorage.removeItem(ManutencaoPage.draftManager.ticket.key)
        },
        visit: {
            // Lógica para rascunho de visitas (mantida como no seu original)
            key: 'manutencaoVisitDraft',
            save: () => { /* ... */ },
            load: () => { /* ... */ },
            clear: () => sessionStorage.removeItem(ManutencaoPage.draftManager.visit.key)
        }
    },

    // ================================================
    // FUNÇÕES DE RENDERIZAÇÃO
    // ================================================
    renderAllSections() {
        this.renderOverdueActivities();
        this.renderScheduledVisits();
        this.renderArchivedVisits();
    },

    renderOverdueActivities() {
        const container = this.utils.getById('overdueActivitiesList');
        const section = this.utils.getById('overdue-activities-section');
        if (!container || !section) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        this.state.overdueActivities = this.state.activities
            .filter(act => act.proximo_vencimento && new Date(act.proximo_vencimento + 'T00:00:00Z') < today)
            .sort((a,b) => new Date(a.proximo_vencimento) - new Date(b.proximo_vencimento));
        
        container.innerHTML = '';
        if (this.state.overdueActivities.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma atividade vencida no momento.</p>';
            section.classList.remove('has-overdue-alert');
            return;
        }
        section.classList.add('has-overdue-alert');
        this.state.overdueActivities.forEach(activity => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'overdue-activity-item section-card';
            itemDiv.innerHTML = `
                <div class="overdue-item-header"><h4>${activity.titulo}</h4><span class="overdue-status">Vencida</span></div>
                <div class="overdue-item-details"><p><strong>Prazo Original:</strong> ${this.utils.formatDate(activity.proximo_vencimento)}</p></div>
                <div class="overdue-item-actions"><button class="btn btn-warning open-ticket-overdue-btn"><i class="material-icons">bug_report</i> Abrir Chamado</button></div>`;
            itemDiv.querySelector('.open-ticket-overdue-btn').onclick = () => this.openTicketModal(activity);
            container.appendChild(itemDiv);
        });
    },

    renderScheduledVisits() {
        const container = this.utils.getById('scheduledVisitsListContainer');
        if (!container) return;
        const upcomingVisits = this.state.scheduledVisits.filter(v => v.status === 'AGENDADA');
        container.innerHTML = upcomingVisits.length === 0 ? '<p class="empty-list-message">Nenhuma visita programada.</p>' : '';
        upcomingVisits.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)).forEach(visit => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'scheduled-visit-item';
            itemDiv.innerHTML = `<div class="visit-item-header"><h5>${visit.fornecedor?.nome || 'Fornecedor'}</h5><span class="visit-item-date">${this.utils.formatDate(visit.data_hora, true)}</span></div><p><strong>Descrição:</strong> ${visit.descricao}</p>`;
            container.appendChild(itemDiv);
        });
    },

    renderArchivedVisits() {
        const container = this.utils.getById('archivedVisitsListContainer');
        if (!container) return;
        const archivedVisits = this.state.scheduledVisits.filter(v => v.status !== 'AGENDADA');
        container.innerHTML = archivedVisits.length === 0 ? '<p class="empty-list-message">Nenhuma visita no histórico.</p>' : '';
        archivedVisits.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora)).forEach(visit => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'archived-visit-item';
            itemDiv.innerHTML = `<div class="archived-visit-header"><h6>${visit.fornecedor?.nome || 'Fornecedor'}</h6><span>${visit.status} em: ${this.utils.formatDate(visit.data_hora, true)}</span></div><p><strong>Notas:</strong> ${visit.notas_realizacao || 'N/A'}</p>`;
            container.appendChild(itemDiv);
        });
    },
    
    // ================================================
    // LÓGICA DE FORMULÁRIOS E AÇÕES
    // ================================================

    openTicketModal(activity = null) {
        const form = this.utils.getById('ticket-form-manutencao');
        if (!form) return;
        
        form.reset();
        this.draftManager.ticket.clear();
        this.state.currentTicket = {};
        this.utils.getById('ticketAssociatedActivityId').value = '';
        this.utils.getById('equipment-section-chamado')?.classList.add('hidden');

        // Popula selects
        const occurrenceSelect = this.utils.getById('occurrence-type-chamado');
        occurrenceSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        this.state.occurrenceTypes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(o => occurrenceSelect.add(new Option(o.nome, o.id)));
        
        const locationCatSelect = this.utils.getById('ticket-location-category-chamado');
        locationCatSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        this.state.locationConfig?.pavimentos?.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(p => locationCatSelect.add(new Option(p.nome, p.nome)));
        
        this.utils.getById('ticket-location-area-chamado').innerHTML = '<option value="" selected disabled>Selecione o Pavimento...</option>';
        this.utils.getById('ticket-location-area-chamado').disabled = true;

        if (activity) {
            // Se veio do checklist, pré-preenche os dados
            this.utils.getById('ticketAssociatedActivityId').value = activity.id;
            this.utils.getById('description-chamado').value = `Chamado referente à atividade vencida: "${activity.titulo}".\n\nDescrição original: ${activity.descricao || 'N/A'}`;
            if (activity.tipo_ocorrencia_id) occurrenceSelect.value = activity.tipo_ocorrencia_id;
        } else {
            // Se não, tenta carregar um rascunho salvo
            this.draftManager.ticket.load();
        }
        this.utils.toggleModal('ticket-modal', true);
    },

    populateTicketLocationAreas(pavimentoNome, areaToSelect = null) {
        const areaSelect = this.utils.getById('ticket-location-area-chamado');
        areaSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        areaSelect.disabled = true;
        this.utils.getById('equipment-section-chamado')?.classList.add('hidden');
        
        const pavimento = this.state.locationConfig?.pavimentos?.find(p => p.nome === pavimentoNome);
        if (pavimento?.sublocais) {
            pavimento.sublocais.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(s => areaSelect.add(new Option(s.nome, s.nome)));
            areaSelect.disabled = false;
            // Se uma área foi passada para ser pré-selecionada (vindo do rascunho), seleciona-a.
            if (areaToSelect) {
                areaSelect.value = areaToSelect;
                this.populateTicketEquipment(pavimentoNome, areaToSelect);
            }
        }
    },

    populateTicketEquipment(pavimentoNome, sublocalNome) {
        const equipmentSection = this.utils.getById('equipment-section-chamado');
        const equipmentList = this.utils.getById('equipment-list-chamado');
        if (!equipmentSection || !equipmentList) return;
        
        equipmentList.innerHTML = '';
        const pavimento = this.state.locationConfig?.pavimentos?.find(p => p.nome === pavimentoNome);
        const sublocal = pavimento?.sublocais?.find(s => s.nome === sublocalNome);
        
        if (sublocal?.equipamentos?.length > 0) {
            sublocal.equipamentos.forEach(equip => {
                const uniqueId = `equip-${equip.nome.replace(/\s/g, '')}`;
                equipmentList.innerHTML += `<div class="equipment-item"><input type="checkbox" id="${uniqueId}" value="${equip.nome}"><label for="${uniqueId}">${equip.nome}</label></div>`;
            });
            equipmentSection.classList.remove('hidden');
        } else {
            equipmentSection.classList.add('hidden');
        }
    },

    handleTicketSubmit(event) {
        event.preventDefault();
        const tipoOcorrenciaId = this.utils.getById('occurrence-type-chamado').value;
        const localizacaoCat = this.utils.getById('ticket-location-category-chamado').value;
        const localizacaoArea = this.utils.getById('ticket-location-area-chamado').value;
        const descricao = this.utils.getById('description-chamado').value.trim();
        const prioridade = this.utils.getById('priority-chamado').value;
        if (!tipoOcorrenciaId || !localizacaoCat || !localizacaoArea || !descricao || !prioridade) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }
        
        const selectedEquipment = Array.from(this.utils.getById('equipment-list-chamado').querySelectorAll('input[type="checkbox"]:checked')).map(cb => ({ nome: cb.value, quantidade: 1 }));
        const tipoOcorrenciaSelect = this.utils.getById('occurrence-type-chamado');
        
        this.state.currentTicket = {
            checklist_activity_id: this.utils.getById('ticketAssociatedActivityId').value || null,
            tipo_ocorrencia_id: tipoOcorrenciaId,
            tipo_ocorrencia_nome: tipoOcorrenciaSelect.options[tipoOcorrenciaSelect.selectedIndex].text,
            localizacao: `${localizacaoCat} - ${localizacaoArea}`,
            descricao: descricao,
            prioridade: prioridade,
            equipamentos_selecionados: selectedEquipment.length > 0 ? selectedEquipment : null
        };

        this.populatePreviewModal();
        this.utils.toggleModal('ticket-modal', false);
        this.utils.toggleModal('preview-modal', true);
    },

    populatePreviewModal() {
        const ticket = this.state.currentTicket;
        this.utils.getById('preview-occurrence-chamado').textContent = ticket.tipo_ocorrencia_nome;
        this.utils.getById('preview-location-chamado').textContent = ticket.localizacao;
        this.utils.getById('preview-description-chamado').textContent = ticket.descricao;
        this.utils.getById('preview-priority-chamado').textContent = ticket.prioridade;
        
        const equipItem = this.utils.getById('preview-equipment-item-chamado');
        const equipVal = this.utils.getById('preview-equipment-chamado');
        equipItem.style.display = ticket.equipamentos_selecionados?.length > 0 ? 'flex' : 'none';
        if (ticket.equipamentos_selecionados?.length > 0) {
            equipVal.textContent = ticket.equipamentos_selecionados.map(eq => eq.nome).join(', ');
        }

        const supplierSelect = this.utils.getById('supplier-select-chamado');
        const whatsappBtn = this.utils.getById('send-whatsapp-btn');
        const saveBtn = this.utils.getById('confirm-ticket-btn-chamado');
        
        supplierSelect.innerHTML = '<option value="">Selecione um fornecedor...</option>';
        const relevantSuppliers = this.state.suppliers.filter(s => s.servico_principal_id == ticket.tipo_ocorrencia_id);
        relevantSuppliers.forEach(s => supplierSelect.add(new Option(s.nome, s.id)));
        
        supplierSelect.onchange = () => {
            const supplier = this.state.suppliers.find(s => s.id == supplierSelect.value);
            whatsappBtn.disabled = !supplier?.telefone;
            saveBtn.disabled = !supplierSelect.value;
        };
        whatsappBtn.disabled = true;
        saveBtn.disabled = true;
    },

    generateWhatsAppMessage() { /* ... (sem alterações) ... */ },
    sendWhatsAppMessage() { /* ... (sem alterações) ... */ },

    async confirmAndSaveTicket() {
        const supplierId = this.utils.getById('supplier-select-chamado').value;
        if (!supplierId) { alert("É necessário selecionar um fornecedor."); return; }

        const ticketDataToSave = {
            condominio_id: this.state.condoId,
            requester_id: this.state.userId,
            checklist_activity_id: this.state.currentTicket.checklist_activity_id,
            tipo_ocorrencia_id: this.state.currentTicket.tipo_ocorrencia_id,
            fornecedor_id: supplierId,
            localizacao: this.state.currentTicket.localizacao,
            descricao: this.state.currentTicket.descricao,
            prioridade: this.state.currentTicket.prioridade,
            status: 'PENDENTE',
            equipamentos_selecionados: this.state.currentTicket.equipamentos_selecionados
        };

        const { error } = await supabase.from('chamado').insert([ticketDataToSave]);
        if (error) {
            console.error("Erro ao criar chamado:", error);
            alert("Falha ao criar chamado no banco de dados.");
        } else {
            this.draftManager.ticket.clear();
            alert("Chamado salvo com sucesso!");
            window.location.href = './chamados.html';
        }
    },

    // ================================================
    // EVENT LISTENERS E INICIALIZAÇÃO
    // ================================================
    setupEventListeners() {
        const s = this.utils.getById;
        s('create-ticket-btn-manutencao')?.addEventListener('click', () => this.openTicketModal());
        s('ticket-form-manutencao')?.addEventListener('submit', (e) => this.handleTicketSubmit(e));
        s('ticket-form-manutencao')?.addEventListener('input', this.draftManager.ticket.save);
        
        s('back-to-form-btn-chamado')?.addEventListener('click', () => {
            this.utils.toggleModal('preview-modal', false);
            this.utils.toggleModal('ticket-modal', true);
        });
        s('confirm-ticket-btn-chamado')?.addEventListener('click', () => this.confirmAndSaveTicket());
        s('send-whatsapp-btn')?.addEventListener('click', () => this.sendWhatsAppMessage());
        
        document.querySelectorAll('.modal-dynamic-close').forEach(btn => {
            btn.onclick = () => {
                this.utils.toggleModal(btn.dataset.modalId, false);
                this.draftManager.ticket.clear();
                this.draftManager.visit.clear();
            };
        });
        
        const locationCatSelect = s('ticket-location-category-chamado');
        const areaSelect = s('ticket-location-area-chamado');
        locationCatSelect.onchange = () => this.populateTicketLocationAreas(locationCatSelect.value);
        areaSelect.onchange = () => this.populateTicketEquipment(locationCatSelect.value, areaSelect.value);
    },

    async initialize() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.replace('/www/index.html'); return; }
        
        this.state.userId = session.user.id;
        this.state.condoId = sessionStorage.getItem('selectedCondoId');
        if (!this.state.condoId) {
            alert("Condomínio não selecionado!");
            window.location.replace('/www/pages/inicio.html');
            return;
        }

        const [activitiesRes, visitsRes, suppliersRes, occurrencesRes, condoRes] = await Promise.all([
            supabase.from('checklist_activity').select('*').eq('condominio_id', this.state.condoId),
            supabase.from('visita_tecnica').select('*, fornecedor(nome, telefone)').eq('condominio_id', this.state.condoId),
            supabase.from('fornecedor').select('*, tipo_ocorrencia(nome)').eq('condominio_id', this.state.condoId),
            supabase.from('tipo_ocorrencia').select('*').eq('condominio_id', this.state.condoId),
            supabase.from('condominio').select('nome, endereco, location_config').eq('id', this.state.condoId).single()
        ]);
        
        this.state.condoDetails = condoRes.data ? { nome: condoRes.data.nome, endereco: condoRes.data.endereco } : {};
        this.state.locationConfig = condoRes.data?.location_config || { pavimentos: [] };
        this.state.activities = activitiesRes.data || [];
        this.state.scheduledVisits = visitsRes.data || [];
        this.state.suppliers = suppliersRes.data || [];
        this.state.occurrenceTypes = occurrencesRes.data || [];

        this.renderAllSections();
        this.setupEventListeners();
        
        const sourceActivityId = sessionStorage.getItem('sourceActivityIdForTicket');
        if (sourceActivityId) {
            sessionStorage.removeItem('sourceActivityIdForTicket');
            const sourceActivity = this.state.activities.find(a => a.id === sourceActivityId);
            if (sourceActivity) {
                this.openTicketModal(sourceActivity);
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ManutencaoPage.initialize();
});