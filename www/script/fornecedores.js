document.addEventListener('DOMContentLoaded', () => {
    // Elementos da Seção Superior (Gerenciamento de Tipos de Ocorrência)
    const newOccurrenceTypeNameInput = document.getElementById('new-occurrence-type-name-input');
    const addNewGlobalOccurrenceTypeBtn = document.getElementById('add-new-global-occurrence-type-btn');
    const allOccurrencesListDisplay = document.getElementById('all-occurrences-list-display');

    // Elementos da Seção Inferior (Gerenciamento de Fornecedores)
    const suppliersListContainer = document.getElementById('suppliers-list-container');
    const openAddSupplierModalBtn = document.getElementById('open-add-supplier-modal-btn');

    // Elementos do Modal e Formulário de Fornecedor
    const supplierFormModal = document.getElementById('supplier-form-modal');
    const supplierModalTitle = document.getElementById('supplier-modal-title');
    const closeSupplierModalBtn = document.getElementById('close-supplier-modal-btn');
    const supplierForm = document.getElementById('form-fornecedor');
    
    const supplierIdInput = document.getElementById('supplier-id');
    const supplierNameInput = document.getElementById('supplier-name-modal');
    const supplierCnpjInput = document.getElementById('supplier-cnpj-modal');
    const supplierPhoneInput = document.getElementById('supplier-phone-modal');
    const supplierMainOccurrenceInput = document.getElementById('supplier-main-occurrence-modal');
    const supplierHasContractInput = document.getElementById('supplier-has-contract-modal');
    const cancelEditBtnModal = document.getElementById('cancel-edit-supplier-btn-modal');

    const STORAGE_KEY_SUPPLIERS = 'condoSuppliersChamado_manutencao';
    const STORAGE_KEY_OCCURRENCE_TYPES = 'condoAllOccurrenceTypes_v1';

    let suppliers = [];
    let allKnownOccurrenceTypes = [];

    const PREDEFINED_OCCURRENCES = [
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

    // --- Funções de Máscara ---
    const maskPhone = (value) => { if (!value) return ""; value = value.replace(/\D/g, ''); value = value.substring(0, 11); if (value.length > 2) { value = '(' + value.substring(0, 2) + ') ' + value.substring(2); } if (value.length > 9) { value = value.substring(0, 9) + '-' + value.substring(9); } else if (value.length > 5 && value.length <=9 ) { value = value.substring(0,8) + '-' + value.substring(8); } return value; };
    const maskCnpj = (value) => { if (!value) return ""; value = value.replace(/\D/g, ''); value = value.substring(0, 14); if (value.length > 12) { value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, '$1.$2.$3/$4-$5'); } else if (value.length > 8) { value = value.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, '$1.$2.$3/$4'); } else if (value.length > 5) { value = value.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, '$1.$2.$3'); } else if (value.length > 2) { value = value.replace(/^(\d{2})(\d{0,3}).*/, '$1.$2'); } return value; };

    if (supplierPhoneInput) supplierPhoneInput.addEventListener('input', (e) => e.target.value = maskPhone(e.target.value));
    if (supplierCnpjInput) supplierCnpjInput.addEventListener('input', (e) => e.target.value = maskCnpj(e.target.value));

    // --- Funções Utilitárias (Dados) ---
    const loadData = (key, defaultVal = []) => { const d = localStorage.getItem(key); try { return d ? JSON.parse(d) : defaultVal; } catch (e) { console.error(`Error loading ${key}:`, e); return defaultVal; }};
    const saveData = (key, data) => { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error(`Error saving ${key}:`, e); }};
    const loadSuppliersFromStorage = () => loadData(STORAGE_KEY_SUPPLIERS);
    const saveSuppliersToStorage = (suppliersToSave) => saveData(STORAGE_KEY_SUPPLIERS, suppliersToSave);
    const cleanInputForStorage = (value = '') => String(value).replace(/\D/g, '');
    const formatPhoneForDisplay = (phone) => { const cleaned = cleanInputForStorage(phone); if (!cleaned) return "N/A"; if (cleaned.startsWith('55') && cleaned.length >= 12) { const ddd = cleaned.substring(2, 4); const numberPart = cleaned.substring(4); if (numberPart.length === 9) return `+55 (${ddd}) ${numberPart.substring(0, 5)}-${numberPart.substring(5)}`; if (numberPart.length === 8) return `+55 (${ddd}) ${numberPart.substring(0, 4)}-${numberPart.substring(4)}`; } if (cleaned.length === 11) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`; if (cleaned.length === 10) return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`; return phone; };
    const formatCnpjForDisplay = (cnpj) => { const cleaned = cleanInputForStorage(cnpj); if (!cleaned || cleaned.length !== 14) return cnpj; return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'); };
    const getOccurrenceNameByKey = (key) => { const known = allKnownOccurrenceTypes.find(o => o.key === key); return known ? known.name : key; };

    // --- Gerenciamento de Tipos de Ocorrências Globais ---
    const loadAllKnownOccurrences = () => { let storedTypes = loadData(STORAGE_KEY_OCCURRENCE_TYPES, []); let initialTypes = [...PREDEFINED_OCCURRENCES]; if (Array.isArray(storedTypes) && storedTypes.every(item => typeof item === 'object' && item.key && item.name)) { storedTypes.forEach(st => { if (!initialTypes.some(it => it.key === st.key)) { initialTypes.push(st); } }); } allKnownOccurrenceTypes = initialTypes.sort((a, b) => a.name.localeCompare(b.name)); saveData(STORAGE_KEY_OCCURRENCE_TYPES, allKnownOccurrenceTypes); };
    const renderAllKnownOccurrencesDisplay = () => { if (!allOccurrencesListDisplay) return; allOccurrencesListDisplay.innerHTML = ''; if (allKnownOccurrenceTypes.length === 0) { allOccurrencesListDisplay.innerHTML = '<p>Nenhum tipo de ocorrência cadastrado.</p>'; return; } const ul = document.createElement('ul'); allKnownOccurrenceTypes.forEach(occType => { const li = document.createElement('li'); li.textContent = occType.name; const isPredefined = PREDEFINED_OCCURRENCES.some(po => po.key === occType.key); if (!isPredefined) { const removeBtn = document.createElement('button'); removeBtn.innerHTML = '&times;'; removeBtn.className = 'remove-global-occurrence-btn'; removeBtn.title = `Remover tipo "${occType.name}"`; removeBtn.onclick = () => handleDeleteGlobalOccurrenceType(occType.key); li.appendChild(removeBtn); } ul.appendChild(li); }); allOccurrencesListDisplay.appendChild(ul); };
    const populateOccurrenceSelect = (selectElement, includeDefaultOption = true, defaultOptionText = "Selecione...", selectedKey = null) => { if (!selectElement) return; const currentVal = selectedKey || selectElement.value; selectElement.innerHTML = ''; if (includeDefaultOption) { selectElement.add(new Option(defaultOptionText, "")); } allKnownOccurrenceTypes.forEach(occType => { selectElement.add(new Option(occType.name, occType.key)); }); if (selectedKey && allKnownOccurrenceTypes.some(o => o.key === selectedKey)) { selectElement.value = selectedKey; } else if (allKnownOccurrenceTypes.some(o => o.key === currentVal)) { selectElement.value = currentVal; } else if (includeDefaultOption) { selectElement.value = ""; }};
    const populateMainOccurrenceSelectInModal = (selectedKey = null) => { populateOccurrenceSelect(supplierMainOccurrenceInput, true, "Selecione o serviço principal...", selectedKey); };
    const handleAddNewGlobalOccurrenceType = () => { const newOccName = newOccurrenceTypeNameInput.value.trim(); if (!newOccName) { alert("Por favor, digite o nome para o novo tipo de ocorrência."); newOccurrenceTypeNameInput.focus(); return; } const newOccKey = newOccName.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, ''); if (!newOccKey) { alert("Nome da ocorrência inválido. Use letras e números."); return; } if (allKnownOccurrenceTypes.some(occ => occ.key === newOccKey || occ.name.toLowerCase() === newOccName.toLowerCase())) { alert("Este tipo de ocorrência (nome ou chave gerada) já existe."); return; } allKnownOccurrenceTypes.push({ key: newOccKey, name: newOccName }); allKnownOccurrenceTypes.sort((a,b) => a.name.localeCompare(b.name)); saveData(STORAGE_KEY_OCCURRENCE_TYPES, allKnownOccurrenceTypes); renderAllKnownOccurrencesDisplay(); populateMainOccurrenceSelectInModal(); newOccurrenceTypeNameInput.value = ''; alert(`Novo tipo de ocorrência "${newOccName}" cadastrado com sucesso!`); };
    const handleDeleteGlobalOccurrenceType = (keyToDelete) => { if (PREDEFINED_OCCURRENCES.some(po => po.key === keyToDelete)) { alert("Ocorrências predefinidas não podem ser excluídas."); return; } if (confirm(`Tem certeza que deseja excluir o tipo de ocorrência "${getOccurrenceNameByKey(keyToDelete)}"? Esta ação não pode ser desfeita e pode afetar fornecedores existentes.`)) { allKnownOccurrenceTypes = allKnownOccurrenceTypes.filter(occ => occ.key !== keyToDelete); saveData(STORAGE_KEY_OCCURRENCE_TYPES, allKnownOccurrenceTypes); renderAllKnownOccurrencesDisplay(); populateMainOccurrenceSelectInModal(); } };
    if (addNewGlobalOccurrenceTypeBtn) addNewGlobalOccurrenceTypeBtn.addEventListener('click', handleAddNewGlobalOccurrenceType);

    // --- Renderização da Tabela de Fornecedores ---
    const renderSuppliersTable = () => {
        suppliersListContainer.innerHTML = '';
        if (suppliers.length === 0) { suppliersListContainer.innerHTML = '<p class="empty-list-message">Nenhum fornecedor cadastrado.</p>'; return; }
        const table = document.createElement('table');
        table.innerHTML = `<thead><tr><th>Nome</th><th>Telefone</th><th>Serviço Principal</th><th>Contrato?</th><th>CNPJ</th><th>Ações</th></tr></thead><tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        suppliers.sort((a, b) => a.name.localeCompare(b.name)).forEach(supplier => {
            const row = tbody.insertRow();
            row.insertCell().textContent = supplier.name;
            row.insertCell().textContent = formatPhoneForDisplay(supplier.phone);
            row.insertCell().textContent = getOccurrenceNameByKey(supplier.mainOccurrence);
            row.insertCell().textContent = supplier.hasContract ? 'Sim' : 'Não';
            row.insertCell().textContent = supplier.cnpj ? formatCnpjForDisplay(supplier.cnpj) : 'N/A';
            const actionsCell = row.insertCell(); actionsCell.className = 'actions-cell';
            const editButton = document.createElement('button'); editButton.innerHTML = '<i class="material-icons">edit</i> Editar'; editButton.className = 'btn btn-secondary';
            editButton.onclick = () => openSupplierModal(true, supplier.id); // Ajustado para chamar openSupplierModal
            actionsCell.appendChild(editButton);
            const deleteButton = document.createElement('button'); deleteButton.innerHTML = '<i class="material-icons">delete</i> Excluir'; deleteButton.className = 'btn btn-danger';
            deleteButton.onclick = () => handleDeleteSupplier(supplier.id); // Ajustado para chamar handleDeleteSupplier
            actionsCell.appendChild(deleteButton);
        });
        suppliersListContainer.appendChild(table);
    };
    
    const handleDeleteSupplier = (id) => { 
        if (confirm('Tem certeza que deseja excluir este fornecedor?')) { 
            suppliers = suppliers.filter(s => s.id !== id); 
            saveSuppliersToStorage(suppliers); 
            renderSuppliersTable(); 
        } 
    };

    // --- Modal e Formulário de Fornecedor ---
    const openSupplierModal = (isEditMode = false, supplierIdToEdit = null) => {
        supplierForm.reset();
        supplierIdInput.value = '';
        
        populateMainOccurrenceSelectInModal(); // Popula o select de ocorrência principal no modal

        if (isEditMode && supplierIdToEdit) {
            const supplier = suppliers.find(s => s.id === supplierIdToEdit);
            if (!supplier) { alert("Fornecedor não encontrado para edição."); return; }
            if(supplierModalTitle) supplierModalTitle.textContent = 'Editar Fornecedor';
            supplierIdInput.value = supplier.id;
            supplierNameInput.value = supplier.name;
            supplierCnpjInput.value = supplier.cnpj ? maskCnpj(supplier.cnpj) : '';
            supplierPhoneInput.value = supplier.phone ? maskPhone(cleanInputForStorage(supplier.phone)) : '';
            supplierMainOccurrenceInput.value = supplier.mainOccurrence; // Define o valor do select
            supplierHasContractInput.checked = supplier.hasContract || false;
        } else {
            if(supplierModalTitle) supplierModalTitle.textContent = 'Adicionar Novo Fornecedor';
        }
        if(supplierFormModal) supplierFormModal.classList.remove('hidden');
        if(supplierNameInput) supplierNameInput.focus();
    };

    const closeSupplierModal = () => {
        if(supplierFormModal) supplierFormModal.classList.add('hidden');
    };

    if (openAddSupplierModalBtn) openAddSupplierModalBtn.addEventListener('click', () => openSupplierModal(false));
    if (closeSupplierModalBtn) closeSupplierModalBtn.addEventListener('click', closeSupplierModal);
    if (cancelEditBtnModal) cancelEditBtnModal.addEventListener('click', closeSupplierModal);
    if (supplierFormModal) supplierFormModal.addEventListener('click', (e) => { if (e.target === supplierFormModal) closeSupplierModal(); });
        
    supplierForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = supplierIdInput.value ? parseInt(supplierIdInput.value) : Date.now();
        const name = supplierNameInput.value.trim();
        const cnpj = cleanInputForStorage(supplierCnpjInput.value.trim());
        const phoneRaw = cleanInputForStorage(supplierPhoneInput.value.trim());
        const mainOccurrence = supplierMainOccurrenceInput.value;
        const hasContract = supplierHasContractInput.checked;

        if (!name || !phoneRaw || !mainOccurrence) { alert('Nome, Telefone e Serviço Principal são obrigatórios.'); return; }
        if (cnpj && cnpj.length !== 14 && cnpj.length !== 0) { alert('CNPJ inválido. Deve conter 14 dígitos ou ser deixado em branco.'); supplierCnpjInput.focus(); return; }
        if (phoneRaw.length < 10 || phoneRaw.length > 11) { alert('Telefone inválido. Deve conter 10 ou 11 dígitos (com DDD).'); supplierPhoneInput.focus(); return; }

        const phone = phoneRaw.startsWith('55') ? phoneRaw : `55${phoneRaw}`;
        
        const supplierData = {
            id, name, cnpj, phone, mainOccurrence, hasContract
            // additionalOccurrences não existe mais aqui
        };
        const existingIndex = suppliers.findIndex(s => s.id === id);
        if (existingIndex > -1) {
            suppliers[existingIndex] = supplierData;
        } else {
            if (suppliers.some(s => s.name.toLowerCase() === name.toLowerCase() || cleanInputForStorage(s.phone) === phone)) {
                if (!confirm("Já existe um fornecedor com nome ou telefone similar. Deseja adicionar mesmo assim?")) return;
            }
            suppliers.push(supplierData);
        }
        saveSuppliersToStorage(suppliers);
        renderSuppliersTable();
        closeSupplierModal();
    });
    loadAllKnownOccurrences();
    renderAllKnownOccurrencesDisplay();
    populateMainOccurrenceSelectInModal(); // Popula o select no modal ao carregar
    
    suppliers = loadSuppliersFromStorage();
    renderSuppliersTable();
    
    if(supplierNameInput) supplierNameInput.focus(); // Foco no primeiro campo da página, se visível, ou do modal ao abrir
});