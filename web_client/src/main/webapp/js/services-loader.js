/**
 * services-loader.js
 * Carga los servicios desde el backend y llena el select dinámicamente.
 */
function loadServicesIntoSelect(selectId) {
    const select = document.getElementById(selectId);

    // Mostrar estado de carga
    select.innerHTML = '<option disabled value="">Cargando servicios...</option>';

    fetch('https://backend-atesa.onrender.com/api/services')
            .then(response => {
                if (!response.ok)
                    throw new Error('Error ' + response.status);
                return response.json();
            })
            .then(services => {
                if (services.length === 0) {
                    select.innerHTML = '<option disabled value="">No hay servicios disponibles</option>';
                    return;
                }
                select.innerHTML = '<option selected disabled value="">-- Seleccione un servicio --</option>';
                services.forEach(service => {
                    const option = document.createElement('option');
                    option.value = service.id;
                    option.textContent = service.name;
                    select.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Error cargando servicios:', error);
                // Si falla el backend, cargar opciones fijas como respaldo
                select.innerHTML = `
                <option selected disabled value="">-- Seleccione un servicio --</option>
                <option value="1">Internet</option>
                <option value="2">Cable</option>
                <option value="3">Telefonía fija</option>
                <option value="4">Telefonía móvil</option>
            `;
            });
}
