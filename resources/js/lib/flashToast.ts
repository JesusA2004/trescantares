import { router } from '@inertiajs/vue3';
import { toast } from 'vue-sonner';
import type { FlashToast } from '@/types/ui';

export function initializeFlashToast(): void {
    router.on('navigate', (event) => {
        const props = (event as CustomEvent).detail?.page?.props as Record<string, unknown> | undefined;
        const flash = props?.flash as { toast?: FlashToast } | undefined;
        const data = flash?.toast;

        if (!data?.type || !data?.message) {
            return;
        }

        toast[data.type](data.message);
    });
}
