const BACKEND_URL = 'https://backend-atesa.onrender.com';

// Mapa de estado a badge Bootstrap
const STATUS_BADGE = {
    REGISTERED: '<span class="badge badge-secondary p-2">Ingresado</span>',
    ASSIGNED: '<span class="badge badge-primary p-2">Asignado</span>',
    IN_PROGRESS: '<span class="badge badge-warning p-2">En Progreso</span>',
    RESOLVED: '<span class="badge badge-success p-2">Resuelto</span>'
};

// Clasificación por defecto
const DEFAULT_CLASSIFICATION = '<span class="badge badge-info p-2">Media</span>';

function formatTimestamp(timestamp) {
    if (!timestamp)
        return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CR') + ' ' + date.toLocaleTimeString('es-CR', {hour: '2-digit', minute: '2-digit'});
}

function calculateStatistics(issues) {
    let total = issues.length;
    let registered = issues.filter(i => i.status === 'REGISTERED').length;
    let assigned = issues.filter(i => i.status === 'ASSIGNED').length;
    let inProgress = issues.filter(i => i.status === 'IN_PROGRESS').length;

    document.getElementById('totalIssues').textContent = total;
    document.getElementById('registeredIssues').textContent = registered;
    document.getElementById('assignedIssues').textContent = assigned;
    document.getElementById('inProgressIssues').textContent = inProgress;
}

function loadIssues() {
    fetch(`${BACKEND_URL}/api/issues`)
            .then(response => {
                if (!response.ok)
                    throw new Error('Error ' + response.status);
                return response.json();
            })
            .then(issues => {
                document.getElementById('loadingMsg').classList.add('d-none');

                // Calcular estadísticas
                calculateStatistics(issues);

                if (issues.length === 0) {
                    document.getElementById('emptyMsg').classList.remove('d-none');
                    return;
                }

                // Mostrar solo las últimas 5 solicitudes
                const recentIssues = issues.slice(0, 5);

                document.getElementById('tableContainer').classList.remove('d-none');
                const tbody = document.getElementById('recentIssuesTableBody');
                tbody.innerHTML = '';

                recentIssues.forEach(issue => {
                    const statusBadge = STATUS_BADGE[issue.status] || issue.status;
                    const supporterText = issue.supporterId
                            ? `ID: ${issue.supporterId}`
                            : '<span class="text-muted">Sin asignar</span>';

                    const row = `
                    <tr>
                        <td><strong>#${issue.id}</strong></td>
                        <td>${supporterText}</td>
                        <td>${DEFAULT_CLASSIFICATION}</td>
                        <td>${statusBadge}</td>
                        <td>${formatTimestamp(issue.registerTimestamp)}</td>
                        <td>
                            <a href="issue-detail.html?id=${issue.id}"
                               class="btn btn-sm btn-primary">
                                <i class="fas fa-eye"></i> Ver detalle
                            </a>
                        </td>
                    </tr>
                `;
                    tbody.insertAdjacentHTML('beforeend', row);
                });
            })
            .catch(error => {
                document.getElementById('loadingMsg').classList.add('d-none');
                document.getElementById('recentIssuesTableBody').innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        Error al cargar las solicitudes. Verifique que el backend esté corriendo.
                    </td>
                </tr>
            `;
                document.getElementById('tableContainer').classList.remove('d-none');
                console.error('Error cargando solicitudes:', error);
            });
}

// Cargar al iniciar
document.addEventListener('DOMContentLoaded', loadIssues);