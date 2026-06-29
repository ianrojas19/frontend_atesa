function showFormAlert(message, type) {
    if (type === undefined) type = 'danger';
    var container = document.getElementById('alertContainer');
    if (!container) return;

    if (type === 'success') {
        container.innerHTML = [
            '<div id="successToast" style="',
            'display:flex;align-items:flex-start;gap:14px;',
            'background:linear-gradient(135deg,#f0fff4 0%,#e6ffed 100%);',
            'border:1px solid #28a745;border-left:5px solid #1cc88a;',
            'border-radius:8px;padding:16px 20px;',
            'box-shadow:0 4px 16px rgba(28,200,138,0.18);',
            'margin-bottom:1.25rem;',
            'animation:slideInDown 0.35s cubic-bezier(.21,1.02,.73,1) both;">',

            '<div style="flex-shrink:0;margin-top:2px;">',
            '<span style="display:inline-flex;align-items:center;justify-content:center;',
            'width:40px;height:40px;background:#1cc88a;border-radius:50%;',
            'animation:popIn 0.4s 0.2s cubic-bezier(.21,1.02,.73,1) both;">',
            '<i class="fas fa-check" style="color:#fff;font-size:18px;"></i>',
            '</span></div>',

            '<div style="flex:1;min-width:0;">',
            '<div style="font-weight:700;color:#155724;font-size:0.97rem;margin-bottom:3px;">',
            '&#10003; Solicitud enviada correctamente',
            '</div>',
            '<div style="color:#276749;font-size:0.88rem;line-height:1.4;">',
            message,
            '</div>',
            '<div id="toastProgressBar" style="height:3px;background:#1cc88a;border-radius:2px;margin-top:10px;width:100%;transition:width linear;"></div>',
            '</div>',

            '<button onclick="var t=document.getElementById(\'successToast\');if(t){t.style.opacity=\'0\';setTimeout(function(){t.remove()},300)}" ',
            'style="background:none;border:none;color:#6c757d;font-size:1.2rem;cursor:pointer;padding:0 0 0 8px;flex-shrink:0;line-height:1;" ',
            'aria-label="Cerrar">&times;</button>',
            '</div>',

            '<style>',
            '@keyframes slideInDown{from{opacity:0;transform:translateY(-18px)}to{opacity:1;transform:translateY(0)}}',
            '@keyframes popIn{from{opacity:0;transform:scale(0.5)}to{opacity:1;transform:scale(1)}}',
            '</style>'
        ].join('');

        var bar = document.getElementById('toastProgressBar');
        var DURATION = 5000;
        if (bar) {
            bar.style.transition = 'width ' + DURATION + 'ms linear';
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { bar.style.width = '0%'; });
            });
        }
        setTimeout(function () {
            var toast = document.getElementById('successToast');
            if (toast) {
                toast.style.transition = 'opacity 0.3s ease';
                toast.style.opacity = '0';
                setTimeout(function () { toast.remove(); }, 300);
            }
        }, DURATION);
        return;
    }

    container.innerHTML = [
        '<div class="alert alert-' + type + ' alert-dismissible fade show" role="alert">',
        message,
        '<button type="button" class="close" data-dismiss="alert" aria-label="Cerrar">',
        '<span aria-hidden="true">&times;</span>',
        '</button></div>'
    ].join('');
}

document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('formRequest');
    if (!form) return;

    form.addEventListener('submit', function (event) {
        event.preventDefault();

        var serviceId = parseInt(document.getElementById('service').value);
        if (!serviceId) {
            showFormAlert('Por favor seleccione un servicio.', 'warning');
            return;
        }

        var data = {
            description: document.getElementById('description').value,
            contactPhone: document.getElementById('contactPhone').value,
            contactEmail: document.getElementById('contactEmail').value,
            address: document.getElementById('address').value,
            serviceId: serviceId
        };

        var clientId = Number(sessionStorage.getItem('clientId'));

        fetch('https://backend-atesa.onrender.com/api/issues?clientId=' + clientId, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        })
        .then(function (response) {
            if (response.ok) return response.json();
            return response.text().then(function (text) {
                throw new Error('Error ' + response.status + ': ' + text);
            });
        })
        .then(function (issueGuardado) {
            showFormAlert('Número de solicitud: <strong>#' + issueGuardado.id + '</strong>', 'success');
            form.reset();
            if (typeof loadServicesIntoSelect === 'function') {
                loadServicesIntoSelect('service');
            }
        })
        .catch(function (error) {
            showFormAlert('Ocurrió un error al registrar la solicitud: ' + error.message, 'danger');
            console.error(error);
        });
    });
});