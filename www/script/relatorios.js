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
        generateBtn.innerHTML = '<i class="material-icons">sync</i> Gerando...';
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

        // Utiliza a função .save() do jsPDF para acionar o download no navegador
        try {
            const fileName = `relatorio_atividades_${this.state.condoName.replace(/\s/g, '_')}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("Erro ao gerar o PDF:", error);
            alert("Não foi possível gerar o PDF. Tente novamente.");
        }
        
        this.resetButton(generateBtn);
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