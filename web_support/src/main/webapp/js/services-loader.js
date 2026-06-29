document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("servicesContainer");
    const supervisorCheckbox = document.getElementById("inputSupervisor");

    if (!container) return;

    function loadServices() {
        container.innerHTML = '<p class="text-muted small mb-0">Cargando servicios...</p>';

        fetch("https://backend-atesa.onrender.com/api/services")
            .then(response => {
                if (!response.ok) throw new Error("Error " + response.status);
                return response.json();
            })
            .then(services => {
                if (services.length === 0) {
                    container.innerHTML = '<p class="text-muted small mb-0">No hay servicios disponibles.</p>';
                    return;
                }
                container.innerHTML = "";
                services.forEach(service => {
                    const div = document.createElement("div");
                    div.classList.add("custom-control", "custom-checkbox", "mb-1");
                    div.innerHTML = `
                        <input type="checkbox" class="custom-control-input service-checkbox"
                            id="service_${service.id}" value="${service.id}">
                        <label class="custom-control-label" for="service_${service.id}">
                            ${service.name}
                        </label>`;
                    container.appendChild(div);
                });
            })
            .catch(() => {
                container.innerHTML = `
                    <div class="custom-control custom-checkbox mb-1">
                        <input type="checkbox" class="custom-control-input service-checkbox" id="service_1" value="1">
                        <label class="custom-control-label" for="service_1">Internet</label>
                    </div>
                    <div class="custom-control custom-checkbox mb-1">
                        <input type="checkbox" class="custom-control-input service-checkbox" id="service_2" value="2">
                        <label class="custom-control-label" for="service_2">Cable</label>
                    </div>
                    <div class="custom-control custom-checkbox mb-1">
                        <input type="checkbox" class="custom-control-input service-checkbox" id="service_3" value="3">
                        <label class="custom-control-label" for="service_3">Telefonía fija</label>
                    </div>
                    <div class="custom-control custom-checkbox mb-1">
                        <input type="checkbox" class="custom-control-input service-checkbox" id="service_4" value="4">
                        <label class="custom-control-label" for="service_4">Telefonía móvil</label>
                    </div>`;
            });
    }

    loadServices();

    if (supervisorCheckbox) {
        supervisorCheckbox.addEventListener("change", function () {
            const servicesGroup = container.closest(".form-group");
            if (this.checked) {
                servicesGroup.style.display = "none";
            } else {
                servicesGroup.style.display = "block";
            }
        });
    }
});