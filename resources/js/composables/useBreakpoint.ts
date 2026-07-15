import type { Ref } from 'vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { MENU_DEVICE_WIDTH } from '@/components/Public/Menu/types';

/**
 * Ancho real y continuo del viewport (px) — cada elemento del menú
 * interpola su posición/tamaño entre las vistas Móvil/Tablet/Escritorio
 * usando este valor exacto (ver resolveElementConfig en types.ts).
 *
 * 1440 (el ancla "desktop") antes de montar coincide con lo que renderiza
 * el servidor (sin acceso a window) — evita hydration mismatch y hace que
 * el HTML servido por SSR use la vista de escritorio por defecto; se
 * corrige al primer paint del cliente en onMounted.
 */
export function useViewportWidth(): Ref<number> {
    const width = ref(MENU_DEVICE_WIDTH.desktop);

    function update() {
        width.value = window.innerWidth;
    }

    let raf = 0;

    function onResize() {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(update);
    }

    onMounted(() => {
        update();
        window.addEventListener('resize', onResize);
    });

    onBeforeUnmount(() => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
    });

    return width;
}

/** @deprecated usa {@link useViewportWidth} — se mantiene como alias para no
 * romper importaciones existentes. */
export const useBreakpoint = useViewportWidth;
