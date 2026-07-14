import type { Ref } from 'vue';
import { ref } from 'vue';
import { useNotify } from '@/composables/useNotify';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseAutosaveReturn<P> {
    status: Ref<AutosaveStatus>;
    schedule: (payload: P) => void;
    flush: () => Promise<void>;
    retry: () => Promise<void>;
}

/**
 * Debounce + cola de un solo guardado pendiente: si llegan varios schedule()
 * antes de que el timer dispare, solo se guarda el payload más reciente. Si
 * falla, el payload se conserva en failedPayload para que retry() lo reenvíe
 * sin perder el cambio local del usuario.
 */
export function useAutosave<P>(
    save: (payload: P) => Promise<unknown>,
    debounceMs = 500,
): UseAutosaveReturn<P> {
    const status = ref<AutosaveStatus>('idle');
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingPayload: P | null = null;
    let failedPayload: P | null = null;
    let inFlight = false;

    async function run(payload: P) {
        inFlight = true;
        status.value = 'saving';

        try {
            await save(payload);
            failedPayload = null;
            status.value = 'saved';
        } catch {
            failedPayload = payload;
            status.value = 'error';
            useNotify().error(
                'No se pudo guardar el cambio. Se conservó localmente — intenta de nuevo.',
            );
        } finally {
            inFlight = false;

            if (pendingPayload !== null) {
                const next = pendingPayload;
                pendingPayload = null;
                await run(next);
            }
        }
    }

    function schedule(payload: P) {
        pendingPayload = payload;
        status.value = 'pending';

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            timer = null;

            if (!inFlight && pendingPayload !== null) {
                const next = pendingPayload;
                pendingPayload = null;
                void run(next);
            }
        }, debounceMs);
    }

    async function flush() {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }

        if (!inFlight && pendingPayload !== null) {
            const next = pendingPayload;
            pendingPayload = null;
            await run(next);
        }
    }

    async function retry() {
        if (inFlight) {
            return;
        }

        const next = pendingPayload ?? failedPayload;

        if (next === null) {
            return;
        }

        pendingPayload = null;
        await run(next);
    }

    return { status, schedule, flush, retry };
}
