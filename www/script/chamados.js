// www/script/chamados.js - v5 (LocalForage & New Attachment Fields)

document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos DOM ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const listContainers = {
        pendente: document.getElementById('pendente-list'),
        andamento: document.getElementById('andamento-list'),
        concluido: document.getElementById('concluido-list'),
        arquivado: document.getElementById('arquivado-list')
    };

    let allTickets = [];

    // --- Funções Utilitárias ---
    function formatDate(dateInput) {
        if (!dateInput) return 'N/A';
        try {
            const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
            if (isNaN(date.getTime())) return 'Data inválida';
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'}) + ' ' +
                   date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return 'Erro data'; }
    }

    function getOccurrenceName(key) {
        const names = { /* ... (mantido como antes) ... */
            'Hidraulica': 'Hidráulica', 'Eletrica': 'Elétrica', 'Elevador': 'Elevador',
            'Gerador': 'Gerador', 'Pintura': 'Pintura', 'Alvenaria': 'Alvenaria / Estrutura',
            'Jardinagem': 'Jardinagem / Paisagismo', 'Limpeza': 'Limpeza Específica',
            'Seguranca': 'Segurança', 'ArCondicionado': 'Ar Condicionado Central',
            'Pragas': 'Controle de Pragas', 'Telecom': 'Telecomunicações',
            'Incendio': 'Sistema de Incêndio', 'Gas': 'Sistema de Gás',
            'Outros': 'Geral / Outros'
        };
        return names[key] || key;
    }

    function formatPhone(phone) {
        if (!phone) return "N/A";
        const cleaned = ('' + phone).replace(/\D/g, '');
        if (!cleaned) return "N/A";
         if (cleaned.startsWith('55') && cleaned.length >= 12) {
             const ddd = cleaned.substring(2, 4);
             const numberPart = cleaned.substring(4);
             if (numberPart.length === 9) return `+55 (${ddd}) ${numberPart.substring(0, 5)}-${numberPart.substring(5)}`;
             if (numberPart.length === 8) return `+55 (${ddd}) ${numberPart.substring(0, 4)}-${numberPart.substring(4)}`;
         }
         if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
         if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        return phone;
    }

    function readFileData(file) {
        return new Promise((resolve, reject) => {
            if (!file || !(file.type.startsWith('image/') || file.type === 'application/pdf')) {
                resolve(null); return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name, type: file.type, size: file.size, dataUrl: reader.result
            });
            reader.onerror = (error) => { console.error("FileReader error:", error); reject(error); };
            reader.readAsDataURL(file);
        });
    }

    /** Renders a preview for a file object (image or PDF link) */
    function renderFilePreview(fileObject, previewAreaElement) {
        if (!fileObject || !fileObject.dataUrl || !previewAreaElement) {
            if (previewAreaElement) previewAreaElement.innerHTML = '<p>Nenhum anexo.</p>';
            return;
        }
        previewAreaElement.classList.add('visible');
        if (fileObject.type.startsWith('image/')) {
            previewAreaElement.innerHTML = `<img src="${fileObject.dataUrl}" alt="Pré-visualização" title="${fileObject.name}">`;
        } else if (fileObject.type === 'application/pdf') {
            previewAreaElement.innerHTML = `<a href="${fileObject.dataUrl}" target="_blank" title="Abrir PDF: ${fileObject.name}"><i class="material-icons">picture_as_pdf</i> Ver ${fileObject.name}</a>`;
        } else {
            previewAreaElement.innerHTML = `<p title="${fileObject.name}"><i class="material-icons">attach_file</i> Anexo: ${fileObject.name}</p>`;
        }
    }

    // --- Funções de Lógica de Negócio (Async devido ao localForage) ---
    async function loadAndInitializeTickets() {
        if (typeof loadTickets !== 'function' || typeof saveTickets !== 'function') {
            console.error("ERRO CRÍTICO: Funções loadTickets/saveTickets não encontradas (dados.js).");
            alert("Erro crítico ao carregar funções de dados. A página pode não funcionar corretamente.");
            return;
        }

        allTickets = await loadTickets(); // Usa o loadTickets assíncrono
        console.log("Chamados carregados do localForage:", allTickets.length);

        const newTicketJSON = sessionStorage.getItem('newTicketData');
        if (newTicketJSON) {
            try {
                const newTicketData = JSON.parse(newTicketJSON);
                const newId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const ticketToAdd = {
                    ...newTicketData, id: newId,
                    createdAt: newTicketData.createdAt ? new Date(newTicketData.createdAt) : new Date(),
                    proposalAttachment: null, beforeServicePhoto: null, afterServicePhoto: null,
                    technicalDocumentation: null, serviceOrderPhoto: null // Init new fields
                };
                allTickets.push(ticketToAdd);
                console.log("Novo chamado adicionado via sessionStorage:", ticketToAdd);
                await saveTickets(allTickets); // Salva com await
                sessionStorage.removeItem('newTicketData');
            } catch (e) {
                console.error("Erro ao processar dados do novo chamado:", e);
                sessionStorage.removeItem('newTicketData');
            }
        }
        renderAllTickets();
        await checkAndArchiveConcludedTickets();
    }

    function findTicketIndex(ticketId) {
        return allTickets.findIndex(t => t.id === ticketId);
    }

    async function moveTicketStatus(ticketId, newStatus, extraData = {}) {
        const index = findTicketIndex(ticketId);
        if (index > -1) {
            allTickets[index].status = newStatus;
            Object.assign(allTickets[index], extraData);
            if (newStatus === 'Concluido' && !allTickets[index].completedAt) {
                allTickets[index].completedAt = new Date();
            }
            if (newStatus === 'Arquivado' && !allTickets[index].archivedAt) {
                allTickets[index].archivedAt = new Date();
            }
            await saveTickets(allTickets);
            renderAllTickets();
        } else {
            console.error(`Chamado ${ticketId} não encontrado para mover.`);
        }
    }

    async function saveProposalValue(ticketId, value) {
        const index = findTicketIndex(ticketId);
        if (index === -1) return;
        const numValue = (value === '' || value === null || isNaN(parseFloat(value))) ? null : parseFloat(value);
        if (allTickets[index].proposalValue !== numValue) {
            allTickets[index].proposalValue = numValue;
            await saveTickets(allTickets);
        }
    }

    async function handleAttachment(ticketId, file, fieldName, previewAreaElement) {
        if (!file) return;
        const index = findTicketIndex(ticketId);
        if (index === -1) { alert("Erro: Chamado não encontrado para anexar."); return; }

        previewAreaElement.innerHTML = '<p>Carregando anexo...</p>';
        previewAreaElement.classList.add('visible');

        try {
            const fileData = await readFileData(file);
            if (!fileData) {
                alert("Arquivo inválido. Selecione uma imagem ou PDF.");
                previewAreaElement.innerHTML = `<p>Falha. Selecione imagem ou PDF.</p>`;
                return;
            }
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (fileData.size > maxSize) {
                alert(`Arquivo muito grande (${(fileData.size / (1024*1024)).toFixed(1)}MB). Limite: 5MB.`);
                previewAreaElement.innerHTML = `<p>Arquivo grande (Max: 5MB).</p>`;
                return;
            }
            allTickets[index][fieldName] = fileData;
            await saveTickets(allTickets);
            renderFilePreview(fileData, previewAreaElement);
            alert("Anexo salvo com sucesso!");
        } catch (e) {
            console.error(`Erro ao manusear anexo para ${fieldName}:`, e);
            alert("Ocorreu um erro ao processar o anexo.");
            const previousAttachment = allTickets[index][fieldName];
            renderFilePreview(previousAttachment, previewAreaElement); // Reverte para o anterior se houver
        }
    }

    async function handleCompleteOrCancelWork(ticketId) {
        const cardElement = document.querySelector(`.ticket-card[data-ticket-id="${ticketId}"]`);
        if (!cardElement) return;
        const selectedOption = cardElement.querySelector(`input[name="completion-${ticketId}"]:checked`);
        if (!selectedOption) { alert("Selecione 'Obra concluída' ou 'Obra cancelada'."); return; }
        const status = selectedOption.value;
        const descriptionId = `completion-desc-${ticketId}-${status}`;
        const description = cardElement.querySelector(`#${descriptionId}`)?.value.trim() || '';
        if (!description) { alert(`Adicione uma descrição para '${selectedOption.nextElementSibling.textContent}'.`); return; }

        const updateData = {
            completionStatus: status, completionDescription: description,
            completedAt: status === 'concluida' ? new Date() : null,
            archivedReason: status === 'cancelada' ? 'Obra Cancelada' : null
        };
        await moveTicketStatus(ticketId, status === 'concluida' ? 'Concluido' : 'Arquivado', updateData);
    }

    async function handleDirectCancelTicket(ticketId, originStatus = 'Desconhecido') {
         if (confirm(`Tem certeza que deseja CANCELAR este chamado?\nID: ${ticketId}\nOrigem: ${originStatus}`)) {
             const updateData = {
                 archivedReason: `Cancelado pelo Usuário (Status: ${originStatus})`,
                 completionStatus: null, completionDescription: null, completedAt: null
             };
             await moveTicketStatus(ticketId, 'Arquivado', updateData);
         }
    }

    async function saveFinalDescription(ticketId, description) {
        const index = findTicketIndex(ticketId);
        if (index === -1) return;
        const trimmedDesc = description.trim();
        const currentValue = allTickets[index].finalDescription || null;
        const newValue = trimmedDesc === '' ? null : trimmedDesc;
        if (currentValue !== newValue) {
            allTickets[index].finalDescription = newValue;
            await saveTickets(allTickets);
        }
    }

    async function checkAndArchiveConcludedTickets() {
        const now = new Date();
        let changed = false;
        const ARCHIVE_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

        allTickets.forEach((ticket, index) => {
            if (ticket.status === 'Concluido' && ticket.completionStatus === 'concluida' && ticket.completedAt) {
                const completedDate = new Date(ticket.completedAt);
                if (!isNaN(completedDate.getTime()) && (now.getTime() > (completedDate.getTime() + ARCHIVE_DELAY_MS))) {
                    allTickets[index].status = 'Arquivado';
                    allTickets[index].archivedAt = new Date();
                    allTickets[index].archivedReason = 'Finalizado (Arquivamento Automático)';
                    changed = true;
                }
            }
        });
        if (changed) {
            await saveTickets(allTickets);
            renderAllTickets();
        }
        return changed;
    }

    // --- Funções de Renderização ---
    function createTicketCard(ticket) {
        const card = document.createElement('div');
        card.className = 'ticket-card';
        card.dataset.ticketId = ticket.id;

        let basicInfoHtml = `
            <div class="ticket-header">
                <span class="ticket-occurrence">${getOccurrenceName(ticket.occurrence)}</span>
                <span class="ticket-priority ${ticket.priority}">${ticket.priority}</span>
            </div>
            <div class="ticket-info"><i class="material-icons">business</i> <span>${ticket.condoName || 'N/A'}</span></div>
            <div class="ticket-info"><i class="material-icons">location_on</i> <span>${ticket.location || 'N/A'}</span></div>
            <div class="ticket-info"><i class="material-icons">description</i> <span>${ticket.description || 'N/A'}</span></div>
            <div class="ticket-info"><i class="material-icons">event</i> <span>Criado: ${formatDate(ticket.createdAt)}</span></div>`;

        let supplierInfoHtml = `<div class="supplier-info">
            <p><strong>Fornecedor:</strong> ${ticket.supplierName || 'Não selecionado'}</p>
            ${ticket.supplierId && ticket.supplierPhone ? `<p><strong>Contato:</strong> ${formatPhone(ticket.supplierPhone)}</p>` : ''}
            </div>`;

        let stageContentHtml = '';
        let actionsHtml = '';

        switch (ticket.status) {
            case 'Pendente':
                stageContentHtml = `
                    <div class="input-section">
                        <label for="proposal-value-${ticket.id}">Valor Proposta R$ (Opcional):</label>
                        <input type="number" id="proposal-value-${ticket.id}" class="proposal-input" step="0.01" min="0" placeholder="0.00" value="${ticket.proposalValue === null || ticket.proposalValue === undefined ? '' : ticket.proposalValue.toFixed(2)}">
                    </div>
                    <div class="input-section attachment-section">
                        <label for="proposal-file-${ticket.id}">Anexar Proposta:</label>
                        <input type="file" id="proposal-file-${ticket.id}" class="proposal-attachment-input" accept="image/*,application/pdf">
                        <div class="proposal-attachment-preview service-order-preview ${ticket.proposalAttachment ? 'visible' : ''}">
                            </div>
                    </div>`;
                actionsHtml = `
                    <button class="btn btn-danger cancel-direct-btn" title="Cancelar Chamado"><i class="material-icons">cancel</i> Cancelar</button>
                    <button class="btn btn-primary start-btn" title="Iniciar Atendimento"><i class="material-icons">play_arrow</i> Iniciar Atendimento</button>`;
                break;

            case 'Em Andamento':
                const isConcluidaChecked = ticket.completionStatus === 'concluida';
                const isCanceladaChecked = ticket.completionStatus === 'cancelada';
                stageContentHtml = `
                    <div class="input-section">
                        <label>Status da Obra:</label>
                        <div class="completion-options">
                            <div>
                                <input type="radio" id="comp-concluida-${ticket.id}" name="completion-${ticket.id}" value="concluida" ${isConcluidaChecked ? 'checked' : ''}>
                                <label for="comp-concluida-${ticket.id}">Obra já concluída</label>
                                <textarea id="completion-desc-${ticket.id}-concluida" class="completion-description ${!isConcluidaChecked ? 'hidden' : ''}" placeholder="Descrição da conclusão...">${isConcluidaChecked ? (ticket.completionDescription || '') : ''}</textarea>
                            </div>
                            <div>
                                <input type="radio" id="comp-cancelada-${ticket.id}" name="completion-${ticket.id}" value="cancelada" ${isCanceladaChecked ? 'checked' : ''}>
                                <label for="comp-cancelada-${ticket.id}">Obra cancelada</label>
                                <textarea id="completion-desc-${ticket.id}-cancelada" class="completion-description ${!isCanceladaChecked ? 'hidden' : ''}" placeholder="Motivo do cancelamento...">${isCanceladaChecked ? (ticket.completionDescription || '') : ''}</textarea>
                            </div>
                        </div>
                    </div>`;
                actionsHtml = `
                     <button class="btn btn-danger cancel-direct-btn" title="Cancelar Chamado Diretamente"><i class="material-icons">cancel</i> Cancelar</button>
                     <button class="btn btn-success finish-step-btn" title="Finalizar Etapa Atual" ${!(isConcluidaChecked || isCanceladaChecked) ? 'disabled' : ''}><i class="material-icons">check_circle</i> Finalizar Etapa</button>`;
                break;

            case 'Concluido':
                stageContentHtml = `
                    <div class="ticket-info"><i class="material-icons">task_alt</i> <span>Concluído em: ${formatDate(ticket.completedAt)}</span></div>
                    ${ticket.completionDescription ? `<div class="ticket-info"><p><strong>Descrição da Conclusão:</strong> ${ticket.completionDescription}</p></div>` : ''}
                    <div class="input-section attachment-section">
                        <label for="before-service-photo-${ticket.id}">Foto Pré-Serviço:</label>
                        <input type="file" id="before-service-photo-${ticket.id}" class="before-service-photo-input" accept="image/*">
                        <div class="before-service-photo-preview service-order-preview ${ticket.beforeServicePhoto ? 'visible' : ''}"></div>

                        <label for="after-service-photo-${ticket.id}">Foto Pós-Serviço:</label>
                        <input type="file" id="after-service-photo-${ticket.id}" class="after-service-photo-input" accept="image/*">
                        <div class="after-service-photo-preview service-order-preview ${ticket.afterServicePhoto ? 'visible' : ''}"></div>

                        <label for="tech-doc-${ticket.id}">Documentação Técnica:</label>
                        <input type="file" id="tech-doc-${ticket.id}" class="tech-doc-input" accept="application/pdf">
                        <div class="tech-doc-preview service-order-preview ${ticket.technicalDocumentation ? 'visible' : ''}"></div>
                        
                        <label for="os-${ticket.id}">Ordem de Serviço:</label>
                        <input type="file" id="os-${ticket.id}" class="service-order-input" accept="image/*,application/pdf">
                        <div class="service-order-preview os-file-preview ${ticket.serviceOrderPhoto ? 'visible' : ''}"></div>
                        
                        <label for="final-desc-${ticket.id}">Descrição Final (Opcional):</label>
                        <textarea id="final-desc-${ticket.id}" class="final-description-input" placeholder="Adicione notas finais...">${ticket.finalDescription || ''}</textarea>
                    </div>`;
                if (ticket.completedAt) {
                    const archiveDate = new Date(new Date(ticket.completedAt).getTime() + 3 * 24 * 60 * 60 * 1000);
                    actionsHtml = `<div class="auto-archive-info">Arquivamento automático: ${formatDate(archiveDate)}</div>`;
                }
                break;

            case 'Arquivado':
                let archivedDetailsHtml = `<div class="archived-reason"><i class="material-icons">inventory_2</i><span>Arquivado em: ${formatDate(ticket.archivedAt)}</span></div>`;
                if (ticket.archivedReason) archivedDetailsHtml += `<div class="ticket-info"><p><strong>Motivo:</strong> ${ticket.archivedReason}</p></div>`;
                if (ticket.proposalValue) archivedDetailsHtml += `<div class="ticket-info"><p><strong>Valor Proposta:</strong> R$ ${ticket.proposalValue.toFixed(2)}</p></div>`;
                if (ticket.proposalAttachment) {
                    archivedDetailsHtml += `<div class="ticket-info attachment-display"><strong>Proposta Anexada:</strong> <span class="attachment-preview-archived" data-type="proposalAttachment"></span></div>`;
                }
                if (ticket.completionDescription) {
                    archivedDetailsHtml += `<div class="ticket-info"><p><strong>Detalhes ${ticket.completionStatus === 'cancelada' ? 'Cancelamento' : 'Conclusão'}:</strong> ${ticket.completionDescription}</p></div>`;
                }
                if (ticket.beforeServicePhoto) {
                    archivedDetailsHtml += `<div class="ticket-info attachment-display"><strong>Foto Pré-Serviço:</strong> <span class="attachment-preview-archived" data-type="beforeServicePhoto"></span></div>`;
                }
                if (ticket.afterServicePhoto) {
                    archivedDetailsHtml += `<div class="ticket-info attachment-display"><strong>Foto Pós-Serviço:</strong> <span class="attachment-preview-archived" data-type="afterServicePhoto"></span></div>`;
                }
                if (ticket.technicalDocumentation) {
                    archivedDetailsHtml += `<div class="ticket-info attachment-display"><strong>Doc. Técnica:</strong> <span class="attachment-preview-archived" data-type="technicalDocumentation"></span></div>`;
                }
                if (ticket.serviceOrderPhoto) {
                    archivedDetailsHtml += `<div class="ticket-info attachment-display"><strong>Ordem de Serviço:</strong> <span class="attachment-preview-archived" data-type="serviceOrderPhoto"></span></div>`;
                }
                if (ticket.finalDescription) archivedDetailsHtml += `<div class="ticket-info"><p><strong>Descrição Final:</strong> ${ticket.finalDescription}</p></div>`;
                stageContentHtml = archivedDetailsHtml;
                break;
            default:
                stageContentHtml = `<p style="color: red;">Erro: Status desconhecido (${ticket.status})</p>`;
        }

        card.innerHTML = basicInfoHtml + supplierInfoHtml + stageContentHtml + `<div class="ticket-actions">${actionsHtml}</div>`;
        addCardEventListeners(card, ticket); // Adiciona listeners e preenche previews
        return card;
    }

    function addCardEventListeners(card, ticket) {
        const ticketId = ticket.id;

        if (ticket.status === 'Pendente') {
            card.querySelector(`#proposal-value-${ticketId}`)?.addEventListener('blur', (e) => saveProposalValue(ticketId, e.target.value));
            const proposalFileInput = card.querySelector(`#proposal-file-${ticketId}`);
            const proposalPreviewArea = card.querySelector('.proposal-attachment-preview');
            if (proposalFileInput && proposalPreviewArea) {
                proposalFileInput.addEventListener('change', (e) => {
                    if (e.target.files && e.target.files[0]) {
                        handleAttachment(ticketId, e.target.files[0], 'proposalAttachment', proposalPreviewArea);
                    }
                });
                if (ticket.proposalAttachment) renderFilePreview(ticket.proposalAttachment, proposalPreviewArea);
            }
            card.querySelector('.start-btn')?.addEventListener('click', () => moveTicketStatus(ticketId, 'Em Andamento'));
            card.querySelector('.cancel-direct-btn')?.addEventListener('click', () => handleDirectCancelTicket(ticketId, 'Pendente'));
        } else if (ticket.status === 'Em Andamento') {
            const radioButtons = card.querySelectorAll(`input[name="completion-${ticketId}"]`);
            const finishStepBtn = card.querySelector('.finish-step-btn');
            radioButtons.forEach(radio => {
                radio.addEventListener('change', (e) => {
                    const isConcluida = e.target.value === 'concluida' && e.target.checked;
                    const isCancelada = e.target.value === 'cancelada' && e.target.checked;
                    card.querySelector(`#completion-desc-${ticketId}-concluida`)?.classList.toggle('hidden', !isConcluida);
                    card.querySelector(`#completion-desc-${ticketId}-cancelada`)?.classList.toggle('hidden', !isCancelada);
                    if(finishStepBtn) finishStepBtn.disabled = !(isConcluida || isCancelada);
                });
            });
            finishStepBtn?.addEventListener('click', () => handleCompleteOrCancelWork(ticketId));
            card.querySelector('.cancel-direct-btn')?.addEventListener('click', () => handleDirectCancelTicket(ticketId, 'Em Andamento'));
        } else if (ticket.status === 'Concluido') {
            // Foto Pré-Serviço
            const beforePhotoInput = card.querySelector(`#before-service-photo-${ticketId}`);
            const beforePhotoPreview = card.querySelector('.before-service-photo-preview');
            if(beforePhotoInput && beforePhotoPreview) {
                beforePhotoInput.addEventListener('change', (e) => e.target.files && e.target.files[0] && handleAttachment(ticketId, e.target.files[0], 'beforeServicePhoto', beforePhotoPreview));
                if(ticket.beforeServicePhoto) renderFilePreview(ticket.beforeServicePhoto, beforePhotoPreview);
            }
            // Foto Pós-Serviço
            const afterPhotoInput = card.querySelector(`#after-service-photo-${ticketId}`);
            const afterPhotoPreview = card.querySelector('.after-service-photo-preview');
            if(afterPhotoInput && afterPhotoPreview) {
                afterPhotoInput.addEventListener('change', (e) => e.target.files && e.target.files[0] && handleAttachment(ticketId, e.target.files[0], 'afterServicePhoto', afterPhotoPreview));
                if(ticket.afterServicePhoto) renderFilePreview(ticket.afterServicePhoto, afterPhotoPreview);
            }
            // Documentação Técnica
            const techDocInput = card.querySelector(`#tech-doc-${ticketId}`);
            const techDocPreview = card.querySelector('.tech-doc-preview');
            if(techDocInput && techDocPreview) {
                techDocInput.addEventListener('change', (e) => e.target.files && e.target.files[0] && handleAttachment(ticketId, e.target.files[0], 'technicalDocumentation', techDocPreview));
                if(ticket.technicalDocumentation) renderFilePreview(ticket.technicalDocumentation, techDocPreview);
            }
            // Ordem de Serviço (existente, mas garantindo consistência)
            const osInput = card.querySelector(`#os-${ticketId}`);
            const osPreview = card.querySelector('.os-file-preview');
            if (osInput && osPreview) {
                 osInput.addEventListener('change', (e) => e.target.files && e.target.files[0] && handleAttachment(ticketId, e.target.files[0], 'serviceOrderPhoto', osPreview));
                 if(ticket.serviceOrderPhoto) renderFilePreview(ticket.serviceOrderPhoto, osPreview);
            }
            card.querySelector(`#final-desc-${ticketId}`)?.addEventListener('blur', (e) => saveFinalDescription(ticketId, e.target.value));
        } else if (ticket.status === 'Arquivado') {
            card.querySelectorAll('.attachment-preview-archived').forEach(span => {
                const fieldName = span.dataset.type;
                if (ticket[fieldName]) {
                    renderFilePreview(ticket[fieldName], span);
                } else {
                    span.innerHTML = "<span>N/A</span>";
                }
            });
        }
    }

    function renderAllTickets() {
        Object.values(listContainers).forEach(container => { if(container) container.innerHTML = ''; });
        const fragments = { pendente: document.createDocumentFragment(), andamento: document.createDocumentFragment(), concluido: document.createDocumentFragment(), arquivado: document.createDocumentFragment() };
        let counts = { Pendente: 0, 'Em Andamento': 0, Concluido: 0, Arquivado: 0 };

        allTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        allTickets.forEach(ticket => {
            const card = createTicketCard(ticket);
            let targetFragment, countKey = ticket.status;
            switch(ticket.status) {
                case 'Pendente': targetFragment = fragments.pendente; break;
                case 'Em Andamento': targetFragment = fragments.andamento; break;
                case 'Concluido': targetFragment = fragments.concluido; break;
                case 'Arquivado': targetFragment = fragments.arquivado; break;
                default: return;
            }
            if (targetFragment) {
                targetFragment.appendChild(card);
                if (counts.hasOwnProperty(countKey)) counts[countKey]++;
            }
        });

        for (const statusKey in fragments) {
            const container = listContainers[statusKey];
            let countKeyMapped = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
            if (statusKey === 'andamento') countKeyMapped = 'Em Andamento';
            const count = counts[countKeyMapped] || 0;

            if (container) {
                if (count > 0) {
                    container.appendChild(fragments[statusKey]);
                } else {
                    let statusDisplayName = statusKey === 'andamento' ? 'em andamento' : (statusKey === 'concluido' ? 'concluídos' : (statusKey === 'arquivado' ? 'arquivados' : statusKey));
                    container.innerHTML = `<div class="status-message">Nenhum chamado ${statusDisplayName}.</div>`;
                }
            }
        }
        updateTabCounts(counts);
    }

    function updateTabCounts(counts) { /* ... (mantido como antes) ... */
        tabButtons.forEach(button => {
            const tabKey = button.dataset.tab;
            let countKey = tabKey.charAt(0).toUpperCase() + tabKey.slice(1);
            if (tabKey === 'andamento') countKey = 'Em Andamento';

            const count = counts[countKey] || 0;
            const countSpan = button.querySelector('.tab-count');
            if (countSpan) {
                 countSpan.textContent = count > 0 ? `(${count})` : '';
            }
        });
    }

    // --- Configuração Inicial de Event Listeners ---
    tabButtons.forEach(button => { /* ... (mantido como antes) ... */
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            const targetPane = document.getElementById(`${targetTab}-list`);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // --- Inicialização Async ---
    async function initializePage() {
        console.log("Inicializando página de chamados (v5)...");
        await loadAndInitializeTickets(); // Função agora é async
        // Inicia verificação periódica para arquivamento automático
        const archiveCheckInterval = setInterval(async () => {
            await checkAndArchiveConcludedTickets(); // Também async
        }, 5 * 60 * 1000);

        window.addEventListener('beforeunload', () => {
            clearInterval(archiveCheckInterval);
        });
    }

    initializePage().catch(error => {
        console.error("Erro durante a inicialização da página de chamados:", error);
        alert("Ocorreu um erro grave ao carregar a página de chamados. Verifique o console.");
    });

}); // Fim DOMContentLoaded