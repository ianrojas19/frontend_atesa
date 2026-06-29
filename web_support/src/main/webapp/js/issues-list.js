const BACKEND_URL = 'https://backend-atesa.onrender.com';

const STATUS_BADGE = {
    REGISTERED: '<span class="badge badge-secondary p-2">Ingresado</span>',
    ASSIGNED: '<span class="badge badge-primary p-2">Asignado</span>',
    IN_PROGRESS: '<span class="badge badge-warning p-2">En Progreso</span>',
    RESOLVED: '<span class="badge badge-success p-2">Resuelto</span>'
};

const DEFAULT_CLASSIFICATION = '<span class="badge badge-info p-2">Media</span>';
let allIssues = [];
let issueSearchQuery = '';

function formatTimestamp(timestamp) {
    if (!timestamp)
        return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-CR') + ' ' + date.toLocaleTimeString('es-CR', {hour: '2-digit', minute: '2-digit'});
}

function renderIssues(issues) {
    const tbody = document.getElementById('issuesTableBody');
    const tableContainer = document.getElementById('tableContainer');
    const emptyMsg = document.getElementById('emptyMsg');

    tbody.innerHTML = '';

    if (!issues.length) {
        tableContainer.classList.add('d-none');
        emptyMsg.classList.remove('d-none');
        return;
    }

    emptyMsg.classList.add('d-none');
    tableContainer.classList.remove('d-none');

    issues.forEach(issue => {
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
}

function getSearchValue() {
    return issueSearchQuery.trim().replace(/^#/, '');
}

function filterIssues() {
    const query = getSearchValue();
    if (!query) {
        renderIssues(allIssues);
        return;
    }

    renderIssues(allIssues.filter(issue => String(issue.id).includes(query)));
}

function setupSearch() {
    document.querySelectorAll('.navbar-search').forEach(form => {
        const input = form.querySelector('input');
        const button = form.querySelector('button');

        form.addEventListener('submit', function (event) {
            event.preventDefault();
            filterIssues();
        });

        if (input) {
            input.addEventListener('input', function () {
                issueSearchQuery = input.value;
                document.querySelectorAll('.navbar-search input').forEach(searchInput => {
                    if (searchInput !== input) {
                        searchInput.value = issueSearchQuery;
                    }
                });
                filterIssues();
            });
        }

        if (button) {
            button.addEventListener('click', filterIssues);
        }
    });
}

function loadIssues() {
    fetch(`${BACKEND_URL}/api/issues`)
            .then(response => {
                if (!response.ok)
                    throw new Error('Error ' + response.status);
                return response.json();
            })
            .then(issues => {
                allIssues = issues;
                document.getElementById('loadingMsg').classList.add('d-none');
                renderIssues(allIssues);
            })
            .catch(error => {
                document.getElementById('loadingMsg').classList.add('d-none');
                document.getElementById('issuesTableBody').innerHTML = `
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

document.getElementById('btnLogout').addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.clear();
    window.location.href = 'login.html';
});

document.addEventListener('DOMContentLoaded', function () {
    setupSearch();
    loadIssues();
});
