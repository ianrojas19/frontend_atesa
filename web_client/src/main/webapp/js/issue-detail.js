const API_BASE = "https://backend-atesa.onrender.com/api/issues";
const SERVICES_API = "https://backend-atesa.onrender.com/api/services";
const WS_BASE = API_BASE.replace(/^http/, 'ws').replace('/api/issues', '');

const clientId = Number(sessionStorage.getItem("clientId"));
const params = new URLSearchParams(window.location.search);
const issueId = Number(params.get("id"));

let chatSocket = null;
let servicesMap = {};

function escapeHtml(value) {
    return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;")
            .replaceAll("'", "&#039;");
}

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

function commentAuthorText(comment) {
    if (comment.authorType === "SUPPORT" && comment.supporterId) {
        return `Soporte #${comment.supporterId}`;
    }
    if (comment.clientId) {
        return `Cliente #${comment.clientId}`;
    }
    return "Usuario";
}

function showAlert(message, type = "danger") {
    const container = document.getElementById("detailAlert");
    if (!container)
        return;
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}
            <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;
}

function renderIssue(issue) {
    document.getElementById("issueNumber").textContent = issue.id ?? "-";
    document.getElementById("issueDate").textContent = formatDateTime(issue.registerTimestamp);
    document.getElementById("issueStatus").textContent = statusText(issue.status);
    document.getElementById("issueService").textContent = servicesMap[issue.serviceId] ?? "-";
    document.getElementById("issueDescription").textContent = issue.description || "-";
}

function renderComments(comments) {
    const container = document.getElementById("commentsList");

    if (!comments.length) {
        container.innerHTML = `<p class="text-muted mb-0">No hay comentarios registrados.</p>`;
        return;
    }

    container.innerHTML = comments.map(comment => `
        <div class="border-left-primary pl-3 py-2 mb-3">
            <div class="small text-muted mb-1">
                ${formatDateTime(comment.createdAt)} | ${escapeHtml(commentAuthorText(comment))}
            </div>
            <div>${escapeHtml(comment.commentText)}</div>
        </div>
    `).join("");
}

async function loadServices() {
    const response = await fetch(SERVICES_API);
    if (!response.ok) {
        throw new Error("No se pudieron cargar los servicios");
    }

    const services = await response.json();
    servicesMap = {};
    services.forEach(service => {
        servicesMap[service.id] = service.name;
    });
}

async function loadDetail() {
    if (!issueId) {
        showAlert("No se recibio el numero de solicitud.");
        return;
    }

    try {
        await loadServices();

        const [issueRes, commentsRes] = await Promise.all([
            fetch(`${API_BASE}/${issueId}`),
            fetch(`${API_BASE}/${issueId}/comments`)
        ]);

        if (!issueRes.ok) {
            throw new Error("No se pudo cargar la solicitud.");
        }
        if (!commentsRes.ok) {
            throw new Error("No se pudieron cargar los comentarios.");
        }

        renderIssue(await issueRes.json());
        renderComments(await commentsRes.json());
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Ocurrio un error al cargar el detalle.");
    }
}

async function addComment(event) {
    event.preventDefault();

    const textarea = document.getElementById("commentText");
    const button = document.getElementById("btnAddComment");
    const commentText = textarea.value.trim();

    textarea.classList.remove("is-invalid");

    if (!commentText) {
        textarea.classList.add("is-invalid");
        return;
    }

    button.disabled = true;
    button.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Agregando...`;

    try {
        const response = await fetch(`${API_BASE}/${issueId}/comments?clientId=${clientId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({commentText})
        });

        if (!response.ok) {
            throw new Error("No se pudo agregar el comentario.");
        }

        textarea.value = "";
        showAlert("Comentario agregado correctamente.", "success");
        await loadDetail();
    } catch (error) {
        console.error(error);
        showAlert(error.message || "Ocurrio un error al agregar el comentario.");
    } finally {
        button.disabled = false;
        button.innerHTML = `<i class="fas fa-comment-medical"></i> Agregar comentario`;
    }
}

function connectWebSocket() {
    if (!issueId) return;

    const socket = new WebSocket(`${WS_BASE}/ws/status`);

    socket.onopen = function () {
        console.log("WebSocket connected to status stream");
    };

    socket.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            if (data.issueId === issueId) {
                console.log("Real-time status update received:", data);
                const statusDiv = document.getElementById("issueStatus");
                if (statusDiv) {
                    statusDiv.textContent = statusText(data.status);
                }
            }
        } catch (e) {
            console.error("Error processing WebSocket message:", e);
        }
    };

    socket.onclose = function () {
        console.log("WebSocket disconnected. Retrying in 5 seconds...");
        setTimeout(connectWebSocket, 5000);
    };

    socket.onerror = function (err) {
        console.error("WebSocket error:", err);
        socket.close();
    };
}

// --- CHAT LOGIC ---
function renderChatMessage(msg) {
    const container = document.getElementById("chatMessages");
    const isMe = msg.senderRole === "CLIENT" && msg.senderId === clientId;
    
    const align = isMe ? "text-right" : "text-left";
    const bg = isMe ? "bg-primary text-white" : "bg-white border";
    const author = isMe ? "Tú" : (msg.senderRole === "SUPPORTER" ? "Soporte" : "Usuario");
    const time = formatDateTime(msg.timestamp);

    const msgHtml = `
        <div class="mb-2 ${align}">
            <div class="small text-muted mb-1">${author} - ${time}</div>
            <div class="d-inline-block p-2 rounded ${bg}" style="max-width: 80%;">
                ${escapeHtml(msg.message)}
            </div>
        </div>
    `;
    
    // Remove "Cargando chat..." if present
    const loadingText = container.querySelector(".text-center.text-muted.small");
    if (loadingText) loadingText.remove();
    
    container.insertAdjacentHTML('beforeend', msgHtml);
    container.scrollTop = container.scrollHeight;
}

async function loadChatHistory() {
    if (!issueId) return;
    try {
        const response = await fetch(`${API_BASE}/${issueId}/chat?userId=${clientId}&role=CLIENT`);
        if (!response.ok) throw new Error("Error cargando historial de chat");
        const messages = await response.json();
        
        const container = document.getElementById("chatMessages");
        container.innerHTML = ""; // clear loading text
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
    
    // Connect to chat websocket (using the same host as status stream, assume localhost for now)
    chatSocket = new WebSocket(`${WS_BASE}/ws/chat`);
    
    chatSocket.onopen = function() {
        console.log("Chat WebSocket connected. Sending AUTH...");
        const authMsg = {
            type: "AUTH",
            issueId: issueId,
            userId: clientId,
            role: "CLIENT"
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
                showAlert("Error en chat: " + data.error, "danger");
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

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("commentForm");
    if (form) {
        form.addEventListener("submit", addComment);
    }

    const chatForm = document.getElementById("chatForm");
    if (chatForm) {
        chatForm.addEventListener("submit", sendChatMessage);
    }

    loadDetail();
    connectWebSocket();
    
    loadChatHistory();
    connectChatWebSocket();
});
