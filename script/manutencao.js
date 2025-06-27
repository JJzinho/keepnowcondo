import { supabase } from './supabaseClient.js';

const ManutencaoPage = {
    // ================================================
    // ESTADO GLOBAL DO MÓDULO
    // ================================================
    state: {
        condoId: null,
        condoDetails: {},
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
    // GERENCIADOR DE RASCUNHOS
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
                        ManutencaoPage.populateTicketLocationAreas(draft.locationCategory, draft.locationArea);
                    }
                }
            },
            clear: () => sessionStorage.removeItem(ManutencaoPage.draftManager.ticket.key)
        },
        visit: {
            key: 'manutencaoVisitDraft',
            save: () => {
                const form = ManutencaoPage.utils.getById('scheduledVisitForm');
                if (!form) return;
                const draft = {
                    supplier: form.querySelector('#visitSupplier')?.value,
                    dateTime: form.querySelector('#visitDateTime')?.value,
                    description: form.querySelector('#visitDescription')?.value,
                    recurrence: form.querySelector('#visitRecurrence')?.value,
                };
                sessionStorage.setItem(ManutencaoPage.draftManager.visit.key, JSON.stringify(draft));
            },
            load: () => {
                const draftJSON = sessionStorage.getItem(ManutencaoPage.draftManager.visit.key);
                if (!draftJSON) return;
                const draft = JSON.parse(draftJSON);
                const form = ManutencaoPage.utils.getById('scheduledVisitForm');
                if (draft && form) {
                    form.querySelector('#visitSupplier').value = draft.supplier || '';
                    form.querySelector('#visitDateTime').value = draft.dateTime || '';
                    form.querySelector('#visitDescription').value = draft.description || '';
                    form.querySelector('#visitRecurrence').value = draft.recurrence || 'none';
                }
            },
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
            itemDiv.innerHTML = `<div class="overdue-item-header"><h4>${activity.titulo}</h4><span class="overdue-status">Vencida</span></div><div class="overdue-item-details"><p><strong>Prazo Original:</strong> ${this.utils.formatDate(activity.proximo_vencimento)}</p><p><strong>Descrição:</strong> ${activity.descricao || 'N/A'}</p></div><div class="overdue-item-actions"><button class="btn btn-warning open-ticket-overdue-btn"><i class="material-icons">bug_report</i> Abrir Chamado</button></div>`;
            itemDiv.querySelector('.open-ticket-overdue-btn').onclick = () => this.openTicketModal(activity);
            container.appendChild(itemDiv);
        });
    },

    renderScheduledVisits() {
        const container = this.utils.getById('scheduledVisitsListContainer');
        if (!container) return;
        container.innerHTML = '';
        const upcomingVisits = this.state.scheduledVisits.filter(v => v.status === 'AGENDADA');
        if (upcomingVisits.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma visita programada.</p>';
            return;
        }
        upcomingVisits.sort((a, b) => new Date(a.data_hora) - new Date(b.data_hora)).forEach(visit => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'scheduled-visit-item';
            itemDiv.innerHTML = `<div class="visit-item-header"><h5>${visit.fornecedor?.nome || 'Fornecedor não encontrado'}</h5><span class="visit-item-date">${this.utils.formatDate(visit.data_hora, true)}</span></div><div class="visit-item-details"><p><strong>Descrição:</strong> ${visit.descricao}</p></div><div class="visit-item-actions"><button class="btn btn-success mark-done-visit-btn"><i class="material-icons">check_circle</i> Já Realizado</button><button class="btn btn-info edit-visit-btn"><i class="material-icons">edit</i> Editar</button><button class="btn btn-danger delete-visit-btn"><i class="material-icons">delete</i> Excluir</button></div>`;
            itemDiv.querySelector('.edit-visit-btn').onclick = () => this.openScheduledVisitModal(visit);
            itemDiv.querySelector('.delete-visit-btn').onclick = () => this.deleteVisit(visit.id, visit.fornecedor?.nome);
            itemDiv.querySelector('.mark-done-visit-btn').onclick = () => this.openMarkVisitDoneModal(visit);
            container.appendChild(itemDiv);
        });
    },

    renderArchivedVisits() {
        const container = this.utils.getById('archivedVisitsListContainer');
        if (!container) return;
        container.innerHTML = '';
        const archivedVisits = this.state.scheduledVisits.filter(v => v.status !== 'AGENDADA');
        if (archivedVisits.length === 0) {
            container.innerHTML = '<p class="empty-list-message">Nenhuma visita no histórico.</p>';
            return;
        }
        archivedVisits.sort((a, b) => new Date(b.data_hora) - new Date(a.data_hora)).forEach(visit => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'archived-visit-item';
            itemDiv.innerHTML = `<div class="archived-visit-header"><h6>${visit.fornecedor?.nome || 'Fornecedor não encontrado'}</h6><span class="archived-realized-date">${visit.status} em: ${this.utils.formatDate(visit.data_hora, true)}</span></div><div class="archived-visit-details"><p><strong>Serviço Original:</strong> ${visit.descricao}</p>${visit.notas_realizacao ? `<div class="archived-visit-notes"><p><strong>Notas:</strong> ${visit.notas_realizacao}</p></div>` : ''}</div>`;
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
        this.state.currentTicket = {};
        this.utils.getById('equipment-section-chamado')?.classList.add('hidden');
        const occurrenceSelect = this.utils.getById('occurrence-type-chamado');
        occurrenceSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        this.state.occurrenceTypes.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(o => occurrenceSelect.add(new Option(o.nome, o.id)));
        const locationCatSelect = this.utils.getById('ticket-location-category-chamado');
        locationCatSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        if (this.state.locationConfig?.pavimentos) {
            this.state.locationConfig.pavimentos.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(p => locationCatSelect.add(new Option(p.nome, p.nome)));
        }
        const areaSelect = this.utils.getById('ticket-location-area-chamado');
        locationCatSelect.onchange = () => this.populateTicketLocationAreas(locationCatSelect.value);
        areaSelect.onchange = () => this.populateTicketEquipment(locationCatSelect.value, areaSelect.value);
        areaSelect.innerHTML = '<option value="" selected disabled>Selecione o Pavimento...</option>';
        areaSelect.disabled = true;
        if (activity) {
            this.utils.getById('ticketAssociatedActivityId').value = activity.id;
            this.utils.getById('description-chamado').value = `Chamado referente à atividade vencida: "${activity.titulo}".`;
            if (activity.tipo_ocorrencia_id) occurrenceSelect.value = activity.tipo_ocorrencia_id;
        } else {
            this.draftManager.ticket.load();
        }
        this.utils.toggleModal('ticket-modal', true);
    },

    populateTicketLocationAreas(pavimentoNome, areaToSelect = null) {
        const areaSelect = this.utils.getById('ticket-location-area-chamado');
        areaSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        areaSelect.disabled = true;
        this.utils.getById('equipment-section-chamado')?.classList.add('hidden');
        const equipmentList = this.utils.getById('equipment-list-chamado');
        if(equipmentList) equipmentList.innerHTML = '';
        if (this.state.locationConfig?.pavimentos) {
            const pavimento = this.state.locationConfig.pavimentos.find(p => p.nome === pavimentoNome);
            if (pavimento?.sublocais) {
                pavimento.sublocais.sort((a, b) => a.nome.localeCompare(b.nome)).forEach(s => areaSelect.add(new Option(s.nome, s.nome)));
                areaSelect.disabled = false;
                if (areaToSelect) {
                    areaSelect.value = areaToSelect;
                    this.populateTicketEquipment(pavimentoNome, areaToSelect);
                }
            }
        }
    },

    populateTicketEquipment(pavimentoNome, sublocalNome) {
        const equipmentSection = this.utils.getById('equipment-section-chamado');
        const equipmentList = this.utils.getById('equipment-list-chamado');
        if (!equipmentSection || !equipmentList) return;
        equipmentSection.classList.add('hidden');
        equipmentList.innerHTML = '';
        if (!pavimentoNome || !sublocalNome || !this.state.locationConfig.pavimentos) return;
        const pavimento = this.state.locationConfig.pavimentos.find(p => p.nome === pavimentoNome);
        if (!pavimento?.sublocais) return;
        const sublocal = pavimento.sublocais.find(s => s.nome === sublocalNome);
        if (!sublocal?.equipamentos || sublocal.equipamentos.length === 0) return;
        sublocal.equipamentos.forEach(equip => {
            const uniqueId = `equip-${equip.nome.replace(/\s/g, '')}`;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'equipment-item';
            itemDiv.innerHTML = `<input type="checkbox" id="${uniqueId}" value="${equip.nome}"><label for="${uniqueId}">${equip.nome}</label>`;
            equipmentList.appendChild(itemDiv);
        });
        equipmentSection.classList.remove('hidden');
    },

    handleTicketSubmit(event) {
        event.preventDefault();
        const tipoOcorrenciaId = this.utils.getById('occurrence-type-chamado').value;
        const localizacaoCat = this.utils.getById('ticket-location-category-chamado').value;
        const localizacaoArea = this.utils.getById('ticket-location-area-chamado').value;
        const descricao = this.utils.getById('description-chamado').value.trim();
        const prioridade = this.utils.getById('priority-chamado').value;
        if (!tipoOcorrenciaId || !localizacaoCat || !localizacaoArea || !descricao || !prioridade) {
            alert("Por favor, preencha todos os campos obrigatórios: Sistema, Localização (ambos), Descrição e Prioridade.");
            return;
        }
        const selectedEquipment = [];
        this.utils.getById('equipment-list-chamado').querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
            selectedEquipment.push({ nome: cb.value, quantidade: 1 });
        });
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
        if (equipItem && equipVal) {
            if (ticket.equipamentos_selecionados?.length > 0) {
                equipVal.textContent = ticket.equipamentos_selecionados.map(eq => eq.nome).join(', ');
                equipItem.style.display = 'flex';
            } else {
                equipItem.style.display = 'none';
            }
        }
        const supplierSelect = this.utils.getById('supplier-select-chamado');
        const whatsappBtn = this.utils.getById('send-whatsapp-btn');
        const saveBtn = this.utils.getById('confirm-ticket-btn-chamado');
        supplierSelect.innerHTML = '<option value="">Selecione um fornecedor...</option>';
        const relevantSuppliers = this.state.suppliers.filter(s => s.servico_principal_id == ticket.tipo_ocorrencia_id);
        relevantSuppliers.forEach(s => supplierSelect.add(new Option(s.nome, s.id)));
        supplierSelect.onchange = () => {
            const supplier = this.state.suppliers.find(s => s.id == supplierSelect.value);
            if (whatsappBtn) whatsappBtn.disabled = !supplier?.telefone;
            if (saveBtn) saveBtn.disabled = !supplierSelect.value;
        };
        if (whatsappBtn) whatsappBtn.disabled = true;
        if (saveBtn) saveBtn.disabled = true;
    },

    generateWhatsAppMessage() {
        const ticket = this.state.currentTicket;
        const condo = this.state.condoDetails;
        const equipTxt = ticket.equipamentos_selecionados?.length > 0 ? `\n*Equipamento(s):* ${ticket.equipamentos_selecionados.map(eq => eq.nome).join(', ')}` : "";
        const message = `*SOLICITAÇÃO DE ORÇAMENTO*\n\n*Condomínio:* ${condo.nome || 'Não informado'}\n*Endereço:* ${condo.endereco || 'Não informado'}\n\nOlá, gostaríamos de solicitar um orçamento para o seguinte serviço:\n\n*Sistema:* ${ticket.tipo_ocorrencia_nome}\n*Localização:* ${ticket.localizacao}\n*Prioridade:* ${ticket.prioridade}${equipTxt}\n\n*Descrição do Problema:*\n${ticket.descricao}\n\nAguardamos o seu retorno. Obrigado!`;
        return encodeURIComponent(message);
    },

    sendWhatsAppMessage() {
        const supplierId = this.utils.getById('supplier-select-chamado').value;
        if (!supplierId) { alert('Selecione um fornecedor para enviar a mensagem.'); return; }
        const supplier = this.state.suppliers.find(s => s.id == supplierId);
        if (!supplier?.telefone) { alert('O fornecedor selecionado não possui um telefone válido.'); return; }
        const phone = supplier.telefone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/55${phone}?text=${this.generateWhatsAppMessage()}`;
        window.open(whatsappUrl, '_blank');
    },

    async confirmAndSaveTicket() {
        const supplierId = this.utils.getById('supplier-select-chamado').value;
        if (!supplierId) {
            alert("É necessário selecionar um fornecedor para salvar o chamado.");
            return;
        }
        this.state.currentTicket.fornecedor_id = supplierId;
        const ticketDataToSave = {
            condominio_id: this.state.condoId,
            checklist_activity_id: this.state.currentTicket.checklist_activity_id,
            tipo_ocorrencia_id: this.state.currentTicket.tipo_ocorrencia_id,
            fornecedor_id: this.state.currentTicket.fornecedor_id,
            localizacao: this.state.currentTicket.localizacao,
            descricao: this.state.currentTicket.descricao,
            prioridade: this.state.currentTicket.prioridade,
            status: 'PENDENTE',
            equipamentos_selecionados: this.state.currentTicket.equipamentos_selecionados
        };
        const { data, error } = await supabase.from('chamado').insert([ticketDataToSave]).select().single();
        if (error) {
            console.error("Erro ao criar chamado:", error);
            alert("Falha ao criar chamado no banco de dados.");
        } else {
            this.draftManager.ticket.clear();
            alert("Chamado salvo com sucesso!");
            window.location.href = './chamados.html';
        }
    },

    openScheduledVisitModal(visit = null) {
        const form = this.utils.getById('scheduledVisitForm');
        if (!form) return;
        form.reset();
        this.state.currentEditingVisitId = null;
        const supplierSelect = this.utils.getById('visitSupplier');
        supplierSelect.innerHTML = '<option value="" selected disabled>Selecione...</option>';
        this.state.suppliers.filter(s => s.possui_contrato).sort((a, b) => a.nome.localeCompare(b.nome)).forEach(s => supplierSelect.add(new Option(s.nome, s.id)));
        if (visit) {
            this.state.currentEditingVisitId = visit.id;
            this.utils.getById('scheduledVisitId').value = visit.id;
            this.utils.getById('visitSupplier').value = visit.fornecedor_id;
            this.utils.getById('visitDateTime').value = new Date(visit.data_hora).toISOString().slice(0, 16);
            this.utils.getById('visitDescription').value = visit.descricao;
            this.utils.getById('visitRecurrence').value = visit.recorrencia || 'none';
        } else {
            this.draftManager.visit.load();
        }
        this.utils.toggleModal('scheduledVisitModal', true);
    },

    async handleVisitSubmit(event) {
        event.preventDefault();
        const visitData = {
            id: this.utils.getById('scheduledVisitId').value || undefined,
            condominio_id: this.state.condoId,
            fornecedor_id: this.utils.getById('visitSupplier').value,
            data_hora: new Date(this.utils.getById('visitDateTime').value).toISOString(),
            descricao: this.utils.getById('visitDescription').value,
            recorrencia: this.utils.getById('visitRecurrence').value,
            status: 'AGENDADA'
        };
        if (!visitData.fornecedor_id || !visitData.data_hora || !visitData.descricao) {
            alert("Preencha todos os campos da visita.");
            return;
        }
        const { error } = await supabase.from('visita_tecnica').upsert(visitData);
        if (error) {
            console.error("Erro ao salvar visita:", error);
            alert("Falha ao salvar agendamento.");
        } else {
            this.draftManager.visit.clear();
            alert("Agendamento salvo com sucesso!");
            this.utils.toggleModal('scheduledVisitModal', false);
            await this.initialize();
        }
    },

    async deleteVisit(visitId, supplierName) {
        if (!confirm(`Tem certeza que deseja excluir a visita com ${supplierName}?`)) return;
        const { error } = await supabase.from('visita_tecnica').delete().eq('id', visitId);
        if (error) {
            console.error("Erro ao excluir visita:", error);
            alert("Falha ao excluir agendamento.");
        } else {
            alert("Agendamento excluído!");
            await this.initialize();
        }
    },

    openMarkVisitDoneModal(visit) {
        const form = this.utils.getById('markVisitDoneForm');
        if (!form) return;
        form.reset();
        this.utils.getById('markDoneVisitId').value = visit.id;
        this.utils.getById('markDoneSupplierName').textContent = visit.fornecedor?.nome || 'N/A';
        this.utils.getById('markDoneVisitScheduledDate').textContent = this.utils.formatDate(visit.data_hora, true);
        this.utils.toggleModal('markVisitDoneModal', true);
    },

    async handleMarkVisitDoneSubmit(event) {
        event.preventDefault();
        const visitId = this.utils.getById('markDoneVisitId').value;
        const notes = this.utils.getById('realizationNotes').value;
        const { error } = await supabase.from('visita_tecnica').update({ status: 'REALIZADA', notas_realizacao: notes }).eq('id', visitId);
        if (error) {
            console.error("Erro ao marcar visita como realizada:", error);
            alert("Falha ao concluir visita.");
        } else {
            alert("Visita marcada como realizada!");
            this.utils.toggleModal('markVisitDoneModal', false);
            await this.initialize();
        }
    },

    // ================================================
    // SETUP DE EVENTOS E INICIALIZAÇÃO
    // ================================================
    setupEventListeners() {
        const s = this.utils.getById;
        s('create-ticket-btn-manutencao')?.addEventListener('click', () => this.openTicketModal());
        s('openScheduledVisitModalBtn')?.addEventListener('click', () => this.openScheduledVisitModal());
        s('ticket-form-manutencao')?.addEventListener('submit', (e) => this.handleTicketSubmit(e));
        s('scheduledVisitForm')?.addEventListener('submit', (e) => this.handleVisitSubmit(e));
        s('markVisitDoneForm')?.addEventListener('submit', (e) => this.handleMarkVisitDoneSubmit(e));
        s('ticket-form-manutencao')?.addEventListener('input', this.draftManager.ticket.save);
        s('scheduledVisitForm')?.addEventListener('input', this.draftManager.visit.save);
        s('back-to-form-btn-chamado')?.addEventListener('click', () => {
            this.utils.toggleModal('preview-modal', false);
            this.utils.toggleModal('ticket-modal', true);
        });
        s('confirm-ticket-btn-chamado')?.addEventListener('click', () => this.confirmAndSaveTicket());
        s('send-whatsapp-btn')?.addEventListener('click', () => this.sendWhatsAppMessage());
        document.querySelectorAll('.modal-dynamic-close').forEach(btn => {
            btn.onclick = () => this.utils.toggleModal(btn.dataset.modalId, false);
        });
    },

    async initialize() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.replace('/www/index.html');
            return;
        }
        this.state.condoId = sessionStorage.getItem('selectedCondoId');
        if (!this.state.condoId) {
            alert("Condomínio não selecionado!");
            window.location.replace('/www/inicio.html');
            return;
        }
        const [activitiesRes, visitsRes, suppliersRes, occurrencesRes, condoRes] = await Promise.all([
            supabase.from('checklist_activity').select('*').eq('condominio_id', this.state.condoId),
            supabase.from('visita_tecnica').select('*, fornecedor(nome, telefone)').eq('condominio_id', this.state.condoId),
            supabase.from('fornecedor').select('*, tipo_ocorrencia(nome)').eq('condominio_id', this.state.condoId),
            supabase.from('tipo_ocorrencia').select('*').eq('condominio_id', this.state.condoId),
            supabase.from('condominio').select('nome, endereco, location_config').eq('id', this.state.condoId).single()
        ]);
        if(condoRes.data) {
            this.state.condoDetails = { nome: condoRes.data.nome, endereco: condoRes.data.endereco };
            this.state.locationConfig = condoRes.data.location_config || { pavimentos: [] };
        }
        this.state.activities = activitiesRes.data || [];
        const today = new Date(); today.setHours(0, 0, 0, 0);
        this.state.overdueActivities = this.state.activities.filter(act => act.proximo_vencimento && new Date(act.proximo_vencimento) < today);
        this.state.visits = visitsRes.data || [];
        this.state.scheduledVisits = visitsRes.data || [];
        this.state.suppliers = suppliersRes.data || [];
        this.state.occurrenceTypes = occurrencesRes.data || [];

        this.renderAllSections();
        this.setupEventListeners();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ManutencaoPage.initialize();
});
