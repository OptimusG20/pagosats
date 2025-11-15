document.addEventListener('DOMContentLoaded', () => {

    // --- Selectores del DOM ---
    const amountInput = document.getElementById('amount');
    const descriptionInput = document.getElementById('description');
    const generateInvoiceBtn = document.getElementById('generateInvoiceBtn');
    const invoiceDisplay = document.getElementById('invoiceDisplay');
    const qrcodeDiv = document.getElementById('qrcode');
    const invoiceTextP = document.getElementById('invoice-text');
    const copyInvoiceBtn = document.querySelector('.copy-invoice-btn');
    const invoiceStatusP = document.getElementById('invoice-status');
    const pendingInvoicesList = document.getElementById('pendingInvoicesList');

    // --- Configuración (se cargarán desde localStorage) ---
    let SETTINGS = {};
    const SETTINGS_KEY = 'nomina_settings';
    const PENDING_INVOICES_KEY = 'nomina_pending_invoices';

    // --- Base de Datos Local ---
    let pendingInvoices = JSON.parse(localStorage.getItem(PENDING_INVOICES_KEY)) || [];

    // --- 1. Cargar Configuración ---
    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
        if (!settings.url || !settings.adminKey) {
            alert('API Key no configurada. Por favor, ve a la sección "Billetera" y guarda tu configuración.');
            // Deshabilitar UI si no hay settings
            amountInput.disabled = true;
            descriptionInput.disabled = true;
            generateInvoiceBtn.disabled = true;
            return false;
        }
        if (!settings.url.endsWith('/')) {
            settings.url += '/';
        }
        SETTINGS = settings;
        return true;
    }

    // --- 2. Funciones de la API ---

    // Función para crear una factura (invoice)
    async function createInvoice(amount, memo) {
        if (!SETTINGS.url) return null;

        try {
            const response = await fetch(SETTINGS.url + 'api/v1/payments', {
                method: 'POST',
                headers: { "X-Api-Key": SETTINGS.adminKey, "Content-Type": "application/json" },
                body: JSON.stringify({
                    "out": false, // ¡IMPORTANTE! Esto es para RECIBIR pago
                    "amount": amount,
                    "memo": memo || ""
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error desconocido al crear factura");
            
            return data; // Contiene bolt11 y payment_hash
        } catch (error) {
            console.error("Error al crear factura:", error);
            alert(`Error al crear factura: ${error.message}`);
            return null;
        }
    }

    // Función para verificar el estado de una factura
    async function checkInvoiceStatus(paymentHash) {
        if (!SETTINGS.url) return null;

        try {
            const response = await fetch(SETTINGS.url + `api/v1/payments/${paymentHash}`, {
                method: 'GET',
                headers: { "X-Api-Key": SETTINGS.adminKey }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Error al verificar factura");
            return data; // Contiene el estado 'paid'
        } catch (error) {
            console.error("Error al verificar estado de factura:", error);
            return null;
        }
    }


    // --- 3. Funciones de la UI ---

    // Función para mostrar el QR y el texto de la factura
    function displayInvoice(invoiceData) {
        qrcodeDiv.innerHTML = ''; // Limpiar QR anterior
        new QRCode(qrcodeDiv, {
            text: invoiceData.bolt11,
            width: 256,
            height: 256,
            colorDark : "#fff",
            colorLight : "transparent",
            correctLevel : QRCode.CorrectLevel.H
        });
        invoiceTextP.textContent = invoiceData.bolt11;
        invoiceDisplay.style.display = 'block';
        invoiceStatusP.textContent = 'Esperando pago...';
        invoiceStatusP.style.color = 'var(--brand-yellow)';

        // Iniciar chequeo de estado
        checkInvoicePeriodically(invoiceData.payment_hash, invoiceData.id);
    }

    // Función para añadir una factura a la lista de pendientes
    function addPendingInvoiceToList(invoice) {
        const invoiceCard = document.createElement('div');
        invoiceCard.className = 'worker-card invoice-card'; // Reutilizamos estilos
        invoiceCard.dataset.id = invoice.id;
        invoiceCard.innerHTML = `
            <div>
                <strong>${invoice.memo || 'Sin descripción'}</strong>
                <p class="small-text">${invoice.amount.toLocaleString()} SATS</p>
                <p class="small-text invoice-hash">${invoice.payment_hash.substring(0, 10)}...</p>
            </div>
            <div class="actions">
                <span class="invoice-status-badge ${invoice.paid ? 'paid' : 'pending'}">
                    ${invoice.paid ? 'Pagada' : 'Pendiente'}
                </span>
                <button class="btn btn-danger delete-invoice-btn" data-id="${invoice.id}" ${invoice.paid ? 'disabled' : ''}>
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        // Insertar al principio para ver las más recientes
        if (pendingInvoicesList.firstChild) {
            pendingInvoicesList.insertBefore(invoiceCard, pendingInvoicesList.firstChild);
        } else {
            pendingInvoicesList.appendChild(invoiceCard);
        }
        updateEmptyState();
    }

    // Guarda las facturas pendientes en localStorage
    function savePendingInvoices() {
        localStorage.setItem(PENDING_INVOICES_KEY, JSON.stringify(pendingInvoices));
        displayPendingInvoices(); // Re-renderizar la lista
    }

    // Muestra todas las facturas pendientes al cargar
    function displayPendingInvoices() {
        pendingInvoicesList.innerHTML = '';
        if (pendingInvoices.length === 0) {
            pendingInvoicesList.innerHTML = '<p style="color: var(--text-secondary);">No hay facturas pendientes.</p>';
        } else {
            // Ordenar por las más recientes primero
            pendingInvoices.sort((a, b) => b.timestamp - a.timestamp);
            pendingInvoices.forEach(invoice => addPendingInvoiceToList(invoice));
        }
        updateEmptyState();
    }

    function updateEmptyState() {
        if (pendingInvoices.length === 0) {
            pendingInvoicesList.innerHTML = '<p style="color: var(--text-secondary);">No hay facturas pendientes.</p>';
        }
    }


    // --- 4. Lógica de Chequeo de Pagos ---
    let intervalId = null; // Para guardar el ID del intervalo
    
    async function checkInvoicePeriodically(paymentHash, invoiceId, attempts = 0) {
        if (attempts >= 60) { // Limitar a 60 intentos (aprox 10 minutos)
            invoiceStatusP.textContent = 'Factura expirada o no pagada.';
            invoiceStatusP.style.color = 'var(--brand-red)';
            clearInterval(intervalId);
            return;
        }

        const invoiceStatus = await checkInvoiceStatus(paymentHash);
        if (invoiceStatus && invoiceStatus.paid) {
            invoiceStatusP.textContent = '¡Pago recibido!';
            invoiceStatusP.style.color = 'var(--brand-teal)';
            
            // Actualizar la factura en el array y localStorage
            const index = pendingInvoices.findIndex(inv => inv.id === invoiceId);
            if (index !== -1) {
                pendingInvoices[index].paid = true;
                savePendingInvoices();
            }
            clearInterval(intervalId); // Detener el chequeo
        } else {
            // Reintentar en 10 segundos
            intervalId = setTimeout(() => checkInvoicePeriodically(paymentHash, invoiceId, attempts + 1), 10000);
        }
    }

    // --- 5. Event Listeners ---

    // Listener para generar factura
    generateInvoiceBtn.addEventListener('click', async () => {
        const amount = parseInt(amountInput.value);
        const description = descriptionInput.value.trim();

        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, introduce una cantidad válida (mayor que 0).');
            return;
        }

        generateInvoiceBtn.disabled = true;
        generateInvoiceBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';

        const newInvoice = await createInvoice(amount, description);

        generateInvoiceBtn.disabled = false;
        generateInvoiceBtn.innerHTML = '<i class="fa-solid fa-plus-circle"></i> Generar Factura';

        if (newInvoice) {
            // Añadir metadatos adicionales para nuestra UI
            newInvoice.id = Date.now();
            newInvoice.memo = description;
            newInvoice.amount = amount;
            newInvoice.paid = false;
            newInvoice.timestamp = Date.now(); // Para ordenar

            pendingInvoices.push(newInvoice);
            savePendingInvoices(); // Guardar y renderizar

            displayInvoice(newInvoice); // Mostrar QR para la recién creada
            amountInput.value = '';
            descriptionInput.value = '';
        }
    });

    // Listener para copiar la factura
    copyInvoiceBtn.addEventListener('click', () => {
        const invoiceText = invoiceTextP.textContent;
        navigator.clipboard.writeText(invoiceText).then(() => {
            alert('Factura copiada al portapapeles!');
        }).catch(err => {
            console.error('Error al copiar: ', err);
            alert('Error al copiar la factura.');
        });
    });

    // Listener para eliminar facturas de la lista
    pendingInvoicesList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-invoice-btn');
        if (deleteBtn && !deleteBtn.disabled) {
            const invoiceId = parseInt(deleteBtn.dataset.id);
            const invoiceToDelete = pendingInvoices.find(inv => inv.id === invoiceId);

            if (invoiceToDelete && confirm(`¿Estás seguro de eliminar la factura por ${invoiceToDelete.amount} SATS (${invoiceToDelete.memo})?`)) {
                pendingInvoices = pendingInvoices.filter(inv => inv.id !== invoiceId);
                savePendingInvoices();
            }
        }
    });

    // --- Carga inicial ---
    if (loadSettings()) {
        displayPendingInvoices();
    }
});