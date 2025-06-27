// www/script/preloaded_activities.js

const PREDEFINED_OCCURRENCE_TYPES_LIST = [
    { key: "Hidrossanitario", name: "Sistema Hidrossanitário" },
    { key: "ProtecaoIncendio", name: "Sistema de Proteção e Combate Contra Incêndio" },
    { key: "InstalacoesEletricas", name: "Sistema de Instalações Elétricas" },
    { key: "Climatizacao", name: "Climatização" },
    { key: "InstalacoesGas", name: "Instalações de Gás" },
    { key: "Impermeabilizacoes", name: "Impermeabilizações" },
    { key: "SistemasCivis", name: "Sistemas Civis (Estrutura, Contenção, Divisórias)" },
    { key: "Esquadrias", name: "Esquadrias (Portas, Janelas)" },
    { key: "Revestimentos", name: "Revestimentos (Pisos, Fachadas, Pintura)" },
    { key: "Forros", name: "Forros" },
    { key: "Vidros", name: "Vidros e Guarda-corpos" },
    { key: "CoberturaTelhado", name: "Cobertura / Telhado" },
    { key: "Logistica", name: "Logística (Estacionamento, Garagens, Heliponto)" },
    { key: "PaisagismoLazer", name: "Paisagismo e Lazer" },
    { key: "Pavimentacao", name: "Pavimentação" },
    { key: "TelecomunicacoesCabeamento", name: "Sistemas de Telecomunicações e Cabeamentos" },
    { key: "Decoracao", name: "Decoração e Mobiliário" },
    { key: "Elevador", name: "Elevador" },
    { key: "Gerador", name: "Gerador" },
    { key: "SegurancaEletronica", name: "Segurança Eletrônica (CFTV, Alarmes, Cerca)" },
    { key: "Outros", name: "Geral / Outros" }
];

// Helper function to map PDF "Sistema" to occurrence keys
function mapSystemToOccurrenceKey(pdfSystem) {
    const systemStr = String(pdfSystem).toLowerCase().trim();
    if (systemStr.includes("hidrossanitário")) return "Hidrossanitario";
    if (systemStr.includes("proteção e combate contra incêndio")) return "ProtecaoIncendio";
    if (systemStr.includes("instalações elétricas")) return "InstalacoesEletricas";
    if (systemStr.includes("climatização")) return "Climatizacao";
    if (systemStr.includes("instalações de gás")) return "InstalacoesGas";
    if (systemStr.includes("impermeabilizações")) return "Impermeabilizacoes";
    if (systemStr.includes("sistemas civis")) return "SistemasCivis";
    if (systemStr.includes("esquadrias")) return "Esquadrias";
    if (systemStr.includes("revestimentos")) return "Revestimentos";
    if (systemStr.includes("forros")) return "Forros";
    if (systemStr.includes("vidros")) return "Vidros";
    if (systemStr.includes("cobertura")) return "CoberturaTelhado";
    if (systemStr.includes("logística")) return "Logistica";
    if (systemStr.includes("paisagismo e lazer")) return "PaisagismoLazer";
    if (systemStr.includes("pavimentação")) return "Pavimentacao";
    if (systemStr.includes("telecomunicações e cabeamentos")) return "TelecomunicacoesCabeamento";
    if (systemStr.includes("decoração")) return "Decoracao";
    return "Outros"; // Default
}

// Helper function to map PDF "Responsável" to team types
function mapTeamResponsibility(pdfTeam) {
    const teamStr = String(pdfTeam).toLowerCase();
    if (teamStr.includes("especializada")) return "Especializada";
    if (teamStr.includes("capacitada") || teamStr.includes("qualificado")) return "Capacitada";
    if (teamStr.includes("local")) return "Local";
    return "Local"; // Default
}

// Helper function to map PDF "Periodicidade" to dropdown values
function mapPeriod(pdfPeriod) {
    const periodStr = String(pdfPeriod).trim().toLowerCase();
    const mapping = {
        "diariamente": "Diaria",
        "0. diariamente": "Diaria",
        "semanal": "Semanal",
        "1. semanal": "Semanal",
        "quinzenal": "Quinzenal",
        "2. quinzenal": "Quinzenal",
        "mensal": "Mensal",
        "3. mensal": "Mensal",
        "bimestral": "Bimestral",
        "4. bimestral": "Bimestral",
        "trimestral": "Trimestral",
        "5. trimestral": "Trimestral",
        "semestral": "Semestral",
        "6. semestral": "Semestral",
        "anual": "Anual",
        "7. anual": "Anual",
        "bienal": "Bienal",
        "8. bienal": "Bienal",
        "trienal": "Customizado",
        "9. trienal": "Customizado",
        "quinquenal": "Customizado",
        "10. quinquenal": "Customizado",
        "0. sempre que necessário": "Customizado"
    };
    return mapping[periodStr] || "Customizado"; // Default to custom if not found
}

// Helper function to get custom period value from PDF "Periodicidade"
function getCustomPeriodValue(pdfPeriod) {
    const periodStr = String(pdfPeriod).trim().toLowerCase();
    if (periodStr.includes("trienal")) return "3 anos";
    if (periodStr.includes("quinquenal")) return "5 anos";
    if (periodStr.includes("sempre que necessário")) return "Conforme necessidade";
    return "";
}


const RAW_PRELOADED_ACTIVITIES_DATA = [
    // Page 1 Activities
    { pdfId: "A16", pdfPeriod: "6. SEMESTRAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "ÁGUA FRIA", pdfAtividade: "Abrir e fechar completamente os registros dos subsolos e cobertura (barrilete) de modo a evitar emperramentos e os mantendo em condições de manobra. Verifique as estanqueidade dos componentes (ex.: registros)", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "A1.7", pdfPeriod: "7. ANUAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "ÁGUA FRIA", pdfAtividade: "Verificar as tubulações de água potável para detectar obstruções, perda de estanqueidade e sua fixação, recuperar sua integridade onde necessário. Limpeza os arejadores (bicos removíveis) das torneiras, crivos dos chuveiros.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "A17", pdfPeriod: "7. ANUAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "ÁGUA FRIA", pdfAtividade: "Verificar e, se necessário, substituir os vedantes (courinhos) das torneiras, misturadores e registros de pressão para garantir a vedação e evitar vazamentos", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "A10.5", pdfPeriod: "5. TRIMESTRAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "SISTEMA DE REUSO", pdfAtividade: "Limpar os reservatórios de água não potável e realizar eventual manutenção do revestimento impermeável. Fazer a limpeza e manutenção do filtro. Limpeza com esguicho de água.", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "A3.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "ESGOTO E DRENAGEM", pdfAtividade: "Verificar e limpar os ralos, canaletas e grelhas do sistema de esgoto", pdfResponsavel: "Equipe de manutenção local" },
    
    // Page 2 Activities
    { pdfId: "A5.1", pdfPeriod: "1. SEMANAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "IRRIGAÇÃO", pdfAtividade: "Verificar o funcionamento dos dispositivos de irrigação", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "A6.6", pdfPeriod: "6. SEMESTRAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "LOUÇAS E METAIS", pdfAtividade: "Verificar vazamento das bolsas de ligação do vaso sanitário. Limpar aeradores (bicos removíveis) das torneiras. Verificar a estanqueidade da caixa de descarga.", pdfResponsavel: "Equipe de manutenção local/empresa especializada" },

    // Page 3 Activities
    { pdfId: "A9.1", pdfPeriod: "1. SEMANAL", pdfSystem: "SISTEMA HIDROSSANITÁRIO", pdfSubsistema: "RESERVAÇÃO DE ÁGUA", pdfAtividade: "Verificar o nível dos reservatórios, o funcionamento das torneiras de boia e a chave de boia para controle de nível", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "B1.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO", pdfSubsistema: "BOMBAS E TANQUES", pdfAtividade: "Acionar a bomba de incêndio por meio do dreno da tubulação ou da botoeira ao lado do hidrante. Observar orientações da companhia de seguros ou projeto.", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "B2.7", pdfPeriod: "7. ANUAL", pdfSystem: "SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO", pdfSubsistema: "EXTINTORES", pdfAtividade: "Verificar a validade e se necessário recarregar os extintores", pdfResponsavel: "Equipe de manutenção local/empresa especializada" },

    // Page 4 Activities
    { pdfId: "B6.1", pdfPeriod: "1. SEMANAL", pdfSystem: "SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO", pdfSubsistema: "SISTEMA DE HIDRANTES", pdfAtividade: "Verificar o nível dos reservatórios e o funcionamento das torneiras de boia e a chave de boia para controle do nível", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "B7.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMA DE PROTEÇÃO E COMBATE CONTRA INCÊNDIO", pdfSubsistema: "SISTEMA DE ILUMINAÇÃO DE EMERGÊNCIA", pdfAtividade: "Verificar todas as lâmpadas e trocar as peças queimadas ou danificadas. Efetuar teste de funcionamento.", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "C1.0", pdfPeriod: "0. DIARIAMENTE", pdfSystem: "SISTEMA DE INSTALAÇÕES ELÉTRICAS", pdfSubsistema: "QUADRO DE DISTRIBUIÇÃO", pdfAtividade: "Verificar o quadro sinóptico que monitora o funcionamento, pane das bombas e equipamentos", pdfResponsavel: "Equipe de manutenção local" },
    
    // Page 5 Activities
    { pdfId: "C2.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMA DE INSTALAÇÕES ELÉTRICAS", pdfSubsistema: "TOMADAS, INTERRUPTORES E PONTOS DE LUZ", pdfAtividade: "Verificar as lâmpadas e luminárias de área externa e realizar limpeza e reparo onde necessário.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "C4.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMA DE INSTALAÇÕES ELÉTRICAS", pdfSubsistema: "GRUPO GERADOR", pdfAtividade: "Fazer teste de funcionamento do sistema durante 15 minutos", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "C5.6", pdfPeriod: "6. SEMESTRAL", pdfSystem: "SISTEMA DE INSTALAÇÕES ELÉTRICAS", pdfSubsistema: "PLACAS FOTOVOLTAICAS", pdfAtividade: "Limpeza das placas", pdfResponsavel: "Equipe de manutenção local / Empresa capacitada" },
    
    // Page 6 Activities
    { pdfId: "E1.3", pdfPeriod: "3. MENSAL", pdfSystem: "CLIMATIZAÇÃO", pdfSubsistema: "INSTALAÇÃO DE AR CONDICIONADO CENTRAL SPLIT", pdfAtividade: "Realizar limpeza dos componentes e filtros, mesmo em período de não utilização. Verificar e limpar as unidades condensadora e evaporadora.", pdfResponsavel: "Equipe de manutenção local / Empresa capacitada" },
    { pdfId: "F1.3", pdfPeriod: "3. MENSAL", pdfSystem: "INSTALAÇÕES DE GÁS", pdfSubsistema: "MANGUEIRAS E ACESSÓRIOS", pdfAtividade: "Verificar as condições das mangueiras de ligação (validade e estado) e, se necessário, trocar.", pdfResponsavel: "Equipe de manutenção local/empresa especializada." },

    // Page 7 Activities
    { pdfId: "G1.7", pdfPeriod: "7. ANUAL", pdfSystem: "IMPERMEABILIZAÇÕES", pdfSubsistema: "PROTEÇÃO MECÂNICA", pdfAtividade: "Verificar a integridade da proteção mecânica (camada de acabamento), sinais de infiltração ou falha da impermeabilização.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "I10.7", pdfPeriod: "7. ANUAL", pdfSystem: "SISTEMAS CIVIS", pdfSubsistema: "CONTENÇÃO", pdfAtividade: "Verificar o aparecimento de manchas superficiais no concreto e sua descoloração. Testar a profundidade da carbonatação.", pdfResponsavel: "Equipe de manutenção local / empresa capacitada" },
    
    // Page 8 Activities
    { pdfId: "J1.5", pdfPeriod: "5. TRIMESTRAL", pdfSystem: "ESQUADRIAS", pdfSubsistema: "ESQUADRIA DE ALUMÍNIO", pdfAtividade: "Efetuar limpeza geral das esquadrias e seus componentes.", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "J2.6", pdfPeriod: "6. SEMESTRAL", pdfSystem: "ESQUADRIAS", pdfSubsistema: "ESQUADRIAS DE FERRO E AÇO", pdfAtividade: "Verificar as esquadrias para identificação de pontos de oxidação e, se necessário, proceder reparos.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    
    // Page 10 Activities
    { pdfId: "L1.7", pdfPeriod: "7. ANUAL", pdfSystem: "REVESTIMENTOS", pdfSubsistema: "CERAMICA / PORCELANATO", pdfAtividade: "Verificar a eflorescência, manchas e presença de peças quebradas. Promover a revisão do sistema de rejuntamento quanto à presença de fissuras e pontos falhos.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "L11.8", pdfPeriod: "8. BIENAL", pdfSystem: "REVESTIMENTOS", pdfSubsistema: "PINTURA EXTERNA / TEXTURA", pdfAtividade: "Realizar inspeção para avaliar as condições quanto a descascamento, esfarelamento e perda de cor. Realizar repinturas se necessário.", pdfResponsavel: "Equipe de manutenção local / Empresa capacitada" },

    // Page 15 Activities
    { pdfId: "P1.3", pdfPeriod: "3. MENSAL", pdfSystem: "LOGÍSTICA", pdfSubsistema: "ESTACIONAMENTO, GARAGENS E HELIPONTO", pdfAtividade: "Verificar lâmpadas e luminárias, limpar e reparar. Verificar placas de sinalização.", pdfResponsavel: "Equipe de manutenção local" },
    { pdfId: "Q1.0", pdfPeriod: "0. DIARIAMENTE", pdfSystem: "PAISAGISMO E LAZER", pdfSubsistema: "PISCINAS", pdfAtividade: "Ligar o filtro. Remover resíduos da água com peneira e aspirar o fundo.", pdfResponsavel: "Equipe de manutenção local / empresa especializada" },
    
    // Page 18 Activities
    { pdfId: "T1.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMAS DE TELECOMUNICAÇÕES E CABEAMENTOS", pdfSubsistema: "SISTEMA DE TELEFONIA E DE INTERFONES", pdfAtividade: "Verificar o funcionamento conforme instruções do fornecedor.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "T2.3", pdfPeriod: "3. MENSAL", pdfSystem: "SISTEMAS DE TELECOMUNICAÇÕES E CABEAMENTOS", pdfSubsistema: "SISTEMA DE CIRCUITO FECHADO DE TELEVISÃO - CFTV", pdfAtividade: "Verificar o funcionamento conforme instruções do fornecedor.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
    { pdfId: "S1", pdfPeriod: "0. DIARIAMENTE", pdfSystem: "DECORAÇÃO", pdfSubsistema: "ARMÁRIOS PLANEJADOS", pdfAtividade: "Limpeza sempre que necessário.", pdfResponsavel: "Equipe de manutenção local/ empresa capacitada" },
];

// Function to get both predefined activities and occurrence types
function getPredefinedChecklistData(calculateNextDeadlineDateFn) {
    if (typeof calculateNextDeadlineDateFn !== 'function') {
        console.error("calculateNextDeadlineDateFn must be a function for getPredefinedChecklistData.");
        // Fallback for deadline calculation if the function is not provided
        calculateNextDeadlineDateFn = (period, customValue) => {
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        };
    }

    const activities = RAW_PRELOADED_ACTIVITIES_DATA.map((item, index) => {
        const period = mapPeriod(item.pdfPeriod);
        const customPeriod = getCustomPeriodValue(item.pdfPeriod);
        const occurrence = mapSystemToOccurrenceKey(item.pdfSystem);
        let title = item.pdfAtividade;
        let description = `Subsistema: ${item.pdfSubsistema}. Atividade original: ${item.pdfAtividade}`;
        
        if (item.pdfAtividade.length > 80) {
            const lastSpace = item.pdfAtividade.lastIndexOf(' ', 77);
            title = (lastSpace > 0 ? item.pdfAtividade.substring(0, lastSpace) : item.pdfAtividade.substring(0, 77)) + '...';
        }
        
        return {
            id: `preload_${Date.now()}_${index}`,
            titulo: title,
            occurrence: occurrence,
            description: description,
            norm: item.pdfId || 'N/A',
            team: mapTeamResponsibility(item.pdfResponsavel),
            period: period,
            customPeriod: customPeriod,
            type: 'Preventiva',
            created: new Date().toISOString(),
            lastPerformed: null,
            nextDeadlineDate: customPeriod === "Conforme necessidade" ? null : calculateNextDeadlineDateFn(period, customPeriod),
        };
    });

    return {
        activities: activities,
        occurrenceTypes: [...PREDEFINED_OCCURRENCE_TYPES_LIST] // Return a copy
    };
}