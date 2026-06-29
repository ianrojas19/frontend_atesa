/* 
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/JSP_Servlet/JavaScript.js to edit this template
 */
function showAlert(message, type = 'danger') {
    const container = document.getElementById('alertContainer');
    if (!container) {
        alert(message.replace(/<[^>]*>/g, ''));
        return;
    }
    container.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>`;
}

document.getElementById('formRequest').addEventListener('submit', function (event) {
    event.preventDefault();

    const data = {
        description: document.getElementById('description').value,
        contactPhone: document.getElementById('contactPhone').value,
        contactEmail: document.getElementById('contactEmail').value,
        address: document.getElementById('address').value,
        serviceId: parseInt(document.getElementById('service').value)  // número 1
    };

    const clientId = parseInt(sessionStorage.getItem('clientId'));
    if (!clientId) {
        showAlert('Sesión no válida. Por favor inicie sesión nuevamente.', 'danger');
        return;
    }

    fetch(`https://backend-atesa.onrender.com/api/issues?clientId=${clientId}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(data)
    })
            .then(response => {
                if (response.ok) {
                    response.json().then(issueGuardado => {
                        showAlert('Solicitud registrada con éxito. Número de solicitud: <strong>#' + issueGuardado.id + '</strong>', 'success');
                        document.getElementById('formRequest').reset();
                    });
                } else {
                    response.text().then(text => {
                        showAlert('Error al registrar la solicitud: ' + response.status + " " + text, 'danger');
                    });
                }
            })
            .catch(error => {
                showAlert('No se pudo conectar al servidor', 'danger');
                console.error(error);
            });
});