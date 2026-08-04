function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public data: unknown,
    ) {
        super(message);
    }
}

/** Deriva un mensaje ENTENDIBLE (nunca "Error al guardar" a secas) del status
 * + cuerpo de respuesta — 422 junta TODOS los mensajes de validación reales
 * del backend, 419 explica que la sesión expiró, 500 no expone el detalle
 * interno pero sí un mensaje claro (el detalle real ya queda en la consola
 * vía `data` para depurar). Compartido por sendJson/postFormWithProgress/
 * deleteJson para que cualquier fallo JSON del editor tenga el mismo nivel
 * de detalle que un formulario Inertia normal. */
function messageFor(status: number, data: unknown): string {
    if (status === 422) {
        const errors = (data as { errors?: Record<string, string[]> } | null)
            ?.errors;
        const messages = errors ? Object.values(errors).flat() : [];

        if (messages.length > 0) {
            return messages.join(' ');
        }

        return (
            (data as { message?: string } | null)?.message ??
            'Los datos enviados no son válidos.'
        );
    }

    if (status === 419) {
        return 'Tu sesión expiró. Vuelve a iniciar sesión y repite el cambio.';
    }

    if (status >= 500) {
        return 'Ocurrió un error en el servidor al guardar. Intenta de nuevo; si se repite, avisa al equipo técnico.';
    }

    return (
        (data as { message?: string } | null)?.message ??
        `La solicitud falló (código ${status}).`
    );
}

async function parseJsonBody(res: Response): Promise<unknown> {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

async function sendJson<T>(
    method: 'PATCH' | 'POST',
    url: string,
    body: unknown,
): Promise<T> {
    const res = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        body: JSON.stringify(body),
    });

    const data = await parseJsonBody(res);

    if (!res.ok) {
        throw new ApiError(messageFor(res.status, data), res.status, data);
    }

    return data as T;
}

export function patchJson<T = unknown>(url: string, body: unknown): Promise<T> {
    return sendJson<T>('PATCH', url, body);
}

export function postJson<T = unknown>(url: string, body: unknown): Promise<T> {
    return sendJson<T>('POST', url, body);
}

export async function getJson<T = unknown>(url: string): Promise<T> {
    const res = await fetch(url, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
    });

    const data = await parseJsonBody(res);

    if (!res.ok) {
        throw new ApiError(messageFor(res.status, data), res.status, data);
    }

    return data as T;
}

/** Sube un archivo (multipart/form-data) con progreso — usado por la
 * biblioteca de imágenes y cualquier subida directa desde el editor. */
export function postFormWithProgress<T = unknown>(
    url: string,
    form: FormData,
    onProgress?: (percent: number) => void,
): Promise<T> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.setRequestHeader('X-XSRF-TOKEN', xsrfToken());

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        };

        xhr.onload = () => {
            let data: unknown = null;

            try {
                data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
            } catch {
                // respuesta no-JSON — data se queda en null
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(data as T);
            } else {
                reject(
                    new ApiError(
                        messageFor(xhr.status, data),
                        xhr.status,
                        data,
                    ),
                );
            }
        };

        xhr.onerror = () =>
            reject(
                new ApiError(
                    'No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.',
                    0,
                    null,
                ),
            );
        xhr.send(form);
    });
}

/** DELETE con cuerpo JSON opcional — usado para borrar assets de la
 * biblioteca/adornos con confirmación. */
export async function deleteJson<T = unknown>(url: string): Promise<T> {
    const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
    });

    const data = await parseJsonBody(res);

    if (!res.ok) {
        throw new ApiError(messageFor(res.status, data), res.status, data);
    }

    return data as T;
}
