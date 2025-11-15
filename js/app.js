// --- Selectores del DOM ---
const mainBalance = document.getElementById('mainBalance');
const addWorkerBtn = document.getElementById('addWorkerBtn');
const workerNameInput = document.getElementById('workerName');
const workersListDiv = document.getElementById('workersList');
const scannerModal = document.getElementById('scanner-modal');
const closeScannerBtn = document.getElementById('close-scanner-btn');
const scanStatus = document.getElementById('scan-status');
const quickPayBtn = document.getElementById('quickPayBtn'); 

// Elementos para subir imagen
const qrImageUploadInput = document.getElementById('qr-image-upload');
const imageUploadStatus = document.getElementById('image-upload-status');

// --- Configuración (se cargarán desde localStorage) ---
let SETTINGS = {};
const SETTINGS_KEY = 'nomina_settings'; // Debe ser la misma que en wallet.js
const WORKERS_KEY = 'trabajadores_nomina';

// --- Base de Datos Local ---
let trabajadoresDB = JSON.parse(localStorage.getItem(WORKERS_KEY)) || [];

// --- Variables del Scanner ---
let html5QrCodeScanner = null;
let currentWorkerToPay = null;

// --- 1. Cargar Configuración ---
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    if (!settings.url || !settings.adminKey) {
        mainBalance.textContent = "Error: API Key no configurada";
        alert('API Key no configurada. Por favor, ve a la sección "Billetera" y guarda tu configuración.');
        return false;
    }
    // Aseguramos que la URL termine en "/"
    if (!settings.url.endsWith('/')) {
        settings.url += '/';
    }
    SETTINGS = settings;
    return true;
}

// --- 2. Funciones de la API (Ahora usan SETTINGS) ---

async function getWalletBalance() {
    if (!SETTINGS.url) return 0; // No intentes si no hay settings
    
    try {
        const response = await fetch(SETTINGS.url + 'api/v1/wallet', {
            method: 'GET',
            headers: { "X-Api-Key": SETTINGS.adminKey } 
        });
        if (!response.ok) throw new Error('No se pudo conectar a la API');
        const data = await response.json();
        return data.balance / 1000; 
    } catch (err) {
        console.error(err);
        mainBalance.textContent = "Error de API";
        alert("Error al conectar con la API. Revisa la URL y tu Admin Key en 'Billetera'.");
        return 0;
    }
}

async function pagarFactura(factura_bolt11) {
    if (!SETTINGS.url) return false;

    try {
        const response = await fetch(SETTINGS.url + 'api/v1/payments', {
            method: 'POST',
            headers: { "X-Api-Key": SETTINGS.adminKey, "Content-Type": "application/json" },
            body: JSON.stringify({ "out": true, "bolt11": factura_bolt11 })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || "Error desconocido al pagar");
        
        let successMsg = `¡Pago genérico exitoso!\nHash: ${data.payment_hash}`;
        if (currentWorkerToPay) {
            successMsg = `¡Pago exitoso a ${currentWorkerToPay.nombre}!\nHash: ${data.payment_hash}`;
        }
        alert(successMsg); 
        
        updateBalance(); 
        return true;
    } catch (error) {
        console.error("Error al pagar:", error);
        alert(`Error al pagar: ${error.message}`);
        return false;
    }
}

// --- 3. Funciones de la UI (sin cambios) ---

function updateBalance() {
    getWalletBalance().then(balance => {
        mainBalance.textContent = `${balance.toLocaleString()} SATS`;
    });
}

function mostrarTrabajadores() {
    workersListDiv.innerHTML = ''; 
    if (trabajadoresDB.length === 0) {
        workersListDiv.innerHTML = '<p style="color: var(--text-secondary);">No hay trabajadores agregados.</p>';
    }
    trabajadoresDB.forEach(worker => {
        const card = document.createElement('div');
        card.className = 'worker-card';
        card.innerHTML = `
            <div><strong>${worker.nombre}</strong></div>
            <div class="actions">
                <button class="btn btn-yellow pay-btn" data-id="${worker.id}">
                    <i class="fa-solid fa-camera"></i> Escanear Pago
                </button>
                <button class="btn btn-danger delete-btn" data-id="${worker.id}">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        workersListDiv.appendChild(card);
    });
}

function guardarTrabajadores() {
    localStorage.setItem(WORKERS_KEY, JSON.stringify(trabajadoresDB));
    mostrarTrabajadores();
}

// --- 4. Funciones del Scanner ---

// Función que se llama cuando se escanea algo (desde cámara O imagen)
const onScanSuccess = (decodedText, decodedResult) => {
    scanStatus.textContent = "¡Factura detectada! Procesando pago...";
    
    // Detenemos el scanner (si está activo)
    if (html5QrCodeScanner && html5QrCodeScanner.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCodeScanner.clear().catch(err => console.error("Error al detener scanner:", err));
    }
    
    scannerModal.style.display = 'none';
    
    // Verificamos si es una factura de Lightning
    if (decodedText && decodedText.toLowerCase().startsWith('lnbc')) {
        pagarFactura(decodedText);
    } else {
        alert("Error: El QR escaneado no es una factura de Lightning válida.");
    }
};

// Función de error de la cámara
const onScanFailure = (error) => {
    scanStatus.textContent = "Apunta la cámara al QR...";
};

function iniciarScanner() {
    scannerModal.style.display = 'flex';
    scanStatus.textContent = "Iniciando cámara...";
    imageUploadStatus.textContent = ""; // Limpiar estado de imagen
    qrImageUploadInput.value = null; // Limpiar input de archivo

    // Si ya existe un scanner, lo limpiamos antes de crear uno nuevo
    if (html5QrCodeScanner) {
        try {
            html5QrCodeScanner.clear().catch(err => console.error("Error al limpiar scanner:", err));
        } catch (e) { console.error("Fallo al limpiar scanner:", e); }
    }
    
    // Creamos el nuevo scanner
    html5QrCodeScanner = new Html5QrcodeScanner(
        "qr-reader", // ID del div donde se renderiza
        { fps: 10, qrbox: { width: 250, height: 250 } }, // Configuración
        false // verbose
    );
    
    // Iniciamos el render de la cámara
    html5QrCodeScanner.render(onScanSuccess, onScanFailure);
}

function cerrarScanner() {
    if (html5QrCodeScanner && html5QrCodeScanner.getState() === Html5QrcodeScannerState.SCANNING) {
        html5QrCodeScanner.clear().catch(err => console.error("Error al cerrar scanner:", err));
    }
    scannerModal.style.display = 'none';
    currentWorkerToPay = null;
    qrImageUploadInput.value = null; // Limpiar el input de archivo
    imageUploadStatus.textContent = "";
}


// --- 5. Event Listeners (Eventos) ---
document.addEventListener('DOMContentLoaded', () => {
    
    // Lo primero es cargar la configuración
    if (loadSettings()) {
        // Si la carga es exitosa, actualiza el saldo
        updateBalance();
    }
    
    // Mostramos trabajadores (esto no depende de la API)
    mostrarTrabajadores();

    // --- Asignar todos los listeners ---
    
    if (addWorkerBtn) {
        addWorkerBtn.addEventListener('click', () => {
            const nombre = workerNameInput.value.trim();
            if (nombre) {
                trabajadoresDB.push({ id: Date.now(), nombre: nombre });
                workerNameInput.value = ''; 
                guardarTrabajadores();
            }
        });
    }

    if (workersListDiv) {
        workersListDiv.addEventListener('click', async (e) => {
            const payButton = e.target.closest('.pay-btn');
            const deleteButton = e.target.closest('.delete-btn');

            if (payButton) {
                const workerId = payButton.dataset.id;
                currentWorkerToPay = trabajadoresDB.find(t => t.id == workerId);
                iniciarScanner();
            }
            
            if (deleteButton) {
                const workerId = deleteButton.dataset.id;
                const worker = trabajadoresDB.find(t => t.id == workerId);
                if (confirm(`¿Estás seguro de eliminar a ${worker.nombre}?`)) {
                    trabajadoresDB = trabajadoresDB.filter(t => t.id != workerId);
                    guardarTrabajadores();
                }
            }
        });
    }

    if (quickPayBtn) {
        quickPayBtn.addEventListener('click', () => {
            currentWorkerToPay = null; 
            iniciarScanner();
        });
    }

    if (closeScannerBtn) {
        closeScannerBtn.addEventListener('click', cerrarScanner);
    }

    // --- ✅ CÓDIGO CORREGIDO Y COMPLETADO ---
    // Listener para subir imagen
    if (qrImageUploadInput) {
        qrImageUploadInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const imageFile = e.target.files[0];
                imageUploadStatus.textContent = `Escaneando imagen: ${imageFile.name}...`;
                imageUploadStatus.style.color = 'var(--brand-yellow)';
                
                // Usamos la clase base Html5Qrcode para escanear un archivo
                // (El script que cargamos en admin.html nos da acceso a ambas clases)
                const html5QrCode = new Html5Qrcode("qr-reader"); // Apuntamos al div, aunque no se use

                html5QrCode.scanFile(imageFile, true) // true = showImage (no importa aquí)
                    .then(decodedText => {
                        // ¡Éxito! Usamos la misma función de éxito
                        onScanSuccess(decodedText, null);
                    })
                    .catch(err => {
                        // ¡Fallo!
                        imageUploadStatus.textContent = `Error: No se pudo leer el QR de la imagen.`;
                        imageUploadStatus.style.color = 'var(--brand-red)';
                        console.error(err);
                    });
            }
        });
    }
    // --- FIN DEL CÓDIGO CORREGIDO ---
});