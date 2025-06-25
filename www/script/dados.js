// www/script/dados.js - v3 (Handles new fields and Date objects)

const TICKET_STORAGE_KEY_V2 = 'listaDeChamados_v2'; // Chave consistente

/**
 * Carrega os chamados do localStorage.
 * Converte strings de data de volta para objetos Date.
 * Trata o campo serviceOrderPhoto que é um objeto.
 * @returns {Array<object>} Lista de chamados.
 */
function loadTickets() {
    const savedTickets = localStorage.getItem(TICKET_STORAGE_KEY_V2);
    if (savedTickets) {
        try {
            const tickets = JSON.parse(savedTickets);
            // Mapeia a lista para converter strings ISO de volta para objetos Date
            return tickets.map(ticket => {
                // Verifica e converte cada campo de data
                const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
                const completedAt = ticket.completedAt ? new Date(ticket.completedAt) : null;
                const archivedAt = ticket.archivedAt ? new Date(ticket.archivedAt) : null;

                // Retorna o objeto do ticket com as datas convertidas
                // e garante que proposalValue seja número ou null
                return {
                    ...ticket,
                    createdAt: !isNaN(createdAt?.getTime()) ? createdAt : null,
                    completedAt: !isNaN(completedAt?.getTime()) ? completedAt : null,
                    archivedAt: !isNaN(archivedAt?.getTime()) ? archivedAt : null,
                    proposalValue: (ticket.proposalValue === null || ticket.proposalValue === undefined || isNaN(Number(ticket.proposalValue)))
                                      ? null
                                      : Number(ticket.proposalValue),
                    // serviceOrderPhoto já é um objeto ou null, JSON.parse cuida disso
                };
            });
        } catch (e) {
            console.error("Erro ao carregar/parsear chamados do localStorage (v2):", e);
            // Em caso de erro (ex: dados corrompidos), remove a chave e retorna vazio
            localStorage.removeItem(TICKET_STORAGE_KEY_V2);
            return [];
        }
    }
    return []; // Retorna lista vazia se não houver nada salvo
}

/**
 * Salva a lista de chamados no localStorage.
 * Converte objetos Date para strings ISO antes de salvar.
 * Garante que serviceOrderPhoto (objeto) seja salvo corretamente.
 * @param {Array<object>} ticketsArray - A lista de chamados a ser salva.
 */
function saveTickets(ticketsArray) {
    try {
        // Mapeia a lista para garantir que datas sejam salvas como strings ISO
        const ticketsToSave = ticketsArray.map(ticket => {
            // Verifica se as datas são objetos Date válidos antes de converter
            const createdAtISO = (ticket.createdAt instanceof Date && !isNaN(ticket.createdAt))
                                  ? ticket.createdAt.toISOString()
                                  : ticket.createdAt; // Mantém se já for string ou null
            const completedAtISO = (ticket.completedAt instanceof Date && !isNaN(ticket.completedAt))
                                   ? ticket.completedAt.toISOString()
                                   : ticket.completedAt;
            const archivedAtISO = (ticket.archivedAt instanceof Date && !isNaN(ticket.archivedAt))
                                  ? ticket.archivedAt.toISOString()
                                  : ticket.archivedAt;

            // Retorna o objeto pronto para ser serializado
            return {
                ...ticket,
                createdAt: createdAtISO,
                completedAt: completedAtISO,
                archivedAt: archivedAtISO,
                // proposalValue será salvo como número ou null
                // serviceOrderPhoto será salvo como objeto ou null
            };
        });

        // Salva a lista processada no localStorage
        localStorage.setItem(TICKET_STORAGE_KEY_V2, JSON.stringify(ticketsToSave));
        console.log(`${ticketsToSave.length} chamados salvos no localStorage.`);
        
        // Dispara evento para notificar outros scripts que os dados dos chamados foram atualizados
        window.dispatchEvent(new CustomEvent('ticketStoreUpdated', { detail: { key: TICKET_STORAGE_KEY_V2, count: ticketsToSave.length }}));


    } catch (e) {
        console.error("Erro ao salvar chamados no localStorage (v2):", e);
         if (e.name === 'QuotaExceededError') {
             // Informa o usuário sobre o problema de espaço
             alert("Erro: Armazenamento local cheio. Não foi possível salvar os chamados. Tente limpar dados antigos ou remover anexos grandes.");
         } else {
             alert("Erro desconhecido ao salvar a lista de chamados.");
         }
    }
}