const API_BASE = "https://backend-atesa.onrender.com/api/issues";
const SERVICES_API = "https://backend-atesa.onrender.com/api/services";

const clientId = Number(sessionStorage.getItem("clientId"));

let servicesMap = {};

function formatDateTime(value) {
    if (!value)
        return "-";
    const date = new Date(value);
    if (isNaN(date.getTime()))
        return value;
    return date.toLocaleString("es-CR");
}

function statusText(status) {
    switch (status) {
        case "REGISTERED":
            return "Ingresado";
        case "ASSIGNED":
            return "Asignado";
        case "IN_PROGRESS":
            return "En Progreso";
        case "RESOLVED":
            return "Resuelto";
        default:
            return status || "-";
    }
}

function serviceText(issue) {
    return servicesMap[String(issue.serviceId)] || "-";
}

async function loadServices() {
    const response = await fetch(SERVICES_API);

    if (!response.ok) {
        throw new Error("No se pudieron cargar los servicios");
    }

    const services = await response.json();

    services.forEach(service => {
        servicesMap[service.id] = service.name;
    });
}

async function loadHistory() {
    const tbody = document.getElementById("historyBody");

    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;

    try {
        const [servicesRes, issuesRes] = await Promise.all([
            fetch(SERVICES_API),
            fetch(`${API_BASE}/client/${clientId}`)
        ]);

        const services = await servicesRes.json();
        const issues = await issuesRes.json();

        servicesMap = {};
        services.forEach(s => {
            servicesMap[s.id] = s.name;
        });

        tbody.innerHTML = issues.map(issue => `
            <tr>
                <td>${issue.id ?? "-"}</td>
                <td>${servicesMap[issue.serviceId] ?? "-"}</td>
                <td>${formatDateTime(issue.registerTimestamp)}</td>
                <td>${statusText(issue.status)}</td>
                <td>
                    <a class="btn btn-sm btn-info" href="issue_detail.html?id=${issue.id}">
                        Ver detalle
                    </a>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="5">Error</td></tr>`;
    }
}
document.addEventListener("DOMContentLoaded", function () {
    const btnRefresh = document.getElementById("btnRefresh");
    if (btnRefresh) {
        btnRefresh.addEventListener("click", loadHistory);
    }
    loadHistory();
});