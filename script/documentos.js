// www/script/documentos.js

import { supabase } from './supabaseClient.js';
const { Camera, Browser } = window.Capacitor?.Plugins ?? {};

document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO GLOBAL E ELEMENTOS DO DOM ---
    let selectedCondoId = sessionStorage.getItem('selectedCondoId');
    let currentFolderForUpload = null;
    let currentFileForDownload = { url: null, name: null };
    let pdfDoc = null, pageNum = 1;

    const pageTemplate = document.getElementById('page-template');
    const fileSourceModal = document.getElementById('file-source-modal');
    const hiddenFileInput = document.getElementById('hidden-file-input');
    const historyModal = document.getElementById('history-modal');

    // --- VERIFICAÇÃO INICIAL ---
    if (!selectedCondoId) {
        alert("Nenhum condomínio selecionado. Redirecionando...");
        window.location.href = '../inicio.html';
        return;
    }

    // --- LÓGICA DE DADOS (SUPABASE) ---
    const Db = {
        getFolders: async () => {
            const { data, error } = await supabase.from('documento_pasta')
                .select('*, documento_versao(*)').eq('condominio_id', selectedCondoId).order('nome');
            if (error) throw error;
            return data;
        },
        createFolder: async (name, category) => {
            const { error } = await supabase.rpc('create_document_folder', {
                p_condo_id: selectedCondoId, p_nome: name, p_categoria: category
            });
            if (error) throw error;
        },
        deleteFolder: async (folderId) => {
            const { error } = await supabase.rpc('delete_document_folder', { p_pasta_id: folderId });
            if (error) throw error;
        },
        saveDocument: async ({ folder, file, dates }) => {
            const filePath = `${selectedCondoId}/${folder.id}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('docs').upload(filePath, file);
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('docs').getPublicUrl(filePath);
            if (!urlData.publicUrl) throw new Error("Não foi possível obter a URL pública do arquivo.");
            await Db.createNewVersion({ folder, file, dates, url: urlData.publicUrl });
        },
        updateDatesOnly: async ({ folder, currentDocument, dates }) => {
            await Db.createNewVersion({
                folder,
                file: { name: currentDocument.file_name },
                dates,
                url: currentDocument.file_url
            });
        },
        createNewVersion: async ({ folder, file, dates, url }) => {
            const { error: rpcError } = await supabase.rpc('create_new_document_version', {
                p_pasta_id: folder.id, p_file_url: url, p_file_name: file.name,
                p_start_date: dates.start, p_end_date: dates.end
            });
            if (rpcError) throw rpcError;
        },
        getHistory: async (folderId) => {
            // A função RPC foi atualizada no SQL para lidar com ambos os casos
            const { data, error } = await supabase.rpc('get_document_history', { p_pasta_id: folderId });
            if (error) throw error;
            return data;
        },
         getGeneralHistory: async () => {
            // Criamos uma nova RPC para o relatório geral
            const { data, error } = await supabase.rpc('get_document_history_for_condo', { p_condo_id: selectedCondoId });
            if (error) throw error;
            return data;
        }
    };

    // --- LÓGICA DE UI E MANIPULAÇÃO DO DOM ---
    const UI = {
        async loadAndDisplay() {
            try {
                const folders = await Db.getFolders();
                const expiringContainer = document.getElementById('pages-container-expiring');
                const nonExpiringContainer = document.getElementById('pages-container-non-expiring');
                expiringContainer.innerHTML = '';
                nonExpiringContainer.innerHTML = '';
                folders.forEach(folder => {
                    const pageElement = UI.createPageElement(folder);
                    const container = folder.categoria === 'expiring' ? expiringContainer : nonExpiringContainer;
                    container.appendChild(pageElement);
                });
                UI.checkEmptyContainers();
            } catch (error) {
                console.error("Erro ao carregar e exibir os dados:", error);
            }
        },
        async handleAddFolder(folderName, category, buttonElement) {
            buttonElement.disabled = true;
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = '<i class="material-icons spin">sync</i> Criando...';
            try {
                await Db.createFolder(folderName, category);
                await UI.loadAndDisplay();
            } catch (error) {
                alert(`Não foi possível criar a pasta.\nErro: ${error.message}`);
            } finally {
                buttonElement.disabled = false;
                buttonElement.innerHTML = '<i class="material-icons">create_new_folder</i> Criar Pasta';
            }
        },
        async handleDeleteFolder(folderData) {
            if (confirm(`Tem certeza que deseja excluir a pasta "${folderData.nome}"?`)) {
                try {
                    await Db.deleteFolder(folderData.id);
                    await UI.loadAndDisplay();
                } catch (error) { console.error("Erro ao excluir pasta:", error); }
            }
        },
        async handleSave(folderData, pageItemContainer) {
            const saveBtn = pageItemContainer.querySelector('.save-doc-btn');
            const fileToUpload = pageItemContainer.fileToUpload;
            const dates = {
                start: pageItemContainer.querySelector('.start-date').value || null,
                end: folderData.categoria === "expiring" ? (pageItemContainer.querySelector('.end-date').value || null) : null
            };
            if (folderData.categoria === 'expiring' && (fileToUpload || !saveBtn.disabled)) {
                if (!dates.start || !dates.end) { return alert("Para documentos com vencimento, as datas de Expedição e Validade são obrigatórias."); }
                if (new Date(dates.end) < new Date(dates.start)) { return alert("A Data de Validade não pode ser anterior à Data de Expedição."); }
            }
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="material-icons spin">sync</i> Salvando...';
            try {
                if (fileToUpload) {
                    await Db.saveDocument({ folder: folderData, file: fileToUpload, dates });
                } else {
                     const versions = (folderData.documento_versao || []).sort((a,b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
                     const currentDocument = versions[0];
                     if(!currentDocument) throw new Error("Documento de referência não encontrado.");
                     await Db.updateDatesOnly({ folder: folderData, currentDocument, dates });
                }
                alert("Salvo com sucesso!");
                await UI.loadAndDisplay();
            } catch (error) {
                alert(`Falha ao salvar: ${error.message}`);
            } finally {
                saveBtn.innerHTML = '<i class="material-icons">save</i> Salvar Alterações';
            }
        },
        createPageElement(folderData) {
            const templateNode = pageTemplate.content.cloneNode(true);
            const pageItemContainer = templateNode.querySelector('.page-item-container');
            const detailsContent = pageItemContainer.querySelector('.details-content');
            const versions = (folderData.documento_versao || []).sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at));
            const currentDocument = versions[0] || null;

            pageItemContainer.querySelector('.page-title').textContent = folderData.nome;
            if (currentDocument) {
                pageItemContainer.querySelector('.doc-filename').textContent = currentDocument.file_name || 'Documento atual';
                pageItemContainer.querySelector('.doc-icon').textContent = currentDocument.file_name?.toLowerCase().endsWith('.pdf') ? 'picture_as_pdf' : 'image';
            }
            pageItemContainer.querySelector('.page-section-compact').addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    if (currentDocument) Modal.openViewer(currentDocument.file_url, currentDocument.file_name);
                    else alert("Esta pasta está vazia. Expanda para adicionar um documento.");
                }
            });

            pageItemContainer.querySelector('.history-btn').addEventListener('click', (e) => { e.stopPropagation(); Modal.showHistory(folderData); });
            pageItemContainer.querySelector('.edit-btn').addEventListener('click', () => detailsContent.classList.toggle('open'));
            pageItemContainer.querySelector('.delete-btn').addEventListener('click', () => UI.handleDeleteFolder(folderData));
            pageItemContainer.querySelector('.upload-doc-btn').addEventListener('click', () => Modal.openFileSource(folderData, pageItemContainer));

            if (folderData.categoria !== 'expiring') {
                pageItemContainer.querySelector('.end-date-group').style.display = 'none';
            }
            const saveBtn = pageItemContainer.querySelector('.save-doc-btn');
            [pageItemContainer.querySelector('.start-date'), pageItemContainer.querySelector('.end-date')].forEach(input => {
                if(input) input.addEventListener('change', () => { saveBtn.disabled = false; });
            });
            saveBtn.addEventListener('click', () => UI.handleSave(folderData, pageItemContainer));
            UI.updateStatusIndicator(pageItemContainer, folderData, currentDocument);
            return pageItemContainer;
        },
        updateStatusIndicator(pageItemContainer, folderData, currentDocument) {
            const statusCircle = pageItemContainer.querySelector('.status-indicator-circle');
            if (!statusCircle || folderData.categoria !== "expiring" || !currentDocument?.end_date) {
                if (statusCircle) statusCircle.style.display = 'none'; return;
            }
            statusCircle.className = 'status-indicator-circle';
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const endDate = new Date(currentDocument.end_date);
            const sevenDaysBefore = new Date(endDate); sevenDaysBefore.setDate(endDate.getDate() - 7);
            if (endDate < today) statusCircle.classList.add('status-red');
            else if (today >= sevenDaysBefore) statusCircle.classList.add('status-yellow');
            else statusCircle.classList.add('status-blue');
        },
        checkEmptyContainers() {
            const expiringContainer = document.getElementById('pages-container-expiring');
            const nonExpiringContainer = document.getElementById('pages-container-non-expiring');
            if (expiringContainer && expiringContainer.children.length === 0) {
                expiringContainer.innerHTML = '<p class="empty-list-message">Nenhuma pasta com vencimento criada.</p>';
            }
            if (nonExpiringContainer && nonExpiringContainer.children.length === 0) {
                nonExpiringContainer.innerHTML = '<p class="empty-list-message">Nenhuma pasta sem vencimento criada.</p>';
            }
        }
    };
    
    // --- LÓGICA DE MODAIS E INTERAÇÕES ---
    const Modal = {
        openFileSource(folderData, pageItemContainer) {
            currentFolderForUpload = { folder: folderData, container: pageItemContainer };
            fileSourceModal?.classList.remove('hidden');
        },
        closeFileSource() {
            fileSourceModal?.classList.add('hidden');
        },
        prepareFileForUpload(file) {
            const { container } = currentFolderForUpload;
            container.fileToUpload = file;
            const uploadBtn = container.querySelector('.upload-doc-btn');
            const saveBtn = container.querySelector('.save-doc-btn');
            uploadBtn.innerHTML = `<i class="material-icons">check_circle</i> ${file.name}`;
            saveBtn.disabled = false;
        },
        async getFromCamera() {
            if (!Camera) return alert("Plugin da Câmera não disponível.");
            Modal.closeFileSource();
            try {
                const image = await Camera.getPhoto({ quality: 90, resultType: 'uri', source: 'CAMERA' });
                if (image.webPath) {
                    const response = await fetch(image.webPath);
                    const blob = await response.blob();
                    const file = new File([blob], `camera-${Date.now()}.${image.format}`, { type: blob.type });
                    Modal.prepareFileForUpload(file);
                }
            } catch (e) { console.error("Erro ao usar a câmera:", e); }
        },
        async getFromGallery() {
            if (!Camera) return alert("Plugin da Câmera não disponível.");
            Modal.closeFileSource();
            try {
                const image = await Camera.getPhoto({ quality: 90, resultType: 'uri', source: 'PHOTOS' });
                if (image.webPath) {
                    const response = await fetch(image.webPath);
                    const blob = await response.blob();
                    const file = new File([blob], `galeria-${Date.now()}.${image.format}`, { type: blob.type });
                    Modal.prepareFileForUpload(file);
                }
            } catch (e) { console.error("Erro ao usar a galeria:", e); }
        },
        browseDevice() {
            Modal.closeFileSource();
            hiddenFileInput.click();
        },
        handleFileFromDevice(event) {
            const file = event.target.files[0];
            if (file) Modal.prepareFileForUpload(file);
            event.target.value = '';
        },
        async showHistory(folderData) {
            const list = document.getElementById('history-list');
            const title = document.getElementById('history-modal-title');
            if (!historyModal || !list || !title) return;

            title.textContent = folderData ? `Histórico: ${folderData.nome}` : "Relatório Geral de Alterações";
            list.innerHTML = '<li>Carregando...</li>';
            historyModal.classList.remove('hidden');
            document.body.classList.add('modal-open');

            try {
                const logs = folderData ? await Db.getHistory(folderData.id) : await Db.getGeneralHistory();
                if (logs.length === 0) {
                    list.innerHTML = '<li>Nenhuma alteração registrada.</li>';
                    return;
                }
                list.innerHTML = logs.map(log => `<li>${log.log_description}<span class="log-meta">Por: ${log.user_email || 'Sistema'} em ${new Date(log.changed_at).toLocaleString('pt-BR')}</span></li>`).join('');
            } catch (error) {
                list.innerHTML = `<li>Erro ao carregar o histórico: ${error.message}</li>`;
            }
        },
        async openViewer(fileUrl, fileName) {
            const modal = document.getElementById('documentViewerModal');
            const canvas = modal.querySelector('#modal-pdf-canvas');
            const image = modal.querySelector('#modal-image-display');
            const pdfControls = modal.querySelector('#modal-pdf-controls');
            currentFileForDownload = { url: fileUrl, name: fileName };
            
            modal.querySelector('#modalDocumentTitle').textContent = fileName || 'Visualizador';
            [canvas, image, pdfControls].forEach(el => el.style.display = 'none');
            [canvas, image].forEach(el => el.style.transform = 'scale(1)');
            document.getElementById('download-doc-btn').style.display = 'flex';
            
            const fileType = fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image';
            if (fileType === 'image') {
                image.src = fileUrl;
                image.style.display = 'block';
                Modal.setupZoomEvents(image);
            } else if (fileType === 'pdf' && window.pdfjsLib) {
                canvas.style.display = 'block';
                pdfControls.style.display = 'flex';
                Modal.setupZoomEvents(canvas);
                try {
                    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js';
                    pdfDoc = await pdfjsLib.getDocument(fileUrl).promise;
                    modal.querySelector('#page-count').textContent = pdfDoc.numPages;
                    pageNum = 1;
                    Modal.renderPdfPage(1);
                } catch (reason) { Modal.closeViewer(); }
            }
            modal.classList.remove('hidden');
            document.body.classList.add('modal-open');
        },
        closeViewer() {
            const modal = document.getElementById('documentViewerModal');
            if (modal) {
                modal.classList.add('hidden');
                pdfDoc = null;
                currentFileForDownload = { url: null, name: null };
                document.getElementById('download-doc-btn').style.display = 'none';
                document.body.classList.remove('modal-open');
            }
        },
        renderPdfPage(num) {
            if (!pdfDoc) return;
            const canvas = document.getElementById('modal-pdf-canvas');
            pdfDoc.getPage(num).then(page => {
                const viewport = page.getViewport({ scale: 1.5 });
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                page.render({ canvasContext: canvas.getContext('2d'), viewport });
            });
            document.getElementById('page-num').textContent = num;
        },
        navigatePdf(direction) {
            if (!pdfDoc) return;
            const newPageNum = (direction === 'prev') ? pageNum - 1 : pageNum + 1;
            if (newPageNum > 0 && newPageNum <= pdfDoc.numPages) {
                pageNum = newPageNum;
                Modal.renderPdfPage(pageNum);
            }
        },
        setupZoomEvents(element) {
            let lastTap = 0, isZoomed = false;
            element.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                e.preventDefault();
                if (tapLength < 300 && tapLength > 0) {
                    isZoomed = !isZoomed;
                    const rect = element.getBoundingClientRect();
                    const originX = (e.changedTouches[0].clientX - rect.left) / rect.width * 100;
                    const originY = (e.changedTouches[0].clientY - rect.top) / rect.height * 100;
                    element.style.transformOrigin = isZoomed ? `${originX}% ${originY}%` : 'center center';
                    element.style.transform = isZoomed ? 'scale(2.5)' : 'scale(1)';
                }
                lastTap = currentTime;
            });
            document.getElementById('closeDocumentViewerModalBtn').addEventListener('click', () => {
                 element.style.transform = 'scale(1)';
                 isZoomed = false;
            });
        },
        async handleDownload() {
            if (!Browser) return alert("Não foi possível abrir o link neste dispositivo.");
            if (!currentFileForDownload.url) return alert("Não há um arquivo para baixar.");
            try {
                await Browser.open({ url: currentFileForDownload.url });
            } catch (error) {
                window.open(currentFileForDownload.url, '_blank');
            }
        }
    };
    
    // --- SETUP DE EVENTOS GLOBAIS ---
    document.querySelectorAll('.add-page-btn-tab').forEach(button => {
        button.addEventListener('click', function () {
            const category = this.dataset.targetTab;
            const inputElement = document.getElementById(`new-page-name-${category}`);
            const folderName = inputElement.value.trim();
            if (folderName) {
                inputElement.value = '';
                UI.handleAddFolder(folderName, category, this);
            } else {
                alert("Por favor, digite um nome para a nova pasta.");
            }
        });
    });

    document.querySelectorAll('.tab-link').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
            e.currentTarget.classList.add('active');
            document.getElementById(e.currentTarget.dataset.tab)?.classList.add('active');
        });
    });

    document.getElementById('general-history-report-btn').addEventListener('click', () => Modal.showHistory());
    document.getElementById('source-camera').addEventListener('click', Modal.getFromCamera);
    document.getElementById('source-gallery').addEventListener('click', Modal.getFromGallery);
    document.getElementById('source-browse').addEventListener('click', Modal.browseDevice);
    document.getElementById('source-cancel').addEventListener('click', Modal.closeFileSource);
    hiddenFileInput.addEventListener('change', Modal.handleFileFromDevice);
    
    document.getElementById('history-modal-close-btn').addEventListener('click', () => historyModal.classList.add('hidden'));
    document.getElementById('closeDocumentViewerModalBtn').addEventListener('click', Modal.closeViewer);
    document.getElementById('prev-page').addEventListener('click', () => Modal.navigatePdf('prev'));
    document.getElementById('next-page').addEventListener('click', () => Modal.navigatePdf('next'));
    document.getElementById('download-doc-btn').addEventListener('click', Modal.handleDownload);

    // --- CARGA INICIAL ---
    UI.loadAndDisplay();
});
