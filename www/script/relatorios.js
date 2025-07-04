// www/script/relatorios.js
import { supabase } from './supabaseClient.js';

const ReportsPage = {
    state: {
        condoId: null,
        condoName: '',
        activities: [],
        isLoading: false,
    },

    async fetchData() {
        const [activitiesRes, condoRes] = await Promise.all([
            supabase.from('checklist_activity')
                .select('*, tipo_ocorrencia(nome)')
                .eq('condominio_id', this.state.condoId)
                .order('proximo_vencimento', { ascending: true }),
            supabase.from('condominio')
                .select('nome')
                .eq('id', this.state.condoId)
                .single()
        ]);

        if (activitiesRes.error || condoRes.error) {
            console.error('Erro ao buscar dados:', activitiesRes.error || condoRes.error);
            alert('Não foi possível buscar os dados para o relatório.');
            return false;
        }

        this.state.activities = activitiesRes.data;
        this.state.condoName = condoRes.data.nome;
        return true;
    },
    
    async generateChecklistReport() {
        if (this.state.isLoading) return;
        
        const generateBtn = document.getElementById('generate-checklist-report-btn');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="material-icons">sync</i> Gerando e Enviando...';
        this.state.isLoading = true;

        const success = await this.fetchData();
        if (!success) {
            this.resetButton(generateBtn);
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Cabeçalho do documento
        doc.setFontSize(18);
        doc.text(`Relatório de Atividades - ${this.state.condoName}`, 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 29);
        
        // Mapeia os dados para o formato da tabela
        const tableData = this.state.activities.map(act => {
            const today = new Date(); today.setHours(0,0,0,0);
            const dueDate = act.proximo_vencimento ? new Date(act.proximo_vencimento + 'T00:00:00Z') : null;
            let status = 'Em dia';
            if (!dueDate) {
                status = 'Sob Demanda';
            } else if (dueDate < today) {
                status = 'Vencido';
            }
            return [
                act.titulo,
                act.tipo_ocorrencia?.nome || 'N/A',
                act.periodicidade || 'N/A',
                act.proximo_vencimento ? new Date(act.proximo_vencimento + 'T00:00:00Z').toLocaleDateString('pt-BR') : 'N/A',
                status
            ];
        });

        // Adiciona a tabela ao PDF
        doc.autoTable({
            startY: 40,
            head: [['Atividade', 'Sistema', 'Periodicidade', 'Próximo Vencimento', 'Status']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [22, 160, 133] },
        });

        // --- NOVA LÓGICA: ENVIAR PARA SUPABASE STORAGE E ABRIR URL ---
        try {
            // 1. Obter o PDF como Blob
            const pdfBlob = doc.output('blob');
            const fileName = `relatorio_atividades_${this.state.condoName.replace(/\s/g, '_')}_${Date.now()}.pdf`;
            const filePath = `condo_reports/${this.state.condoId}/${fileName}`; // Caminho dentro do bucket

            // 2. Fazer upload para o Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('reports') // USANDO O BUCKET 'reports'
                .upload(filePath, pdfBlob, {
                    cacheControl: '3600',
                    contentType: 'application/pdf',
                    upsert: true // Permite sobrescrever se o nome for o mesmo (improvável com timestamp)
                });

            if (uploadError) {
                console.error('Erro ao fazer upload do PDF para o Supabase Storage:', uploadError);
                alert('Não foi possível fazer o upload do relatório. Erro: ' + uploadError.message);
                return;
            }

            // 3. Obter a URL pública do arquivo
            const { data: publicUrlData } = supabase.storage
                .from('reports') // USANDO O BUCKET 'reports'
                .getPublicUrl(filePath);

            if (!publicUrlData || !publicUrlData.publicUrl) {
                console.error('Não foi possível obter a URL pública do PDF.');
                alert('Relatório gerado, mas não foi possível obter a URL para download.');
                return;
            }

            const publicUrl = publicUrlData.publicUrl;

            // 4. Abrir a URL pública em uma nova aba/janela
            window.open(publicUrl, '_blank');
            alert("Relatório gerado e aberto em uma nova aba para download.");

        } catch (error) {
            console.error("Erro completo ao gerar ou enviar o PDF:", error);
            alert("Não foi possível gerar ou abrir o PDF. Tente novamente.");
        } finally {
            this.resetButton(generateBtn);
        }
    },
    
    resetButton(button) {
        button.disabled = false;
        button.innerHTML = '<i class="material-icons">picture_as_pdf</i> Gerar PDF';
        this.state.isLoading = false;
    },

    initialize() {
        this.state.condoId = sessionStorage.getItem('selectedCondoId');
        if (!this.state.condoId) {
            alert("Condomínio não selecionado. Redirecionando...");
            window.location.href = './inicio.html';
            return;
        }

        const generateBtn = document.getElementById('generate-checklist-report-btn');
        generateBtn.addEventListener('click', () => this.generateChecklistReport());
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ReportsPage.initialize();
});