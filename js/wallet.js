document.addEventListener('DOMContentLoaded', () => {
    
    // --- Selectores del DOM ---
    const configForm = document.getElementById('config-form');
    const saveBtn = document.getElementById('save-settings-btn');
    const nodeUrlInput = document.getElementById('node-url');
    const apiKeyInput = document.getElementById('api-key');
    const slider = document.getElementById('savings-slider');
    const valueSpan = document.getElementById('savings-value');

    // --- Clave de almacenamiento ---
    const SETTINGS_KEY = 'nomina_settings';

    // --- 1. Cargar configuraciones guardadas ---
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        
        if (settings.url) {
            nodeUrlInput.value = settings.url;
        }
        if (settings.adminKey) {
            apiKeyInput.value = settings.adminKey;
        }
        if (settings.savings) {
            slider.value = settings.savings;
            valueSpan.innerText = settings.savings + '%';
        } else {
            valueSpan.innerText = slider.value + '%';
        }
    }

    // --- 2. Guardar configuraciones ---
    function saveSettings(e) {
        e.preventDefault(); // Evita que el formulario recargue la página
        
        const settings = {
            url: nodeUrlInput.value.trim(),
            adminKey: apiKeyInput.value.trim(),
            savings: slider.value
        };

        // Verificamos que los campos importantes estén
        if (!settings.url || !settings.adminKey) {
            alert('Por favor, completa la URL y la Admin Key.');
            return;
        }

        // Guardamos en localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

        // Damos feedback al usuario
        saveBtn.textContent = '¡Guardado!';
        saveBtn.style.backgroundColor = 'var(--brand-teal)';
        saveBtn.style.color = 'var(--bg-color)';
        
        setTimeout(() => {
            saveBtn.textContent = 'Guardar Configuración';
            saveBtn.style.backgroundColor = 'transparent';
            saveBtn.style.color = 'var(--brand-teal)';
        }, 2000);
    }

    // --- 3. Event Listeners ---
    
    // Listener para el slider (como antes)
    if (slider && valueSpan) {
        slider.addEventListener('input', () => {
            valueSpan.innerText = slider.value + '%';
        });
    }

    // Listener para el formulario
    if (configForm) {
        configForm.addEventListener('submit', saveSettings);
    }

    // --- Carga inicial ---
    loadSettings();
});