const BACKEND_URL = 'https://backend-atesa.onrender.com';
const WS_BASE = BACKEND_URL.replace(/^http/, 'ws');

const STATUS_BADGE = {
    REGISTERED: {text: 'Ingresado', cls: 'badge-secondary'},
    ASSIGNED: {text: 'Asignado', cls: 'badge-primary'},
    IN_PROGRESS: {text: 'En Progreso', cls: 'badge-warning'},
    RESOLVED: {text: 'Resuelto', cls: 'badge-success'}
};

const issueId = new URLSearchParams(window.location.search).get('id');
let currentIssue = null;
let chatSocket = null;

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

function showMsg(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el)
        return;
    el.innerHTML = `<div class="alert alert-${type} py-1 px-2 mt-2 small">
        <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i> ${message}
    </div>`;
    setTimeout(() => el.innerHTML = '', 4000);
}

function updateStatusBadge(status) {
    const st = STATUS_BADGE[status] || {text: status, cls: 'badge-secondary'};
    const badge = document.getElementById('statusBadge');
    badge.textContent = st.text;
    badge.className = `badge ${st.cls} p-2`;
}

function updateActionButtons(status) {
    const btnStart = document.getElementById('btnStart');
    if (status === 'ASSIGNED') {
        btnStart.removeAttribute('disabled');
        btnStart.title = 'Iniciar el proceso de resolución de esta solicitud';
    } else {
        btnStart.setAttribute('disabled', 'disabled');
        if (status === 'REGISTERED')
            btnStart.title = 'Primero debe asignar un soportista';
        else if (status === 'IN_PROGRESS')
            btnStart.title = 'El proceso ya fue iniciado';
        else if (status === 'RESOLVED')
            btnStart.title = 'La solicitud ya fue resuelta';
    }
}

// CU10
function loadIssue() {
    fetch(`${BACKEND_URL}/api/issues/${issueId}`)
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(issue => {
                currentIssue = issue;
                document.getElementById('loadingMsg').classList.add('d-none');
                document.getElementById('mainContent').classList.remove('d-none');

                document.getElementById('issueIdTitle').textContent = `#${issue.id}`;
                document.getElementById('issueId').textContent = `#${issue.id}`;
                document.getElementById('issueDescription').textContent = issue.description || '-';
                document.getElementById('issueService').textContent = issue.serviceId ? `ID: ${issue.serviceId}` : '-';
                document.getElementById('issueTimestamp').textContent = formatTimestamp(issue.registerTimestamp);
                document.getElementById('contactPhone').textContent = issue.contactPhone || '-';
                document.getElementById('contactEmail').textContent = issue.contactEmail || '-';
                document.getElementById('contactAddress').textContent = issue.address || '-';

                updateStatusBadge(issue.status);
                updateActionButtons(issue.status);

                if (issue.supporterId)
                    window._assignedSupporterId = issue.supporterId;
            })
            .catch(err => {
                document.getElementById('loadingMsg').innerHTML =
                        `<p class="text-danger"><i class="fas fa-exclamation-triangle"></i> Error al cargar la solicitud.</p>`;
                console.error(err);
            });
}

// CU11
function resolveAssignedSupporterName() {
    if (!window._assignedSupporterId)
        return;
    const sel = document.getElementById('supporterSelect');
    const opt = Array.from(sel.options).find(o => parseInt(o.value) === window._assignedSupporterId);
    const el = document.getElementById('assignedSupporter');
    if (opt) {
        el.textContent = opt.textContent;
        el.classList.remove('text-muted');
        el.classList.add('text-dark', 'font-weight-bold');
        sel.value = window._assignedSupporterId;
    } else {
        el.textContent = `Soportista #${window._assignedSupporterId}`;
    }
}

function loadSupporters() {
    fetch(`${BACKEND_URL}/api/support-users`)
            .then(r => r.json())
            .then(supporters => {
                const sel = document.getElementById('supporterSelect');
                supporters.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = `${s.name} ${s.firstSurname} ${s.secondSurname}`;
                    sel.appendChild(opt);
                });
                resolveAssignedSupporterName();
            })
            .catch(() => {
                document.getElementById('supporterSelect').innerHTML =
                        '<option value="">Error al cargar soportistas</option>';
            });
}

document.getElementById('btnAssign').addEventListener('click', function () {
    const supporterId = document.getElementById('supporterSelect').value;
    if (!supporterId) {
        alert('Seleccione un soportista.');
        return;
    }

    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const actorParam = user ? `&actorId=${user.id}&actorRole=${user.role}` : '';

    fetch(`${BACKEND_URL}/api/issues/${issueId}/assign?supportUserId=${supporterId}${actorParam}`, {method: 'PUT'})
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(() => {
                const sel = document.getElementById('supporterSelect');
                const name = sel.options[sel.selectedIndex].text;
                const el = document.getElementById('assignedSupporter');
                el.textContent = name;
                el.classList.remove('text-muted');
                el.classList.add('text-dark', 'font-weight-bold');
                showMsg('assignMsg', 'Soportista asignado correctamente.', 'success');

                // refrescar estado/botones
                loadIssue();
            })
            .catch(err => {
                showMsg('assignMsg', 'Error al asignar soportista.', 'danger');
                console.error(err);
            });
});

// CU12
document.getElementById('btnStart').addEventListener('click', function () {
    const btn = document.getElementById('btnStart');
    const actionMsgEl = document.getElementById('actionMsg');

    btn.setAttribute('disabled', 'disabled');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
    if (actionMsgEl)
        actionMsgEl.innerHTML = '';

    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const actorParam = user ? `?actorId=${user.id}&actorRole=${user.role}` : '';

    fetch(`${BACKEND_URL}/api/issues/${issueId}/start${actorParam}`, {method: 'PUT'})
            .then(r => {
                if (!r.ok)
                    return r.text().then(text => {
                        throw new Error(text || r.status);
                    });
                return r.json();
            })
            .then(updatedIssue => {
                updateStatusBadge(updatedIssue.status);
                updateActionButtons(updatedIssue.status);
                btn.innerHTML = '<i class="fas fa-play"></i> Iniciar Proceso';
                if (actionMsgEl) {
                    actionMsgEl.innerHTML = `<div class="alert alert-success py-1 px-2 mt-2">
                    <i class="fas fa-check-circle"></i> Proceso iniciado. La solicitud ahora está <strong>En Progreso</strong>.
                </div>`;
                    setTimeout(() => actionMsgEl.innerHTML = '', 5000);
                }
            })
            .catch(err => {
                btn.removeAttribute('disabled');
                btn.innerHTML = '<i class="fas fa-play"></i> Iniciar Proceso';
                if (actionMsgEl) {
                    actionMsgEl.innerHTML = `<div class="alert alert-danger py-1 px-2 mt-2">
                    <i class="fas fa-exclamation-triangle"></i> No se pudo iniciar el proceso. Verifique que la solicitud esté en estado <strong>Asignado</strong>.
                </div>`;
                    setTimeout(() => actionMsgEl.innerHTML = '', 6000);
                }
                console.error('CU12 error:', err);
            });
});

// CU13
function loadNotes() {
    fetch(`${BACKEND_URL}/api/issues/${issueId}/notes`)
            .then(r => r.json())
            .then(notes => {
                const container = document.getElementById('notesList');
                if (!notes || notes.length === 0) {
                    container.innerHTML = '<p class="text-muted small mb-0">Sin notas técnicas.</p>';
                    return;
                }
                container.innerHTML = notes.map(n => `
                <div class="border-left-info bg-light rounded pl-3 pr-2 py-2 mb-2">
                    <small class="text-muted d-block">${formatTimestamp(n.noteTimestamp)}</small>
                    <span class="small">${n.description}</span>
                </div>
            `).join('');
            })
            .catch(() => {
                document.getElementById('notesList').innerHTML =
                        '<p class="text-danger small">Error al cargar notas.</p>';
            });
}

document.getElementById('btnAddNote').addEventListener('click', function () {
    const description = document.getElementById('newNote').value.trim();
    if (!description) {
        alert('Ingrese el contenido de la nota.');
        return;
    }

    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const supporterId = user ? user.id : 1;

    fetch(`${BACKEND_URL}/api/issues/${issueId}/notes?supporterId=${supporterId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({description})
    })
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(() => {
                document.getElementById('newNote').value = '';
                loadNotes();
                showMsg('noteMsg', 'Nota agregada correctamente.', 'success');
            })
            .catch(err => {
                showMsg('noteMsg', 'Error al agregar la nota.', 'danger');
                console.error(err);
            });
});

function commentAuthorText(comment) {
    if (comment.authorType === 'SUPPORT' && comment.supporterId) {
        return `Soporte #${comment.supporterId}`;
    }
    if (comment.clientId) {
        return `Cliente #${comment.clientId}`;
    }
    return 'Usuario';
}

function loadComments() {
    fetch(`${BACKEND_URL}/api/issues/${issueId}/comments`)
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(comments => {
                const container = document.getElementById('commentsList');
                if (!comments || comments.length === 0) {
                    container.innerHTML = '<p class="text-muted small mb-0">Sin comentarios registrados.</p>';
                    return;
                }
                container.innerHTML = comments.map(c => `
                <div class="border-left-primary bg-light rounded pl-3 pr-2 py-2 mb-2">
                    <small class="text-muted d-block">${formatTimestamp(c.createdAt)} | ${escapeHtml(commentAuthorText(c))}</small>
                    <span class="small">${escapeHtml(c.commentText)}</span>
                </div>
            `).join('');
            })
            .catch(() => {
                document.getElementById('commentsList').innerHTML =
                        '<p class="text-danger small">Error al cargar comentarios.</p>';
            });
}

document.getElementById('btnAddComment').addEventListener('click', function () {
    const commentText = document.getElementById('newComment').value.trim();
    if (!commentText) {
        alert('Ingrese el contenido del comentario.');
        return;
    }

    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const supporterId = user ? user.id : currentIssue?.supporterId;
    if (!supporterId) {
        showMsg('commentMsg', 'No se pudo identificar el soportista.', 'danger');
        return;
    }

    const clientId = currentIssue?.clientId;
    const clientParam = clientId ? `&clientId=${clientId}` : '';

    fetch(`${BACKEND_URL}/api/issues/${issueId}/comments?supporterId=${supporterId}${clientParam}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({commentText})
    })
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(() => {
                document.getElementById('newComment').value = '';
                loadComments();
                showMsg('commentMsg', 'Comentario agregado correctamente.', 'success');
            })
            .catch(err => {
                showMsg('commentMsg', 'Error al agregar el comentario.', 'danger');
                console.error(err);
            });
});

// CU15
document.getElementById('btnResolve').addEventListener('click', function () {
    document.getElementById('resolveSection').classList.remove('d-none');
    this.classList.add('d-none');
    document.getElementById('btnStart').classList.add('d-none');
});

document.getElementById('btnCancelResolve').addEventListener('click', function () {
    document.getElementById('resolveSection').classList.add('d-none');
    document.getElementById('btnResolve').classList.remove('d-none');
    document.getElementById('btnStart').classList.remove('d-none');
    document.getElementById('resolutionComment').value = '';
});

document.getElementById('btnConfirmResolve').addEventListener('click', function () {
    const comment = document.getElementById('resolutionComment').value.trim();
    if (!comment) {
        alert('El comentario de resolución es obligatorio.');
        return;
    }

    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const actorParam = user ? `&actorId=${user.id}&actorRole=${user.role}` : '';

    fetch(`${BACKEND_URL}/api/issues/${issueId}/resolve?resolutionComment=${encodeURIComponent(comment)}${actorParam}`, {
        method: 'PUT'
    })
            .then(r => {
                if (!r.ok)
                    throw new Error(r.status);
                return r.json();
            })
            .then(issue => {
                document.getElementById('resolveSection').classList.add('d-none');
                updateStatusBadge(issue.status);
                updateActionButtons(issue.status);
                document.getElementById('btnResolve').disabled = true;
                document.getElementById('newNote').disabled = true;
                document.getElementById('btnAddNote').disabled = true;
                showMsg('actionMsg', 'Solicitud resuelta correctamente.', 'success');
            })
            .catch(err => {
                showMsg('actionMsg', 'Error al resolver la solicitud.', 'danger');
                console.error(err);
            });
});

// websocket
function connectWebSocket() {
    if (!issueId)
        return;
    const socket = new WebSocket(`${WS_BASE}/ws/status`);

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            if (data.issueId == issueId) {
                updateStatusBadge(data.status);
                updateActionButtons(data.status);
            }
        } catch (e) {
            console.error('Error processing WebSocket message:', e);
        }
    };
    socket.onclose = function () {
        setTimeout(connectWebSocket, 5000);
    };
    socket.onerror = function (err) {
        console.error('WebSocket error:', err);
        socket.close();
    };
}

// --- CHAT LOGIC ---
function renderChatMessage(msg) {
    const container = document.getElementById("chatMessages");
    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    const userId = user ? user.id : -1;
    
    // Si el mensaje es de soporte y el ID coincide con el usuario actual, es "mío"
    const isMe = msg.senderRole === "SUPPORTER" && msg.senderId === userId;
    
    const align = isMe ? "text-right" : "text-left";
    const bg = isMe ? "bg-primary text-white" : "bg-white border";
    const author = isMe ? "Tú" : (msg.senderRole === "CLIENT" ? "Cliente" : "Soporte");
    const time = formatTimestamp(msg.timestamp);

    const msgHtml = `
        <div class="mb-2 ${align}">
            <div class="small text-muted mb-1">${author} - ${time}</div>
            <div class="d-inline-block p-2 rounded ${bg}" style="max-width: 80%;">
                ${escapeHtml(msg.message)}
            </div>
        </div>
    `;
    
    const loadingText = container.querySelector(".text-center.text-muted.small");
    if (loadingText) loadingText.remove();
    
    container.insertAdjacentHTML('beforeend', msgHtml);
    container.scrollTop = container.scrollHeight;
}

async function loadChatHistory() {
    if (!issueId) return;
    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    if (!user) return;
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/issues/${issueId}/chat?userId=${user.id}&role=${user.role}`);
        if (!response.ok) throw new Error("Error cargando historial de chat");
        const messages = await response.json();
        
        const container = document.getElementById("chatMessages");
        container.innerHTML = "";
        if (messages.length === 0) {
            container.innerHTML = `<div class="text-center text-muted small">No hay mensajes aún. ¡Escribe el primero!</div>`;
        } else {
            messages.forEach(renderChatMessage);
        }
    } catch (e) {
        console.error(e);
        document.getElementById("chatMessages").innerHTML = `<div class="text-center text-danger small">Error cargando chat</div>`;
    }
}

function connectChatWebSocket() {
    if (!issueId) return;
    const user = JSON.parse(sessionStorage.getItem("connextion_support_user"));
    if (!user) return;
    
    chatSocket = new WebSocket(`${WS_BASE}/ws/chat`);
    
    chatSocket.onopen = function() {
        console.log("Chat WebSocket connected. Sending AUTH...");
        const authMsg = {
            type: "AUTH",
            issueId: parseInt(issueId),
            userId: user.id,
            role: user.role.toUpperCase()
        };
        chatSocket.send(JSON.stringify(authMsg));
    };
    
    chatSocket.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "AUTH_SUCCESS") {
                console.log("Chat AUTH successful");
            } else if (data.type === "CHAT") {
                renderChatMessage(data);
            } else if (data.error) {
                console.error("Chat Error from server:", data.error);
                showMsg('actionMsg', 'Error en chat: ' + data.error, 'danger');
            }
        } catch (e) {
            console.error("Error processing chat message", e);
        }
    };
    
    chatSocket.onclose = function() {
        console.log("Chat WebSocket disconnected. Retrying in 5 seconds...");
        setTimeout(connectChatWebSocket, 5000);
    };
}

function sendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text || !chatSocket || chatSocket.readyState !== WebSocket.OPEN) return;
    
    const msg = {
        type: "CHAT",
        message: text
    };
    chatSocket.send(JSON.stringify(msg));
    input.value = "";
}

// logout
document.getElementById('confirmLogout').addEventListener('click', () => {
    // Note: If using auth.js' logout(), it might be better to just call it.
    // Assuming auth.js is loaded and has logout() function available globally.
    if(typeof logout === 'function') {
        logout();
    } else {
        sessionStorage.clear();
        window.location.href = 'login.html';
    }
});
document.getElementById('userNameDisplay').textContent =
        sessionStorage.getItem('supporterName') || 'Soporte';

// init
if (!issueId) {
    window.location.href = 'index.html';
} else {
    document.addEventListener('DOMContentLoaded', function () {
        const chatForm = document.getElementById("chatForm");
        if (chatForm) {
            chatForm.addEventListener("submit", sendChatMessage);
        }

        loadIssue();
        loadSupporters();
        loadNotes();
        loadComments();
        connectWebSocket();
        
        loadChatHistory();
        connectChatWebSocket();
    });
}
