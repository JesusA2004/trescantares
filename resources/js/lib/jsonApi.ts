function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
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

    if (!res.ok) {
        throw new Error(`${method} ${url} failed with status ${res.status}`);
    }

    return (await res.json()) as T;
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

    if (!res.ok) {
        throw new Error(`GET ${url} failed with status ${res.status}`);
    }

    return (await res.json()) as T;
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
                const message =
                    (data as { message?: string } | null)?.message ??
                    `POST ${url} failed with status ${xhr.status}`;
                reject(new ApiError(message, xhr.status, data));
            }
        };

        xhr.onerror = () =>
            reject(new Error(`POST ${url} failed (network error)`));
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

    let data: unknown = null;

    try {
        data = await res.json();
    } catch {
        // sin cuerpo JSON — data se queda en null
    }

    if (!res.ok) {
        const message =
            (data as { message?: string } | null)?.message ??
            `DELETE ${url} failed with status ${res.status}`;

        throw new ApiError(message, res.status, data);
    }

    return data as T;
}
