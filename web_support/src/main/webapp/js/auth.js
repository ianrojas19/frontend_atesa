const API_BASE_URL = "https://backend-atesa.onrender.com/api";
const SUPPORT_LOGIN_ENDPOINT = `${API_BASE_URL}/support-users/login`;
const SUPPORT_REGISTER_ENDPOINT = `${API_BASE_URL}/support-users/register`;

function showAlert(containerId, message, type = "danger") {
    const container = document.getElementById(containerId);
    if (!container)
        return;
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            <i class="fas ${type === 'danger' ? 'fa-exclamation-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
            'fa-check-circle'} mr-2"></i>
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;
    container.style.display = "block";
}

function hideAlert(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = "";
        container.style.display = "none";
    }
}

function setFieldInvalid(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field)
        return;
    field.classList.add("is-invalid");
    let feedback = field.parentElement.querySelector(".invalid-feedback");
    if (!feedback) {
        feedback = document.createElement("div");
        feedback.classList.add("invalid-feedback");
        field.parentElement.appendChild(feedback);
    }
    feedback.textContent = message;
}

function clearFieldState(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field)
        return;
    field.classList.remove("is-invalid", "is-valid");
    const feedback = field.parentElement.querySelector(".invalid-feedback");
    if (feedback)
        feedback.textContent = "";
}

function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn)
        return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Verificando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-sign-in-alt mr-2"></i>Iniciar sesión`;
    }
}

function validateLoginForm(email, password) {
    let valid = true;
    clearFieldState("inputEmail");
    clearFieldState("inputPassword");

    if (!email || email.trim() === "") {
        setFieldInvalid("inputEmail", "El correo electrónico es obligatorio.");
        valid = false;
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setFieldInvalid("inputEmail", "Ingrese un correo electrónico válido.");
            valid = false;
        }
    }

    if (!password || password.trim() === "") {
        setFieldInvalid("inputPassword", "La contraseña es obligatoria.");
        valid = false;
    }

    return valid;
}

function saveSupportSession(user) {
    sessionStorage.setItem("connextion_support_user", JSON.stringify(user));
    sessionStorage.setItem("connextion_support_logged", "true");
}

function getSupportSessionUser() {
    const rawUser = sessionStorage.getItem("connextion_support_user");
    if (!rawUser)
        return null;
    try {
        return JSON.parse(rawUser);
    } catch (error) {
        sessionStorage.removeItem("connextion_support_user");
        sessionStorage.removeItem("connextion_support_logged");
        return null;
    }
}

function checkExistingSession() {
    const path = window.location.pathname;
    const isAuthPage = path.endsWith("login.html") || path.endsWith("register.html") || path.endsWith("/");
    if (isAuthPage && sessionStorage.getItem("connextion_support_logged") === "true") {
        window.location.href = "index.html";
    }
}

function requireSession() {
    if (sessionStorage.getItem("connextion_support_logged") !== "true" || !getSupportSessionUser()) {
        window.location.href = "login.html";
        return false;
    }
    return true;
}

function loadSessionUserName() {
    const nameElement = document.getElementById("sessionUserName");
    const roleElement = document.getElementById("sessionUserRole");

    const user = getSupportSessionUser();

    if (nameElement) {
        nameElement.textContent = user?.fullName || user?.email || "Usuario";
    }

    if (roleElement) {
        roleElement.textContent = getRoleLabel(user?.role);
    }
}

function setupLogoutButton() {
    const logoutButton = document.getElementById("btnLogout");
    if (!logoutButton)
        return;
    logoutButton.addEventListener("click", function () {
        logout();
    });
}

async function logout() {
    const user = getSupportSessionUser();
    if (user && user.id && user.role) {
        try {
            await fetch(`${API_BASE_URL}/support-users/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id: user.id,
                    role: user.role
                })
            });
        } catch (e) {
            console.error("Error logging out from server:", e);
        }
    }
    
    sessionStorage.removeItem("connextion_support_user");
    sessionStorage.removeItem("connextion_support_logged");
    window.location.href = "login.html";
}

function getRoleLabel(role) {
    if (role === "supervisor")
        return "Supervisor";
    if (role === "supporter")
        return "Agente de soporte";
    return "Usuario de soporte";
}

function enforceRoleRestrictions() {
    const user = getSupportSessionUser();
    if (user && user.role !== 'supervisor') {
        // Ocultar enlaces a bitácoras en el sidebar o cualquier lado
        document.querySelectorAll('a[href="log.html"]').forEach(el => {
            if (el.parentElement.tagName === 'LI') {
                el.parentElement.style.display = 'none';
                // También ocultar el heading anterior si es "Registro"
                const prev = el.parentElement.previousElementSibling;
                if (prev && prev.classList.contains('sidebar-heading') && prev.textContent.trim() === 'Registro') {
                    prev.style.display = 'none';
                }
            } else {
                el.parentElement.style.display = 'none';
            }
        });
        
        // Ocultar sección de asignar soportista
        const assignSec = document.getElementById('assignSection');
        if (assignSec) {
            assignSec.style.display = 'none';
        }
        
        // Si intenta entrar directamente a log.html
        if (window.location.pathname.endsWith("log.html")) {
            window.location.href = "index.html";
        }
    }
}

async function loginSupportUser(email, password) {
    setButtonLoading("btnLogin", true);
    hideAlert("alertContainer");

    try {
        const response = await fetch(SUPPORT_LOGIN_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                email: email.trim(),
                password: password
            })
        });

        if (response.status === 401 || response.status === 403) {
            showAlert("alertContainer",
                    "Correo electrónico o contraseña incorrectos. Verifique sus datos e intente de nuevo.",
                    "danger");
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const msg = errorData?.message || "Ocurrió un error en el servidor. Intente más tarde.";
            showAlert("alertContainer", msg, "danger");
            return;
        }

        const userData = await response.json();
        saveSupportSession(userData);

        const roleLabel = getRoleLabel(userData.role);
        showAlert("alertContainer",
                `Está ingresando como <strong>${userData.fullName}</strong> (${roleLabel}). Redirigiendo...`,
                "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1500);

    } catch (networkError) {
        console.error("Error de red:", networkError);
        showAlert("alertContainer",
                "No se pudo conectar al servidor. Verifique su conexión e intente de nuevo.",
                "warning");
    } finally {
        setButtonLoading("btnLogin", false);
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input)
        return;
    if (input.type === "password") {
        input.type = "text";
        iconElement.classList.remove("fa-eye");
        iconElement.classList.add("fa-eye-slash");
    } else {
        input.type = "password";
        iconElement.classList.remove("fa-eye-slash");
        iconElement.classList.add("fa-eye");
    }
}

function validateRegisterForm(name, firstSurname, secondSurname, email, password, confirmPassword) {
    let valid = true;
    const fields = ["inputName", "inputFirstSurname", "inputSecondSurname", "inputRegEmail", "inputRegPassword", "inputConfirmPassword"];
    fields.forEach(clearFieldState);

    if (!name || name.trim() === "") {
        setFieldInvalid("inputName", "El nombre es obligatorio.");
        valid = false;
    }
    if (!firstSurname || firstSurname.trim() === "") {
        setFieldInvalid("inputFirstSurname", "El primer apellido es obligatorio.");
        valid = false;
    }
    if (!secondSurname || secondSurname.trim() === "") {
        setFieldInvalid("inputSecondSurname", "El segundo apellido es obligatorio.");
        valid = false;
    }
    if (!email || email.trim() === "") {
        setFieldInvalid("inputRegEmail", "El correo electrónico es obligatorio.");
        valid = false;
    } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setFieldInvalid("inputRegEmail", "Ingrese un correo electrónico válido.");
            valid = false;
        }
    }
    if (!password || password.trim() === "") {
        setFieldInvalid("inputRegPassword", "La contraseña es obligatoria.");
        valid = false;
    } else if (password.length < 6) {
        setFieldInvalid("inputRegPassword", "La contraseña debe tener al menos 6 caracteres.");
        valid = false;
    }
    if (!confirmPassword || confirmPassword.trim() === "") {
        setFieldInvalid("inputConfirmPassword", "Debe confirmar la contraseña.");
        valid = false;
    } else if (password !== confirmPassword) {
        setFieldInvalid("inputConfirmPassword", "Las contraseñas no coinciden.");
        valid = false;
    }

    return valid;
}

function setRegisterButtonLoading(loading) {
    const btn = document.getElementById("btnRegister");
    if (!btn)
        return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Registrando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-user-plus mr-2"></i>Registrar usuario de soporte`;
    }
}

async function registerSupportUser(name, firstSurname, secondSurname, email, password, supervisor, serviceIds) {
    setRegisterButtonLoading(true);
    hideAlert("registerAlertContainer");

console.log("Body enviado:", JSON.stringify({
    name: name.trim(),
    firstSurname: firstSurname.trim(),
    secondSurname: secondSurname.trim(),
    email: email.trim(),
    password: password,
    supervisor: supervisor,
    serviceIds: serviceIds
}));

    try {
        
        const response = await fetch(SUPPORT_REGISTER_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                name: name.trim(),
                firstSurname: firstSurname.trim(),
                secondSurname: secondSurname.trim(),
                email: email.trim(),
                password: password,
                supervisor: supervisor,
                serviceIds: serviceIds
            })
        });

        if (response.status === 409) {
            showAlert("registerAlertContainer",
                    "Ya existe un usuario registrado con ese correo electrónico.",
                    "danger");
            return;
        }

        if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    console.log("Error del servidor:", JSON.stringify(errorData));
    const msg = errorData?.message || "Ocurrió un error en el servidor. Intente más tarde.";
    showAlert("registerAlertContainer", msg, "danger");
    return;
}

        showAlert("registerAlertContainer",
                "¡Usuario registrado exitosamente! Redirigiendo al inicio de sesión...",
                "success");

        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);

    } catch (networkError) {
        console.error("Error de red:", networkError);
        showAlert("registerAlertContainer",
                "No se pudo conectar al servidor. Verifique su conexión e intente de nuevo.",
                "warning");
    } finally {
        setRegisterButtonLoading(false);
    }
}

document.addEventListener("DOMContentLoaded", function () {

    checkExistingSession();

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const email = document.getElementById("inputEmail").value;
            const password = document.getElementById("inputPassword").value;

            hideAlert("alertContainer");

            if (!validateLoginForm(email, password)) {
                return;
            }

            loginSupportUser(email, password);
        });

        ["inputEmail", "inputPassword"].forEach(function (id) {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener("input", function () {
                    clearFieldState(id);
                });
            }
        });
        return;
    }

    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("inputName").value;
            const firstSurname = document.getElementById("inputFirstSurname").value;
            const secondSurname = document.getElementById("inputSecondSurname").value;
            const email = document.getElementById("inputRegEmail").value;
            const password = document.getElementById("inputRegPassword").value;
            const confirmPassword = document.getElementById("inputConfirmPassword").value;
            const supervisor = document.getElementById("inputSupervisor").checked;

            const serviceIds = supervisor
                    ? []
                    : Array.from(document.querySelectorAll(".service-checkbox:checked")).map(cb => parseInt(cb.value));

            if (!supervisor && serviceIds.length === 0) {
                showAlert("registerAlertContainer",
                        "Debe seleccionar al menos un servicio si el usuario no es supervisor.",
                        "warning");
                return;
            }

            hideAlert("registerAlertContainer");

            if (!validateRegisterForm(name, firstSurname, secondSurname, email, password, confirmPassword)) {
                return;
            }

            registerSupportUser(name, firstSurname, secondSurname, email, password, supervisor, serviceIds);
        });

        ["inputName", "inputFirstSurname", "inputSecondSurname", "inputRegEmail",
            "inputRegPassword", "inputConfirmPassword"].forEach(function (id) {
            const field = document.getElementById(id);
            if (field) {
                field.addEventListener("input", function () {
                    clearFieldState(id);
                });
            }
        });
        return;
    }

    if (requireSession()) {
        loadSessionUserName();
        setupLogoutButton();
        enforceRoleRestrictions();
    }
});