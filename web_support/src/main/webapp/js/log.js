const BACKEND_URL = 'https://backend-atesa.onrender.com';

let allLogs = [];

function escapeHtml(value) {
    return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
}

function formatTimestamp(ts) {
    if (!ts)
        return 'N/A';
    const d = new Date(ts);
    return d.toLocaleDateString('es-CR') + ' ' +
            d.toLocaleTimeString('es-CR', {hour: '2-digit', minute: '2-digit'});
}

function showMsg(message, type) {
    const el = document.getElementById('actionMsg');
    el.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show">
        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>`;
    setTimeout(() => el.innerHTML = '', 5000);
}

function getActor(log) {
    if (log.supervisorId) return `Supervisor #${log.supervisorId}`;
    if (log.supporterId) return `Soporte #${log.supporterId}`;
    return 'Desconocido';
}

function renderLogs(logs) {
    const container = document.getElementById('tableContainer');
    const loading = document.getElementById('loadingMsg');
    const emptyMsg = document.getElementById('emptyMsg');
    const tbody = document.getElementById('logsTableBody');

    loading.classList.add('d-none');
    
    if (!logs || logs.length === 0) {
        container.classList.add('d-none');
        emptyMsg.classList.remove('d-none');
        return;
    }

    container.classList.remove('d-none');
    emptyMsg.classList.add('d-none');
    
    tbody.innerHTML = logs.map(l => {
        const issueText = l.issueId ? `<a href="issue-detail.html?id=${l.issueId}">#${l.issueId}</a>` : '<span class="text-muted">-</span>';
        const isSession = l.description.toLowerCase().includes('sesión');
        const icon = isSession ? '<i class="fas fa-sign-in-alt text-info mr-1"></i>' : '<i class="fas fa-exchange-alt text-primary mr-1"></i>';

        return `
            <tr>
                <td>${formatTimestamp(l.logTimestamp)}</td>
                <td>#${l.id}</td>
                <td>${issueText}</td>
                <td>${getActor(l)}</td>
                <td>${icon} ${escapeHtml(l.description)}</td>
            </tr>
        `;
    }).join('');
}

function fetchLogs() {
    const user = getSupportSessionUser();
    const roleParam = user ? `?actorId=${user.id}&actorRole=${user.role}` : '';
    fetch(`${BACKEND_URL}/api/logs${roleParam}`)
        .then(r => r.json())
        .then(data => {
            allLogs = data;
            applyFilters();
        })
        .catch(err => {
            document.getElementById('loadingMsg').innerHTML =
                `<p class="text-danger"><i class="fas fa-exclamation-triangle"></i> Error al cargar bitácoras.</p>`;
            console.error(err);
        });
}

function applyFilters() {
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const filterVal = document.getElementById('filterSelect').value;

    const filtered = allLogs.filter(l => {
        // Text search
        const txt = `#${l.id} ${getActor(l)} ${l.description}`.toLowerCase();
        const matchesSearch = txt.includes(searchVal);

        // Type filter
        let matchesType = true;
        const isSession = !l.issueId; // If there is no issue ID, it's a session log
        if (filterVal === 'ISSUE') {
            matchesType = !isSession;
        } else if (filterVal === 'SESSION') {
            matchesType = isSession;
        }

        return matchesSearch && matchesType;
    });

    renderLogs(filtered);
}

document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterSelect').addEventListener('change', applyFilters);

document.getElementById('btnRestartLogs').addEventListener('click', function() {
    if(confirm('¿Está seguro de que desea eliminar permanentemente TODOS los registros de las bitácoras? Esta acción no se puede deshacer.')) {
        const user = getSupportSessionUser();
        const roleParam = user ? `?actorId=${user.id}&actorRole=${user.role}` : '';
        fetch(`${BACKEND_URL}/api/logs${roleParam}`, { method: 'DELETE' })
            .then(r => {
                if(!r.ok) throw new Error(r.statusText);
                return r.json();
            })
            .then(res => {
                showMsg(res.message || 'Bitácoras eliminadas correctamente.', 'success');
                fetchLogs();
            })
            .catch(err => {
                showMsg('Error al eliminar las bitácoras.', 'danger');
                console.error(err);
            });
    }
});

// Setup
document.addEventListener('DOMContentLoaded', () => {
    // Requires auth.js logic to verify session
    const user = getSupportSessionUser();
    if(!user) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('sessionUserName').textContent = user.fullName || user.email;
    document.getElementById('sessionUserRole').textContent = 
        user.role === 'supervisor' ? 'Supervisor' : 'Soporte Técnico';

    fetchLogs();
});
