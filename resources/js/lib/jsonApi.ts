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
