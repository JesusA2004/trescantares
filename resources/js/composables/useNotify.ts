import Swal from 'sweetalert2';

function swalBase() {
    return {
        background: '#FFFFFF',
        color: '#1D1D1F',
        confirmButtonColor: '#6D4CFF',
        cancelButtonColor: '#E4E4E7',
        customClass: {
            confirmButton: 'tc-swal-btn-confirm',
            cancelButton: 'tc-swal-btn-cancel',
        },
    };
}

const toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2800,
    timerProgressBar: true,
    customClass: { popup: 'tc-swal-toast' },
    didOpen: (t) => {
        t.addEventListener('mouseenter', Swal.stopTimer);
        t.addEventListener('mouseleave', Swal.resumeTimer);
    },
});

export function useNotify() {
    function success(message: string) {
        toast.fire({
            icon: 'success',
            title: message,
            background: '#FFFFFF',
            color: '#15803d',
        });
    }

    function error(message: string) {
        toast.fire({
            icon: 'error',
            title: message,
            background: '#FFFFFF',
            color: '#b91c1c',
        });
    }

    function warning(message: string) {
        toast.fire({
            icon: 'warning',
            title: message,
            background: '#FFFFFF',
            color: '#92400e',
        });
    }

    function info(message: string) {
        toast.fire({
            icon: 'info',
            title: message,
            background: '#FFFFFF',
            color: '#1D1D1F',
        });
    }

    async function confirm(
        title: string,
        text?: string,
        opts?: {
            confirmText?: string;
            cancelText?: string;
            icon?: 'warning' | 'question' | 'error';
        },
    ) {
        const result = await Swal.fire({
            ...swalBase(),
            title,
            text,
            icon: opts?.icon ?? 'warning',
            showCancelButton: true,
            confirmButtonText: opts?.confirmText ?? 'Sí, continuar',
            cancelButtonText: opts?.cancelText ?? 'Cancelar',
            reverseButtons: true,
            focusCancel: true,
        });

        return result.isConfirmed;
    }

    async function confirmDanger(title: string, text?: string) {
        return confirm(title, text, {
            confirmText: 'Sí, eliminar',
            icon: 'warning',
        });
    }

    return { success, error, warning, info, confirm, confirmDanger };
}
