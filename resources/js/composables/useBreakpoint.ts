import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { resolveBreakpoint } from '@/components/Public/Menu/types';
import type { MenuBreakpoint } from '@/components/Public/Menu/types';

/**
 * 'lg' antes de montar coincide con lo que renderiza el servidor (sin
 * acceso a window) — evita hydration mismatch; se corrige en onMounted.
 */
export function useBreakpoint(): Ref<MenuBreakpoint> {
    const breakpoint = ref<MenuBreakpoint>('lg');

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
