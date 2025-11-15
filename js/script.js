
        // Espera a que todo el HTML esté cargado
        document.addEventListener('DOMContentLoaded', () => {
            
            const form = document.getElementById('form-trabajador');
            const listaDiv = document.getElementById('lista-trabajadores');
            const modal = document.getElementById('payment-modal');
            const closeModalBtn = document.querySelector('.close-button');
            const qrContainer = document.getElementById('qr-code-container');
            const modalTitle = document.getElementById('modal-title');
            const paymentAddress = document.getElementById('payment-address');

            // Intenta cargar los trabajadores desde localStorage
            let trabajadores = JSON.parse(localStorage.getItem('trabajadores')) || [];

            // --- Funciones Principales ---

            // Función para mostrar todos los trabajadores en la página
            const mostrarTrabajadores = () => {
                // Limpiamos la lista actual
                listaDiv.innerHTML = '';
                
                if (trabajadores.length === 0) {
                    listaDiv.innerHTML = '<p>No hay trabajadores agregados.</p>';
                    return;
                }
                
                trabajadores.forEach(trabajador => {
                    const card = document.createElement('div');
                    card.className = 'trabajador-card';
                    
                    // Creamos el HTML para la tarjeta
                    card.innerHTML = `
                        <div class="trabajador-info">
                            <strong>${trabajador.nombre}</strong>
                            <p>${trabajador.address}</p>
                        </div>
                        <div class="trabajador-acciones">
                            <button class="pay-btn">Pagar</button>
                            <button class="danger delete-btn">Eliminar</button>
                        </div>
                    `;
                    
                    // Asignamos funciones a los botones
                    card.querySelector('.pay-btn').addEventListener('click', () => {
                        iniciarPago(trabajador.nombre, trabajador.address);
                    });
                    
                    card.querySelector('.delete-btn').addEventListener('click', () => {
                        eliminarTrabajador(trabajador.id);
                    });
                    
                    listaDiv.appendChild(card);
                });
            };

            // Función para guardar la lista en localStorage y refrescar la vista
            const guardarYRefrescar = () => {
                localStorage.setItem('trabajadores', JSON.stringify(trabajadores));
                mostrarTrabajadores();
            };

            // Función para agregar un trabajador
            const agregarTrabajador = (e) => {
                e.preventDefault(); // Evita que la página se recargue
                
                const nombre = document.getElementById('nombre').value;
                const address = document.getElementById('address').value;
                
                if (nombre.trim() === '' || address.trim() === '') {
                    alert('Por favor, complete ambos campos.');
                    return;
                }
                
                const nuevoTrabajador = {
                    id: Date.now(), // Usamos la fecha como un ID único simple
                    nombre: nombre,
                    address: address
                };
                
                trabajadores.push(nuevoTrabajador);
                guardarYRefrescar();
                
                // Limpiamos el formulario
                form.reset();
            };

            // Función para eliminar un trabajador
            const eliminarTrabajador = (id) => {
                if (confirm('¿Está seguro de que desea eliminar a este trabajador?')) {
                    // Filtramos el array, dejando fuera el ID que queremos borrar
                    trabajadores = trabajadores.filter(t => t.id !== id);
                    guardarYRefrescar();
                }
            };
            
            // Función para mostrar el modal de pago
            const iniciarPago = (nombre, address) => {
                modalTitle.textContent = `Pagar a: ${nombre}`;
                paymentAddress.textContent = address;
                
                // Limpiamos el QR anterior
                qrContainer.innerHTML = '';
                
                // Generamos el nuevo QR
                new QRCode(qrContainer, {
                    text: address, // El texto a codificar (la dirección)
                    width: 200,
                    height: 200,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
                
                modal.style.display = 'block';
            };

            // --- Event Listeners ---
            
            // Cuando se envía el formulario
            form.addEventListener('submit', agregarTrabajador);
            
            // Para cerrar el modal
            closeModalBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            // Clicar fuera del modal también lo cierra
            window.addEventListener('click', (e) => {
                if (e.target == modal) {
                    modal.style.display = 'none';
                }
            });

            // --- Carga Inicial ---
            // Mostramos los trabajadores que ya estaban guardados al cargar la página
            mostrarTrabajadores();
        });
