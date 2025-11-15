document.addEventListener('DOMContentLoaded', () => {
    
    // --- Selectores del DOM ---
    const workerListSection = document.getElementById('docWorkersListSection');
    const workerListDiv = document.getElementById('docWorkersList');
    const editorArea = document.getElementById('docEditorArea');
    const workerNameSpan = document.getElementById('docWorkerName');
    const docEditor = document.getElementById('docEditor');
    const saveDocBtn = document.getElementById('saveDocBtn');
    const backToListBtn = document.getElementById('backToListBtn');

    // --- Claves de LocalStorage ---
    const SETTINGS_KEY = 'nomina_settings';
    const WORKERS_KEY = 'trabajadores_nomina';
    const DOCS_PREFIX = 'nomina_doc_'; // Usaremos un prefijo para cada doc

    // --- Variables Globales ---
    let trabajadoresDB = [];
    let currentEditingWorkerId = null;

    // --- 1. Cargar Configuración (Solo para verificar) ---
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        if (!settings.url || !settings.adminKey) {
            console.error('API Key no configurada. Ve a "Billetera" para configurarla.');
            // No bloqueamos la página, pero es bueno saberlo
        }
    }

    // --- 2. Cargar y Mostrar Trabajadores ---
    function loadWorkers() {
        trabajadoresDB = JSON.parse(localStorage.getItem(WORKERS_KEY)) || [];
        workerListDiv.innerHTML = ''; // Limpiar lista

        if (trabajadoresDB.length === 0) {
            workerListDiv.innerHTML = '<p style="color: var(--text-secondary);">No hay trabajadores agregados. Ve al Dashboard para añadirlos.</p>';
            return;
        }

        trabajadoresDB.forEach(worker => {
            const card = document.createElement('div');
            card.className = 'doc-worker-card'; // Usaremos un estilo nuevo
            card.dataset.id = worker.id;
            card.dataset.name = worker.nombre;
            
            card.innerHTML = `
                <div>
                    <strong>${worker.nombre}</strong>
                    <p>${worker.puesto} - ${worker.salario.toLocaleString()} SATS</p>
                </div>
                <i class="fa-solid fa-chevron-right"></i>
            `;
            workerListDiv.appendChild(card);
        });
    }

    // --- 3. Mostrar el Editor para un Trabajador ---
    function showEditor(workerId, workerName) {
        currentEditingWorkerId = workerId;
        const docKey = DOCS_PREFIX + workerId;
        
        // Cargar notas guardadas
        const savedNotes = localStorage.getItem(docKey) || '';
        docEditor.value = savedNotes;

        // Configurar la UI
        workerNameSpan.textContent = workerName;
        workerListSection.style.display = 'none';
        editorArea.style.display = 'block';
    }

    // --- 4. Volver a la lista ---
    function showWorkerList() {
        currentEditingWorkerId = null;
        editorArea.style.display = 'none';
        workerListSection.style.display = 'block';
    }

    // --- 5. Guardar Documentación ---
    function saveDocumentation() {
        if (!currentEditingWorkerId) return;

        const docKey = DOCS_PREFIX + currentEditingWorkerId;
        localStorage.setItem(docKey, docEditor.value);

        // Feedback al usuario
        saveDocBtn.textContent = '¡Guardado!';
        saveDocBtn.style.backgroundColor = 'var(--brand-teal)';
        setTimeout(() => {
            saveDocBtn.innerHTML = '<i class="fa-solid fa-save"></i> Guardar Notas';
            saveDocBtn.style.backgroundColor = 'transparent';
        }, 2000);
    }

    // --- 6. Event Listeners ---
    
    // Al hacer clic en un trabajador de la lista
    workerListDiv.addEventListener('click', (e) => {
        const card = e.target.closest('.doc-worker-card');
        if (card) {
            const workerId = card.dataset.id;
            const workerName = card.dataset.name;
            showEditor(workerId, workerName);
        }
    });

    // Botón de Volver
    backToListBtn.addEventListener('click', showWorkerList);

    // Botón de Guardar
    saveDocBtn.addEventListener('click', saveDocumentation);

    // --- Carga Inicial ---
    loadSettings();
    loadWorkers();
});