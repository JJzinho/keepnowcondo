// script/location_config.js

/**
 * Função principal que inicia o construtor de locais dentro de um container específico.
 * Esta função é chamada pelo `cadastro.js`.
 * @param {string} containerId - O ID do elemento DIV onde a interface será construída.
 */
function initializeLocationConfig(containerId) {
    const wrapper = document.getElementById(containerId);
    if (!wrapper) return;

    wrapper.innerHTML = `
        <div id="categories-container-wrapper"></div>
        <button type="button" class="add-btn-condo" id="add-category-btn">+ Adicionar Categoria (Ex: Área Comum)</button>
        
        <div id="floors-container-wrapper" class="location-group"></div>
        <button type="button" class="add-btn-condo" id="add-floor-btn">+ Adicionar Pavimento (Ex: Térreo)</button>
        
        <div id="custom-locations-container-wrapper" class="location-group"></div>
        <button type="button" class="add-btn-condo" id="add-custom-location-btn">+ Adicionar Local Personalizado (Ex: Casa de Bombas)</button>
    `;

    document.getElementById('add-category-btn').addEventListener('click', () => createCategoryInput());
    document.getElementById('add-floor-btn').addEventListener('click', () => createFloorInput());
    document.getElementById('add-custom-location-btn').addEventListener('click', () => createCustomLocationInput());
}

/**
 * Lê a interface e compila todos os dados inseridos em um único objeto JSON.
 * Esta função é chamada pelo `cadastro.js` no momento do submit.
 * @returns {object} - O objeto de configuração de locais pronto para ser enviado ao Supabase.
 */
function getLocationConfigData() {
    const config = {
        categorias: {},
        pavimentos: [],
        locaisPersonalizados: []
    };

    // Compila as categorias, áreas e equipamentos
    document.querySelectorAll('.category-container-location').forEach(catDiv => {
        const categoryName = catDiv.querySelector('.category-input-location').value.trim();
        if (!categoryName) return;

        config.categorias[categoryName] = { areas: {} };

        catDiv.querySelectorAll('.area-container-location').forEach(areaDiv => {
            const areaName = areaDiv.querySelector('.area-input-location').value.trim();
            if (!areaName) return;

            const equipments = [];
            areaDiv.querySelectorAll('.equipment-input-location').forEach(equipInput => {
                const equipName = equipInput.value.trim();
                if (equipName) {
                    equipments.push(equipName);
                }
            });
            config.categorias[categoryName].areas[areaName] = equipments;
        });
    });

    // Compila os pavimentos
    document.querySelectorAll('.floor-input-location').forEach(floorInput => {
        const floorName = floorInput.value.trim();
        if (floorName) {
            config.pavimentos.push(floorName);
        }
    });

    // Compila os locais personalizados
    document.querySelectorAll('.custom-location-input-location').forEach(customInput => {
        const customName = customInput.value.trim();
        if (customName) {
            config.locaisPersonalizados.push(customName);
        }
    });

    return config;
}


// --- Funções Auxiliares para construir a UI ---
// Estas funções criam os campos na tela. A lógica de salvar foi removida.

function createCategoryInput() {
    const container = document.getElementById('categories-container-wrapper');
    const categoryId = 'category-' + Date.now();
    const div = document.createElement('div');
    div.className = 'category-container-location';
    div.id = categoryId;
    div.innerHTML = `
        <div class="input-group-location with-delete">
            <input type="text" class="category-input-location" placeholder="Nome da Categoria">
            <button type="button" class="delete-btn-location">&times;</button>
        </div>
        <div class="areas-wrapper-location"></div>
        <button type="button" class="add-area-btn-location">+ Adicionar Área/Local</button>
    `;
    container.appendChild(div);

    div.querySelector('.delete-btn-location').addEventListener('click', () => div.remove());
    div.querySelector('.add-area-btn-location').addEventListener('click', (e) => {
        const areasWrapper = e.target.previousElementSibling;
        createAreaInput(areasWrapper);
    });
}

function createAreaInput(container) {
    const areaId = 'area-' + Date.now();
    const div = document.createElement('div');
    div.className = 'area-container-location';
    div.id = areaId;
    div.innerHTML = `
        <div class="input-group-location with-delete indented">
            <input type="text" class="area-input-location" placeholder="Nome da Área/Local (Ex: Piscina)">
            <button type="button" class="delete-btn-location">&times;</button>
        </div>
        <div class="equipments-wrapper-location"></div>
        <button type="button" class="add-equipment-btn-location">+ Adicionar Equipamento</button>
    `;
    container.appendChild(div);

    div.querySelector('.delete-btn-location').addEventListener('click', () => div.remove());
    div.querySelector('.add-equipment-btn-location').addEventListener('click', (e) => {
        const equipmentsWrapper = e.target.previousElementSibling;
        createEquipmentInput(equipmentsWrapper);
    });
}

function createEquipmentInput(container) {
    const equipId = 'equip-' + Date.now();
    const div = document.createElement('div');
    div.className = 'input-group-location with-delete more-indented';
    div.id = equipId;
    div.innerHTML = `
        <input type="text" class="equipment-input-location" placeholder="Nome do Equipamento (Ex: Motor)">
        <button type="button" class="delete-btn-location">&times;</button>
    `;
    container.appendChild(div);
    div.querySelector('.delete-btn-location').addEventListener('click', () => div.remove());
}

function createFloorInput() {
    const container = document.getElementById('floors-container-wrapper');
    const floorId = 'floor-' + Date.now();
    const div = document.createElement('div');
    div.className = 'input-group-location with-delete';
    div.id = floorId;
    div.innerHTML = `
        <input type="text" class="floor-input-location" placeholder="Nome do Pavimento">
        <button type="button" class="delete-btn-location">&times;</button>
    `;
    container.appendChild(div);
    div.querySelector('.delete-btn-location').addEventListener('click', () => div.remove());
}

function createCustomLocationInput() {
    const container = document.getElementById('custom-locations-container-wrapper');
    const customId = 'custom-' + Date.now();
    const div = document.createElement('div');
    div.className = 'input-group-location with-delete';
    div.id = customId;
    div.innerHTML = `
        <input type="text" class="custom-location-input-location" placeholder="Nome do Local">
        <button type="button" class="delete-btn-location">&times;</button>
    `;
    container.appendChild(div);
    div.querySelector('.delete-btn-location').addEventListener('click', () => div.remove());
}