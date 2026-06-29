
const API_BASE_URL = "https://backend-atesa.onrender.com/api";
const LOGIN_ENDPOINT = `${API_BASE_URL}/users/login`;
const REGISTER_ENDPOINT = `${API_BASE_URL}/users/register`;

function showAlert(containerId, message, type = "danger") {
    const container = document.getElementById(containerId);
    if (!container) return;
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
    if (!field) return;
    field.classList.add("is-invalid");
    // Busca o crea el div de feedback
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
    if (!field) return;
    field.classList.remove("is-invalid", "is-valid");
    const feedback = field.parentElement.querySelector(".invalid-feedback");
    if (feedback) feedback.textContent = "";
}

function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Verificando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-sign-in-alt mr-2"></i>Iniciar sesión`;
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;
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

// ── Validación del formulario de registro ──

function validateRegisterForm(name, firstSurname, secondSurname, email, password, confirmPassword, address, phone) {
    let valid = true;
    const fields = ["inputName", "inputFirstSurname", "inputSecondSurname",
        "inputAddress", "inputPhone", "inputRegEmail", "inputRegPassword", "inputConfirmPassword"];
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

    if (!address || address.trim() === "") {
        setFieldInvalid("inputAddress", "La dirección es obligatoria.");
        valid = false;
    }

    if (!phone || phone.toString().trim() === "") {
        setFieldInvalid("inputPhone", "El teléfono es obligatorio.");
        valid = false;
    } else if (!/^\d+$/.test(phone.toString().trim())) {
        setFieldInvalid("inputPhone", "El teléfono solo puede contener números enteros.");
        valid = false;
    } else if (phone.toString().trim().length > 8) {
        setFieldInvalid("inputPhone", "El teléfono no puede tener más de 8 caracteres.");
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
    } else if (password.length < 8) {
        setFieldInvalid("inputRegPassword", "La contraseña debe tener al menos 8 caracteres.");
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
    if (!btn) return;
    if (loading) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>Registrando...`;
    } else {
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-user-plus mr-2"></i>Registrar cuenta`;
    }
}

async function registerUser(name, firstSurname, secondSurname, email, password, address, phone) {
    setRegisterButtonLoading(true);
    hideAlert("registerAlertContainer");

    try {
        const response = await fetch(REGISTER_ENDPOINT, {
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
                address: address.trim(),
                phone: parseInt(phone, 10)
            })
        });

        if (response.status === 409) {
            showAlert("registerAlertContainer",
                "Ya existe una cuenta registrada con ese correo electrónico.",
                "danger");
            return;
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const msg = errorData?.message || "Ocurrió un error en el servidor. Intente más tarde.";
            showAlert("registerAlertContainer", msg, "danger");
            return;
        }

        showAlert("registerAlertContainer",
            "¡Cuenta creada exitosamente! Redirigiendo al inicio de sesión...",
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

// ── Fin lógica de registro ──

function saveSession(user) {
    sessionStorage.setItem("connextion_user", JSON.stringify(user));
    sessionStorage.setItem("connextion_logged", "true");
    if (user.id !== undefined && user.id !== null) {
        sessionStorage.setItem("clientId", user.id);
    }
}

function getSessionUser() {
    const rawUser = sessionStorage.getItem("connextion_user");
    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        sessionStorage.removeItem("connextion_user");
        sessionStorage.removeItem("connextion_logged");
        return null;
    }
}

function checkExistingSession() {
    const path = window.location.pathname;
    const isAuthPage = path.endsWith("login.html") || path.endsWith("register.html") || path.endsWith("/");

    if (isAuthPage && sessionStorage.getItem("connextion_logged") === "true") {
        window.location.href = "index.html";
    }
}

function requireSession() {
    if (sessionStorage.getItem("connextion_logged") !== "true" || !getSessionUser()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function loadSessionUserName() {
    const nameElement = document.getElementById("sessionUserName");
    if (!nameElement) return;

    const user = getSessionUser();
    nameElement.textContent = user?.fullName || user?.email || "Usuario";
}

function setupLogoutButton() {
    const logoutButton = document.getElementById("btnLogout");
    if (!logoutButton) return;

    logoutButton.addEventListener("click", function () {
        logout();
    });
}

function logout() {
    sessionStorage.removeItem("connextion_user");
    sessionStorage.removeItem("connextion_logged");
    sessionStorage.removeItem("clientId");
    window.location.href = "login.html";
}

async function loginUser(email, password) {
    setButtonLoading("btnLogin", true);
    hideAlert("alertContainer");

    try {
        const response = await fetch(LOGIN_ENDPOINT, {
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
        saveSession(userData);
        showAlert("alertContainer", "¡Inicio de sesión exitoso! Redirigiendo...", "success");

        setTimeout(() => {
            window.location.href = "index.html";
        }, 1000);

    } catch (networkError) {
        console.error("Error de red:", networkError);
        showAlert("alertContainer",
            "No se pudo conectar al servidor. Verifique su conexión e intente de nuevo.",
            "warning");
    } finally {
        setButtonLoading("btnLogin", false);
    }
}

document.addEventListener("DOMContentLoaded", function () {

    checkExistingSession();

    // ── Login form ──
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

            loginUser(email, password);
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

    // ── Register form ──
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            const name = document.getElementById("inputName").value;
            const firstSurname = document.getElementById("inputFirstSurname").value;
            const secondSurname = document.getElementById("inputSecondSurname").value;
            const address = document.getElementById("inputAddress").value;
            const phone = document.getElementById("inputPhone").value;
            const email = document.getElementById("inputRegEmail").value;
            const password = document.getElementById("inputRegPassword").value;
            const confirmPassword = document.getElementById("inputConfirmPassword").value;

            hideAlert("registerAlertContainer");

            if (!validateRegisterForm(name, firstSurname, secondSurname, email, password, confirmPassword, address, phone)) {
                return;
            }

            registerUser(name, firstSurname, secondSurname, email, password, address, phone);
        });

        ["inputName", "inputFirstSurname", "inputSecondSurname", "inputAddress", "inputPhone",
            "inputRegEmail", "inputRegPassword", "inputConfirmPassword"].forEach(function (id) {
                const field = document.getElementById(id);
                if (field) {
                    field.addEventListener("input", function () {
                        clearFieldState(id);
                    });
                }
            });
        return;
    }

    // ── Protected pages ──
    if (requireSession()) {
        loadSessionUserName();
        setupLogoutButton();
    }
});
