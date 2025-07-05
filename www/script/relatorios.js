// www/script/relatorios.js (CORRIGIDO)
import { supabase } from './supabaseClient.js';

// Adiciona referência ao plugin Browser do Capacitor
const { Browser } = window.Capacitor?.Plugins ?? {};

/**
 * Carrega uma imagem de uma URL e a converte para o formato base64.
 * @param {string} url - A URL pública da imagem.
 * @returns {Promise<string|null>} A imagem em formato de dados base64 ou nulo se falhar.
 */
async function loadImageAsBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Falha ao buscar imagem: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error(`Não foi possível carregar a imagem de ${url}:`, error);
        return null;
    }
}


const ReportsPage = {
    state: {
        condoId: null,
        condoName: '',
        isLoading: false,
    },

    setLoading(button, loading, originalText = 'Gerar PDF') {
        this.state.isLoading = loading;
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<i class="material-icons spin">sync</i> Gerando...';
        } else {
            button.disabled = false;
            button.innerHTML = `<i class="material-icons">picture_as_pdf</i> ${originalText}`;
        }
    },

    createPdf(title) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Condomínio: ${this.state.condoName}`, 14, 29);
        doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 36);

        return doc;
    },
    
    async uploadAndOpenPdf(doc, reportName) {
        const pdfBlob = doc.output('blob');
        const fileName = `${reportName}_${this.state.condoName.replace(/\s/g, '_')}_${Date.now()}.pdf`;
        const filePath = `${this.state.condoId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('reports')
            .upload(filePath, pdfBlob, {
                contentType: 'application/pdf',
                upsert: false
            });

        if (uploadError) {
            throw new Error(`Erro no upload do PDF para o Storage: ${uploadError.message}. Verifique as permissões do bucket 'reports'.`);
        }

        const { data: urlData } = supabase.storage
            .from('reports')
            .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
            throw new Error("Não foi possível obter a URL pública do relatório após o upload.");
        }

        alert("Relatório gerado com sucesso! Abrindo em nova aba...");
        if (Browser) {
            await Browser.open({ url: urlData.publicUrl });
        } else {
            window.open(urlData.publicUrl, '_blank');
        }
    },

    // --- FUNÇÕES DE GERAÇÃO DE RELATÓRIO ---

    async generateDocumentReport() {
        const button = document.getElementById('generate-document-report-btn');
        if (this.state.isLoading) return;
        this.setLoading(button, true);

        try {
            const { data, error } = await supabase.rpc('get_document_history_for_condo', { 
                p_condo_id: this.state.condoId 
            });

            if (error) throw new Error(`Erro ao buscar histórico de documentos: ${error.message}`);

            if (!data || data.length === 0) {
                alert('Nenhum histórico de documentos para gerar o relatório.');
                return;
            }

            const doc = this.createPdf('Relatório de Alterações de Documentos');
            const tableData = data.map(log => [
                new Date(log.changed_at).toLocaleString('pt-BR'),
                log.log_description,
                log.user_email || 'Sistema'
            ]);

            doc.autoTable({
                startY: 45,
                head: [['Data e Hora', 'Descrição da Alteração', 'Usuário']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: '#0097a7' },
            });
            
            await this.uploadAndOpenPdf(doc, 'relatorio_documentos');

        } catch (error) {
            const errorMessage = error.message || JSON.stringify(error);
            console.error("Erro ao gerar relatório de documentos:", errorMessage, error);
            alert("Não foi possível gerar o relatório de documentos. Detalhes: " + errorMessage);
        } finally {
            this.setLoading(button, false);
        }
    },

    async generateChecklistReport() {
        const button = document.getElementById('generate-checklist-report-btn');
        if (this.state.isLoading) return;
        this.setLoading(button, true);

        try {
            const { data, error } = await supabase.from('checklist_activity')
                .select('*, tipo_ocorrencia(nome)')
                .eq('condominio_id', this.state.condoId)
                .order('proximo_vencimento', { ascending: true });
            
            if (error) throw new Error(`Erro ao buscar plano de gestão: ${error.message}`);

            if (!data || data.length === 0) {
                alert('Nenhuma atividade no plano de gestão para gerar o relatório.');
                return;
            }

            const doc = this.createPdf('Relatório do Plano de Gestão');
            const tableData = data.map(act => {
                const today = new Date(); today.setHours(0, 0, 0, 0);
                const dueDate = act.proximo_vencimento ? new Date(act.proximo_vencimento + 'T00:00:00Z') : null;
                let status = 'Em dia';
                if (!dueDate) { status = 'Sob Demanda'; } 
                else if (dueDate < today) { status = 'Vencido'; }
                return [
                    act.titulo, act.tipo_ocorrencia?.nome || 'N/A', act.periodicidade || 'N/A',
                    dueDate ? dueDate.toLocaleDateString('pt-BR') : 'N/A', status
                ];
            });

            doc.autoTable({
                startY: 45,
                head: [['Atividade', 'Sistema', 'Periodicidade', 'Próximo Vencimento', 'Status']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: '#388e3c' },
            });
            
            await this.uploadAndOpenPdf(doc, 'relatorio_plano_gestao');

        } catch (error) {
            const errorMessage = error.message || JSON.stringify(error);
            console.error("Erro ao gerar relatório de checklist:", errorMessage, error);
            alert("Não foi possível gerar o relatório do plano de gestão. Detalhes: " + errorMessage);
        } finally {
            this.setLoading(button, false);
        }
    },
    
    async generateArchivedTicketsReport() {
        const button = document.getElementById('generate-archived-report-btn');
        const buttonText = 'Gerar PDF';
        if (this.state.isLoading) return;
        this.setLoading(button, true, buttonText);

        try {
            // ETAPA 1: Buscar chamados sem a junção com 'profiles'
            const { data: tickets, error: ticketsError } = await supabase
                .from('chamado')
                .select(`*, tipo_ocorrencia(nome), fornecedor(nome)`) // Removido 'profiles(*)' daqui
                .eq('condominio_id', this.state.condoId)
                .eq('status', 'ARQUIVADO')
                .order('created_at', { ascending: false });

            if (ticketsError) throw new Error(`Erro ao buscar dados dos chamados: ${ticketsError.message}`);

            if (!tickets || tickets.length === 0) {
                alert('Nenhum chamado arquivado para gerar o relatório.');
                return;
            }

            // ETAPA 2: Buscar os perfis dos usuários de forma separada e eficiente
            const userIds = [...new Set(tickets.map(t => t.user_id).filter(id => id))];
            const profileMap = new Map();

            if (userIds.length > 0) {
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', userIds);

                if (profileError) {
                    console.warn("Aviso: Não foi possível buscar os perfis dos usuários. O relatório será gerado sem os nomes.", profileError.message);
                } else {
                    profiles.forEach(p => profileMap.set(p.id, p));
                }
            }

            // ETAPA 3: Construir o PDF
            const doc = this.createPdf('Relatório Completo de Chamados Arquivados');
            let cursorY = 45;
            const pageHeight = doc.internal.pageSize.height;
            const bottomMargin = 20;

            for (const ticket of tickets) {
                // Monta o nome do criador usando o mapa de perfis
                const profile = profileMap.get(ticket.user_id);
                const createdBy = profile?.full_name || profile?.email || 'Não informado';

                if (cursorY + 60 > pageHeight - bottomMargin) { doc.addPage(); cursorY = 20; }
                
                doc.setFontSize(14); doc.setTextColor('#fb8c00');
                doc.text(`Chamado #${ticket.id.substring(0, 8)}`, 14, cursorY);
                cursorY += 8;
                
                const ticketDetails = [
                    ['Status', 'Arquivado'], ['Criado em', new Date(ticket.created_at).toLocaleString('pt-BR')],
                    ['Criado por', createdBy], // <-- DADO DO PERFIL INSERIDO AQUI
                    ['Sistema', ticket.tipo_ocorrencia?.nome || 'N/A'], ['Localização', ticket.localizacao || 'N/A'],
                    ['Prioridade', ticket.prioridade || 'N/A'], ['Descrição Inicial', ticket.descricao || ''],
                    ['Fornecedor', ticket.fornecedor?.nome || 'Não definido'],
                    ['Concluído em', ticket.completed_at ? new Date(ticket.completed_at).toLocaleString('pt-BR') : 'N/A'],
                    ['Notas da Conclusão', ticket.conclusao_descricao || 'Nenhuma'],
                ].filter(row => row[1]);
                
                doc.autoTable({
                    startY: cursorY, body: ticketDetails, theme: 'plain', styles: { fontSize: 9, cellPadding: 1.5 },
                    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto' } }
                });
                cursorY = doc.lastAutoTable.finalY + 10;

                const processImages = async (imageList, title) => {
                    if (imageList && imageList.length > 0) {
                        if (cursorY + 15 > pageHeight - bottomMargin) { doc.addPage(); cursorY = 20; }
                        doc.setFontSize(11); doc.setTextColor(100);
                        doc.text(title, 14, cursorY); cursorY += 6;
                        for (const imgPath of imageList) {
                            const { data: { publicUrl } } = supabase.storage.from('chamado-images').getPublicUrl(imgPath);
                            if (publicUrl) {
                                const base64Img = await loadImageAsBase64(publicUrl);
                                if (base64Img) {
                                    try {
                                        const imgProps = doc.getImageProperties(base64Img);
                                        const maxWidth = 180; const imgHeight = (imgProps.height * maxWidth) / imgProps.width;
                                        if (cursorY + imgHeight > pageHeight - bottomMargin) { doc.addPage(); cursorY = 20; }
                                        doc.addImage(base64Img, 'JPEG', 14, cursorY, maxWidth, imgHeight);
                                        cursorY += imgHeight + 5;
                                    } catch (e) {
                                        if (cursorY + 5 > pageHeight - bottomMargin) { doc.addPage(); cursorY = 20; }
                                        doc.setFontSize(8); doc.setTextColor(255, 0, 0);
                                        doc.text(`(Não foi possível carregar a imagem: ${imgPath})`, 14, cursorY);
                                        cursorY += 5;
                                    }
                                }
                            }
                        }
                        cursorY += 5;
                    }
                };
                
                await processImages(ticket.image_url, 'Fotos Iniciais:');
                await processImages(ticket.completion_image_url, 'Fotos da Conclusão:');

                if (tickets.indexOf(ticket) < tickets.length - 1) {
                    if (cursorY + 5 > pageHeight - bottomMargin) { doc.addPage(); cursorY = 20; }
                    doc.setDrawColor(200); doc.line(14, cursorY, 196, cursorY);
                    cursorY += 10;
                }
            }
            
            await this.uploadAndOpenPdf(doc, 'relatorio_completo_arquivados');

        } catch (error) {
            const errorMessage = error.message || JSON.stringify(error);
            console.error("Erro ao gerar relatório completo de chamados:", errorMessage, error);
            alert("Não foi possível gerar o relatório completo de chamados. Detalhes: " + errorMessage);
        } finally {
            this.setLoading(button, false, buttonText);
        }
    },

    async initialize() {
        this.state.condoId = sessionStorage.getItem('selectedCondoId');
        if (!this.state.condoId) {
            alert("Condomínio não selecionado. Redirecionando...");
            window.location.href = './inicio.html';
            return;
        }
        try {
            const { data, error } = await supabase.from('condominio').select('nome').eq('id', this.state.condoId).single();
            if (error) throw error;
            this.state.condoName = data.nome;
        } catch(error) {
             console.error("Não foi possível buscar o nome do condomínio:", error);
             this.state.condoName = "Condomínio";
        }
        document.getElementById('generate-document-report-btn')?.addEventListener('click', () => this.generateDocumentReport());
        document.getElementById('generate-checklist-report-btn')?.addEventListener('click', () => this.generateChecklistReport());
        document.getElementById('generate-archived-report-btn')?.addEventListener('click', () => this.generateArchivedTicketsReport());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ReportsPage.initialize();
});