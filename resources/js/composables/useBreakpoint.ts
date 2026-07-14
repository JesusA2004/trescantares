import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { MenuBreakpoint } from '@/components/Public/Menu/types';

const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

function resolveBreakpoint(width: number): MenuBreakpoint {
    if (width >= DESKTOP_MIN) {
        return 'desktop';
    }

    if (width >= TABLET_MIN) {
        return 'tablet';
    }

    return 'mobile';
}

/**
 * 'desktop' antes de montar coincide con el HTML renderizado en servidor
 * (sin acceso a window) — evita hydration mismatch; se corrige en onMounted.
 */
export function useBreakpoint(): Ref<MenuBreakpoint> {
    const breakpoint = ref<MenuBreakpoint>('desktop');

    function update() {
        breakpoint.value = resolveBreakpoint(window.innerWidth);
    }

    onMounted(() => {
        update();
        window.addEventListener('resize', update);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', update);
    });

    return breakpoint;
}
