import { supabase } from './supabaseClient.js';

const ChamadosPage = {
    // ================================================
    // ESTADO GLOBAL DO MÓDULO
    // ================================================
    state: {
        condoId: null,
        tickets: [],
        currentTicketId: null,
    },

    // ================================================
    // FUNÇÕES UTILITÁRIAS
    // ================================================
    utils: {
        getById: (id) => document.getElementById(id),
        toggleModal: (show) => {
            const modal = document.getElementById('ticket-detail-modal');
            if (modal) {
                modal.classList.toggle('hidden', !show);
                document.body.classList.toggle('modal-open', show);
            }
        },
        formatDate: (dateStr) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : 'N/A',
    },

    // ================================================
    // INICIALIZAÇÃO DA PÁGINA
    // ================================================
    async init() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { window.location.replace('/www/index.html'); return; }
        
        this.state.condoId = sessionStorage.getItem('selectedCondoId');
        if (!this.state.condoId) {
            alert("Condomínio não selecionado!");
            window.location.replace('./pages/inicio.html');
            return;
        }

        this.setupEventListeners();
        await this.fetchAndRenderTickets();
    },

    // ================================================
    // CONFIGURAÇÃO DOS EVENT LISTENERS
    // ================================================
    setupEventListeners() {
        const reportBtn = this.utils.getById('generate-report-btn');
        if(reportBtn) reportBtn.addEventListener('click', () => this.generateReport());
        
        const modal = this.utils.getById('ticket-detail-modal');
        if (modal) {
            const closeButton = modal.querySelector('.modal-close-x');
            if(closeButton) closeButton.addEventListener('click', () => this.utils.toggleModal(false));
        }
        
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;
                tabButtons.forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
                button.classList.add('active');
                const activePane = this.utils.getById(`tab-${tabName}`);
                if(activePane) activePane.classList.add('active');
            });
        });
    },

    // ================================================
    // BUSCA E RENDERIZAÇÃO DOS DADOS
    // ================================================
    async fetchAndRenderTickets() {
        const { data, error } = await supabase
            .from('chamado')
            .select(`*, tipo_ocorrencia(nome), fornecedor(nome), chamado_anexo(*)`)
            .eq('condominio_id', this.state.condoId)
            .order('created_at', { ascending: false });

        if (error) { console.error("Erro ao buscar chamados:", error); return; }
        
        this.state.tickets = data;
        this.renderAllTabs();
    },

    renderAllTabs() {
        const statuses = ['PENDENTE', 'EM ANDAMENTO', 'CONCLUIDO', 'ARQUIVADO'];
        const counts = { PENDENTE: 0, 'EM ANDAMENTO': 0, CONCLUIDO: 0, ARQUIVADO: 0 };

        statuses.forEach(status => {
            const pane = this.utils.getById(`tab-${status}`);
            if (pane) pane.innerHTML = '';
        });

        this.state.tickets.forEach(ticket => {
            const status = ticket.status.toUpperCase();
            const pane = this.utils.getById(`tab-${status}`);
            if (pane) {
                const card = this.createTicketCard(ticket);
                pane.appendChild(card);
                if (counts.hasOwnProperty(status)) counts[status]++;
            }
        });

        statuses.forEach(status => {
            const pane = this.utils.getById(`tab-${status}`);
            const countSpan = document.querySelector(`.tab-count[data-count-for="${status}"]`);
            if (countSpan) countSpan.textContent = counts[status];
            if (pane && counts[status] === 0) {
                pane.innerHTML = '<p class="status-message">Nenhum chamado neste status.</p>';
            }
        });
    },

    createTicketCard(ticket) {
        const card = document.createElement('div');
        const priorityClass = (ticket.prioridade || 'baixo').toLowerCase().replace('é', 'e');
        card.className = `ticket-card priority-${priorityClass}`;
        card.dataset.ticketId = ticket.id;
        card.innerHTML = `
            <div class="card-header"><h4 class="card-title">${ticket.tipo_ocorrencia?.nome || 'Serviço Geral'}</h4><span class="priority-badge badge-${priorityClass}">${ticket.prioridade}</span></div>
            <div class="card-body"><p>${ticket.descricao}</p></div>
            <div class="card-footer"><span>${this.utils.formatDate(ticket.created_at)}</span><span>#${ticket.id ? ticket.id.substring(0, 8) : 'N/A'}...</span></div>`;
        card.addEventListener('click', () => this.openDetailModal(ticket.id));
        return card;
    },

    // ================================================
    // LÓGICA DO MODAL DE DETALHES E AÇÕES
    // ================================================
    openDetailModal(ticketId) {
        const ticket = this.state.tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        this.state.currentTicketId = ticketId;
        const modalBody = this.utils.getById('modal-ticket-body');
        const modalFooter = this.utils.getById('modal-ticket-footer');

        const attachmentsHtml = (type) => {
            const files = ticket.chamado_anexo.filter(a => a.tipo_anexo === type);
            return files.length > 0
                ? files.map(a => `<li class="attachment-item"><a href="${a.file_url}" target="_blank">${a.file_name || 'Ver anexo'}</a></li>`).join('')
                : '<li>Nenhum anexo.</li>';
        };

        modalBody.innerHTML = `
            <div class="detail-section">
                <h4 class="detail-title">Informações Gerais</h4>
                <div class="detail-grid">
                    <div class="detail-item"><span class="detail-label">Sistema:</span><span class="detail-value">${ticket.tipo_ocorrencia?.nome || 'N/A'}</span></div>
                    <div class="detail-item"><span class="detail-label">Fornecedor:</span><span class="detail-value">${ticket.fornecedor?.nome || 'Não definido'}</span></div>
                    <div class="detail-item"><span class="detail-label">Localização:</span><span class="detail-value">${ticket.localizacao}</span></div>
                    <div class="detail-item"><span class="detail-label">Prioridade:</span><span class="detail-value">${ticket.prioridade}</span></div>
                </div>
                <div class="detail-item"><span class="detail-label">Descrição Inicial:</span><div class="detail-value">${ticket.descricao}</div></div>
            </div>`;

        let footerHtml = '';
        switch (ticket.status) {
            case 'PENDENTE':
                modalBody.innerHTML += `<div class="detail-section"><h4 class="detail-title">Orçamentos</h4><ul class="attachment-list">${attachmentsHtml('proposta')}</ul></div>`;
                footerHtml = `
                    <div class="action-form">
                        <h4 class="detail-title">Ações Pendentes</h4>
                        <div class="form-group"><label>Valor da Proposta (R$)</label><input type="number" id="proposta-valor" step="0.01" placeholder="Ex: 150.50" value="${ticket.proposta_valor || ''}"></div>
                        <div class="form-group"><label>Anexar Orçamento</label><input type="file" id="proposta-anexo"></div>
                        <div class="action-buttons">
                            <button class="btn btn-danger" id="archive-btn">Arquivar Chamado</button>
                            <button class="btn btn-primary" id="continue-btn">Aprovar e Iniciar</button>
                        </div>
                    </div>`;
                break;
            case 'EM ANDAMENTO':
                modalBody.innerHTML += `<div class="detail-section"><h4 class="detail-title">Anexos Pré-Obra</h4><ul class="attachment-list">${attachmentsHtml('pre_obra')}</ul></div>`;
                footerHtml = `
                    <div class="action-form">
                        <h4 class="detail-title">Registrar Andamento</h4>
                        <div class="form-group"><label>Descrição da Situação Atual</label><textarea id="andamento-desc" rows="3" placeholder="Descreva a situação da obra...">${ticket.andamento_descricao || ''}</textarea></div>
                        <div class="form-group"><label>Fotos Pré-Obra</label><input type="file" id="pre-obra-anexo" multiple></div>
                        <div class="action-buttons">
                            <button class="btn btn-danger" id="archive-btn">Arquivar Chamado</button>
                            <button class="btn btn-primary" id="continue-btn">Finalizar Serviço</button>
                        </div>
                    </div>`;
                break;
            case 'CONCLUIDO':
                 modalBody.innerHTML += `<div class="detail-section"><h4 class="detail-title">Anexos de Finalização</h4><ul class="attachment-list">${attachmentsHtml('pos_obra')}</ul></div>`;
                 footerHtml = `
                    <div class="action-form">
                        <h4 class="detail-title">Finalização</h4>
                        <div class="form-group"><label>Descrição Pós-Obra / Relatório Final</label><textarea id="pos-obra-desc" rows="3" placeholder="Descreva o serviço realizado...">${ticket.conclusao_descricao || ''}</textarea></div>
                        <div class="form-group"><label>Situação da Obra</label><select id="conclusao-status"><option value="FINALIZADO">Finalizado</option><option value="CANCELADO">Cancelado</option></select></div>
                        <div class="form-group"><label>Anexar Nota Fiscal / Fotos Finais</label><input type="file" id="pos-obra-anexo" multiple></div>
                        <div class="action-buttons"><button class="btn btn-primary" id="continue-btn">Confirmar e Arquivar</button></div>
                    </div>`;
                break;
            case 'ARQUIVADO':
                modalBody.innerHTML += `<div class="detail-section"><h4 class="detail-title">Histórico de Anexos</h4><ul class="attachment-list">${ticket.chamado_anexo.map(a => `<li><a href="${a.file_url}" target="_blank">${a.file_name} (${a.tipo_anexo})</a></li>`).join('') || '<li>Nenhum anexo.</li>'}</ul></div>`;
                footerHtml = `<p class="status-message">Este chamado está arquivado.</p>`;
                break;
        }
        modalFooter.innerHTML = footerHtml;

        this.addFooterEventListeners(ticket);
        this.utils.toggleModal(true);
    },
    
    addFooterEventListeners(ticket) {
        const archiveBtn = this.utils.getById('archive-btn');
        const continueBtn = this.utils.getById('continue-btn');

        if (archiveBtn) archiveBtn.addEventListener('click', () => this.updateTicketStatus(ticket.id, 'ARQUIVADO'));
        if (continueBtn) {
            const handler = this.statusHandlers[ticket.status];
            if (handler) continueBtn.addEventListener('click', () => handler.call(this, ticket.id));
        }
    },
    
    statusHandlers: {
        'PENDENTE': async function(ticketId) {
            const proposta_valor = this.utils.getById('proposta-valor').value;
            const fileInput = this.utils.getById('proposta-anexo');
            await this.uploadFile(fileInput.files[0], ticketId, 'proposta');
            await this.updateTicketStatus(ticketId, 'EM ANDAMENTO', { proposta_valor: proposta_valor || null });
        },
        'EM ANDAMENTO': async function(ticketId) {
            const andamento_descricao = this.utils.getById('andamento-desc').value;
            const fileInput = this.utils.getById('pre-obra-anexo');
            for (const file of fileInput.files) await this.uploadFile(file, ticketId, 'pre_obra');
            await this.updateTicketStatus(ticketId, 'CONCLUIDO', { andamento_descricao });
        },
        'CONCLUIDO': async function(ticketId) {
            const conclusao_descricao = this.utils.getById('pos-obra-desc').value;
            const conclusao_status = this.utils.getById('conclusao-status').value;
            const fileInput = this.utils.getById('pos-obra-anexo');
            for (const file of fileInput.files) await this.uploadFile(file, ticketId, 'pos_obra');
            await this.updateTicketStatus(ticketId, 'ARQUIVADO', { conclusao_descricao, conclusao_status, completed_at: new Date().toISOString() });
        }
    },

    async updateTicketStatus(ticketId, newStatus, additionalData = {}) {
        const { error } = await supabase.from('chamado').update({ status: newStatus, ...additionalData }).eq('id', ticketId);
        if (error) {
            console.error("Erro ao atualizar status:", error);
            alert("Falha ao atualizar o chamado.");
        } else {
            this.utils.toggleModal(false);
            await this.fetchAndRenderTickets();
        }
    },

    async uploadFile(file, ticketId, fileType) {
        if (!file) return;
        const filePath = `${this.state.condoId}/${ticketId}/${fileType}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('chamado-anexos').upload(filePath, file);
        if (uploadError) {
            console.error('Erro no upload:', uploadError);
            alert(`Falha ao enviar o anexo: ${uploadError.message}`);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('chamado-anexos').getPublicUrl(filePath);
        const { error: insertError } = await supabase.from('chamado_anexo').insert({
            chamado_id: ticketId, tipo_anexo: fileType, file_url: publicUrl, file_name: file.name
        });
        if(insertError) console.error("Erro ao salvar anexo no banco:", insertError);
    },

    async generateReport() {
        const archivedTickets = this.state.tickets.filter(t => t.status === 'ARQUIVADO');
        if (archivedTickets.length === 0) {
            alert("Não há chamados arquivados para gerar um relatório.");
            return;
        }
        
        alert("Gerando relatório... Isso pode levar alguns segundos.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 15;

        doc.setFontSize(18);
        doc.text(`Relatório de Chamados Arquivados`, 14, y);
        y += 10;

        archivedTickets.forEach((ticket, index) => {
            if (y > 270) { doc.addPage(); y = 15; }
            doc.setFontSize(14);
            doc.text(`${index + 1}. Chamado #${ticket.id.substring(0,8)} - ${ticket.tipo_ocorrencia?.nome || 'Geral'}`, 14, y);
            y += 7;
            doc.setFontSize(10);
            doc.text(`Status: ${ticket.conclusao_status || ticket.status}`, 14, y); y+=5;
            doc.text(`Localização: ${ticket.localizacao}`, 14, y); y+=5;
            doc.text(`Fornecedor: ${ticket.fornecedor?.nome || 'N/A'}`, 14, y); y+=5;
            doc.text(`Data de Conclusão: ${this.utils.formatDate(ticket.completed_at)}`, 14, y); y+=5;
            doc.setFontSize(12);
            doc.text(`Descrição Final:`, 14, y); y+=5;
            doc.setFontSize(10);
            const descLines = doc.splitTextToSize(ticket.conclusao_descricao || ticket.descricao || 'Sem descrição final.', 180);
            doc.text(descLines, 14, y);
            y += (descLines.length * 4) + 5;
            doc.line(14, y, 196, y); y+= 5;
        });

        doc.save(`relatorio_chamados_arquivados_${Date.now()}.pdf`);
    }
};

// Ponto de entrada do script
document.addEventListener('DOMContentLoaded', () => {
    ChamadosPage.init();
});
