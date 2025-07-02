// www/script/preloaded_activities.js

/**
 * Este arquivo contém a lógica para fornecer uma lista de atividades de manutenção
 * pré-definidas, extraídas do arquivo CSV (convertido do XLSX) fornecido.
 * Ele serve como uma "semente" de dados para novos condomínios.
 */

// Lista de tipos de ocorrência/sistemas que serão criados no banco de dados.
const PREDEFINED_OCCURRENCE_TYPES_LIST = [
    { key: "hidrossanitario", name: "Sistema Hidrossanitário" },
    { key: "protecao_incendio", name: "Sistema de Proteção e Combate a Incêndio" },
    { key: "instalacoes_eletricas", name: "Sistema de Instalações Elétricas" },
    { key: "climatizacao", name: "Climatização" },
    { key: "instalacoes_gas", name: "Instalações de Gás" },
    { key: "impermeabilizacoes", name: "Impermeabilizações" },
    { key: "sistemas_civis", name: "Sistemas Civis (Estrutura, Contenção)" },
    { key: "esquadrias", name: "Esquadrias (Portas, Janelas)" },
    { key: "revestimentos", name: "Revestimentos (Pisos, Fachadas, Pintura)" },
    { key: "forros", name: "Forros" },
    { key: "vidros", name: "Vidros e Guarda-corpos" },
    { key: "cobertura", name: "Cobertura / Telhado" },
    { key: "logistica", name: "Logística (Garagens, Estacionamento)" },
    { key: "paisagismo_lazer", name: "Paisagismo e Lazer" },
    { key: "pavimentacao", name: "Pavimentação" },
    { key: "telecomunicacoes", name: "Telecomunicações e Cabeamento" },
    { key: "decoracao", name: "Decoração e Mobiliário" },
    { key: "outros", name: "Geral / Outros" }
];

// Mapeia o texto do CSV para uma chave única do sistema.
function mapSystemToOccurrenceKey(csvSystem) {
    const systemStr = String(csvSystem).toLowerCase().trim();
    if (systemStr.includes("hidrossanitário")) return "hidrossanitario";
    if (systemStr.includes("incêndio")) return "protecao_incendio";
    if (systemStr.includes("elétricas")) return "instalacoes_eletricas";
    if (systemStr.includes("climatização")) return "climatizacao";
    if (systemStr.includes("gás")) return "instalacoes_gas";
    if (systemStr.includes("impermeabilizaç")) return "impermeabilizacoes";
    if (systemStr.includes("sistemas civis")) return "sistemas_civis";
    if (systemStr.includes("esquadrias")) return "esquadrias";
    if (systemStr.includes("revestimentos")) return "revestimentos";
    if (systemStr.includes("forros")) return "forros";
    if (systemStr.includes("vidros")) return "vidros";
    if (systemStr.includes("cobertura")) return "cobertura";
    if (systemStr.includes("logística")) return "logistica";
    if (systemStr.includes("paisagismo")) return "paisagismo_lazer";
    if (systemStr.includes("pavimentação")) return "pavimentacao";
    if (systemStr.includes("telecomunicações")) return "telecomunicacoes";
    if (systemStr.includes("decoração")) return "decoracao";
    return "outros";
}

// Mapeia o texto do CSV para um tipo de equipe padrão.
function mapTeamResponsibility(csvTeam) {
    const teamStr = String(csvTeam).toLowerCase();
    if (teamStr.includes("especializada")) return "Especializada";
    if (teamStr.includes("capacitada") || teamStr.includes("qualificado")) return "Capacitada";
    return "Local";
}

// Mapeia a periodicidade do CSV para um valor padrão do sistema.
function mapPeriod(csvPeriod) {
    const periodStr = String(csvPeriod).toLowerCase();
    const mapping = {
        "diaria": "Diaria", "semanal": "Semanal", "quinzenal": "Quinzenal",
        "mensal": "Mensal", "bimestral": "Bimestral", "trimestral": "Trimestral",
        "semestral": "Semestral", "anual": "Anual", "bienal": "Bienal",
        "necessário": "Customizado", "trienal": "Customizado", "quinquenal": "Customizado"
    };
    for (const key in mapping) {
        if (periodStr.includes(key)) return mapping[key];
    }
    return "Customizado"; // Default if no match
}

// Extrai o valor customizado da periodicidade do CSV.
function getCustomPeriodValue(csvPeriod) {
    const periodStr = String(csvPeriod).toLowerCase();
    if (periodStr.includes("necessário")) return "Conforme necessidade";
    if (periodStr.includes("trienal")) return "3 anos";
    if (periodStr.includes("quinquenal")) return "5 anos";
    return "";
}


// --- INÍCIO DA LÓGICA DE PARSE DO CSV ---

// Os dados brutos do seu arquivo CSV.
const rawCsvData = `
ID,Periodicidade,Sistema,Subsistema,Atividade,Responsável
A1.6,SEMESTRAL,SISTEMA HIDROSSANITÁRIO,ÁGUA FRIA,"Abrir e fechar completamente os registros dos subsolos e cobertura (barrilete) de modo a evitar emperramentos e os mantendo em condições de manobra. Verifique as estanqueidade dos componentes (ex.: registros)",Equipe de manutenção local
A1.7,ANUAL,SISTEMA HIDROSSANITÁRIO,ÁGUA FRIA,"Verificar as tubulações de água potável para detectar obstruções, perda de estanqueidade e sua fixação, recuperar sua integridade onde necessário. Limpeza os arejadores (bicos removíveis) das torneiras, crivos dos chuveiros.",Equipe de manutenção local/ empresa capacitada
A1.7,ANUAL,SISTEMA HIDROSSANITÁRIO,ÁGUA FRIA,"Verificar e, se necessário, substituir os vedantes (courinhos) das torneiras, misturadores e registros de pressão para garantir a vedação e evitar vazamentos",Equipe de manutenção local
A10.5,TRIMESTRAL,SISTEMA HIDROSSANITÁRIO,SISTEMA DE REUSO,"Limpar os reservatórios de água não potável e realizar eventual manutenção do revestimento impermeável.",Equipe de manutenção local
A10.7,ANUAL,SISTEMA HIDROSSANITÁRIO,SISTEMA DE REÚSO,"Fazer a limpeza e manutenção do filtro. Limpeza com esguicho de água.",Equipe de manutenção local
A11.3,MENSAL,SISTEMA HIDROSSANITÁRIO,SPA'S E BANHEIRAS,Fazer o teste de funcionamento conforme instruções do fornecedor.,Equipe de manutenção local/empresa especializada
A11.5,TRIMESTRAL,SISTEMA HIDROSSANITÁRIO,SPA'S E BANHEIRAS,Limpeza dos dispositivos que impossibilitem a entrada de residuos na tubulação.,Equipe de manutenção local/empresa especializada
A3.3,MENSAL,SISTEMA HIDROSSANITÁRIO,ESGOTO E DRENAGEM,Verificar e limpar os ralos, canaletas e grelhas do sistema de esgoto,Equipe de manutenção local
B1.3,MENSAL,SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO,BOMBAS E TANQUES,"Acionar a bomba de incêndio por meio do dreno da tubulação ou da botoeira ao lado do hidrante. Devem ser observadas as orientações da companhia de seguros do edifício ou do projeto específico de instalações",Equipe de manutenção local
B2.7,ANUAL,SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO,EXTINTORES,Verificar a validade e se necessário recarregar os extintores,Equipe de manutenção local/empresa especializada
C4.3,MENSAL,SISTEMA DE INSTALAÇÕES ELÉTRICAS,GRUPO GERADOR,Fazer teste de funcionamento do sistema durante 15 minutos,Equipe de manutenção local
Q1.0,DIARIAMENTE,PAISAGISMO E LAZER,PISCINAS,"Ligar o filtro, remover resíduos da água com o uso da peneira e aspirar o fundo do espelho d'água.",Equipe de manutenção local / empresa especializada
J1.5,TRIMESTRAL,ESQUADRIAS,ESQUADRIA DE ALUMÍNIO,Efetuar limpeza geral das esquadrias e seus componentes.,Equipe de manutenção local
L11.8,BIENAL,REVESTIMENTOS,PINTURA EXTERNA / TEXTURA,"Realizar inspeção para avaliar as condições quanto a descascamento, esfarelamento e perda de cor. Realizar repinturas se necessário.",Equipe de manutenção local / Empresa capacitada
C1.7,ANUAL,SISTEMA DE INSTALAÇÕES ELÉTRICAS,QUADRO DE DISTRIBUIÇÃO,Verificar e, se necessário, reapertar as conexões do quadro de distribuição.,Equipe de manutenção local/ empresa capacitada
G1.7,ANUAL,IMPERMEABILIZAÇÕES,PROTEÇÃO MECÂNICA,"Verificar a integridade da proteção mecânica (camada de acabamento), sinais de infiltração ou falha da impermeabilização.",Equipe de manutenção local/ empresa capacitada
B7.3,MENSAL,SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO,SISTEMA DE ILUMINAÇÃO DE EMERGÊNCIA,"Verificar todas as lâmpadas e trocar as peças queimadas ou danificadas. Efetuar teste de funcionamento.",Equipe de manutenção local
`;

/**
 * Analisa uma string CSV e a converte em um array de objetos.
 * @param {string} csvText - O conteúdo do arquivo CSV.
 * @returns {Array<object>}
 */
function parseCsv(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        // Regex para lidar com valores entre aspas que podem conter vírgulas
        const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
        const entry = {};
        for (let j = 0; j < headers.length; j++) {
            entry[headers[j]] = values[j] ? values[j].replace(/"/g, '').trim() : '';
        }
        data.push(entry);
    }
    return data;
}

const RAW_PRELOADED_ACTIVITIES_DATA = parseCsv(rawCsvData);

// --- FIM DA LÓGICA DE PARSE DO CSV ---


/**
 * Função principal exportada.
 * Processa os dados brutos e retorna uma estrutura limpa de atividades
 * e tipos de ocorrência para serem usados pelo sistema.
 * @returns {{activities: Array<object>, occurrenceTypes: Array<object>}}
 */
export function getPredefinedChecklistData() {
    const activities = RAW_PRELOADED_ACTIVITIES_DATA.map(item => {
        const period = mapPeriod(item.Periodicidade);
        const customPeriod = getCustomPeriodValue(item.Periodicidade);
        const occurrenceKey = mapSystemToOccurrenceKey(item.Sistema);
        
        if (!item.Atividade || !item.Subsistema) return null;

        let title = item.Atividade;
        if (title.length > 100) {
            const lastSpace = title.lastIndexOf(' ', 97);
            title = (lastSpace > 0 ? title.substring(0, lastSpace) : title.substring(0, 97)) + '...';
        }
        
        return {
            titulo: title,
            occurrence: occurrenceKey,
            description: `[${item.Subsistema}] ${item.Atividade}`,
            norm: item.ID || 'N/A',
            team: mapTeamResponsibility(item.Responsável),
            period: period,
            customPeriod: customPeriod,
            type: 'Preventiva',
        };
    }).filter(Boolean);

    return {
        activities: activities,
        occurrenceTypes: [...PREDEFINED_OCCURRENCE_TYPES_LIST]
    };
}