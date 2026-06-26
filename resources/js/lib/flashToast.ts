import { router } from '@inertiajs/vue3';
import { useNotify } from '@/composables/useNotify';

export function initializeFlashToast(): void {
    router.on('navigate', (event) => {
        const props = (event as CustomEvent).detail?.page?.props as Record<string, unknown> | undefined;
        const flash = props?.flash as { toast?: { type: string; message: string } } | null;
        const data = flash?.toast;

        if (!data?.type || !data?.message) return;

        const { success, error, warning, info } = useNotify();

        switch (data.type) {
            case 'success': success(data.message); break;
            case 'error': error(data.message); break;
            case 'warning': warning(data.message); break;
            case 'info': info(data.message); break;
        }
    });
}
