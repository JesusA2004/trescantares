<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { defaultLayout } from './types';
import type { BreakpointLayout, MenuBreakpoint } from './types';

const props = withDefaults(
    defineProps<{
        elementKey: string;
        label?: string;
        layout?: BreakpointLayout;
        breakpoint: MenuBreakpoint;
        editable?: boolean;
        selected?: boolean;
        /** Factor de escala del lienzo (zoom del editor) para convertir px
         * de pantalla a px reales del documento. 1 en el menú público. */
        scaleFactor?: number;
    }>(),
    {
        label: '',
        layout: () => defaultLayout(),
        editable: false,
        selected: false,
        scaleFactor: 1,
    },
);

const emit = defineEmits<{
    select: [elementKey: string];
    commit: [
        elementKey: string,
        breakpoint: MenuBreakpoint,
        layout: BreakpointLayout,
    ];
}>();

const root = useTemplateRef<HTMLDivElement>('root');

// Delta en curso (px reales, ya des-escalados) durante un arrastre/resize
// activo, sumado en vivo al valor guardado para que el movimiento se vea
// mientras el puntero se mueve; se resuelve a un nuevo layout al soltar.
const gesture = ref<{ kind: 'move' | 'resize'; dx: number; dy: number } | null>(
    null,
);

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

const liveWidth = computed(() => {
    const base = props.layout.width;

    if (gesture.value?.kind !== 'resize') {
        return base;
    }

    const parentWidth =
        root.value?.parentElement?.getBoundingClientRect().width;

    if (!parentWidth) {
        return base;
    }

    const baseWidthPx =
        base !== null
            ? (base / 100) * parentWidth
            : ((
                  root.value?.firstElementChild as HTMLElement | null
              )?.getBoundingClientRect().width ?? parentWidth);

    return clamp(
        ((baseWidthPx + gesture.value.dx) / parentWidth) * 100,
        5,
        100,
    );
});

const style = computed(() => {
    const l = props.layout;
    const dx = gesture.value?.kind === 'move' ? gesture.value.dx : 0;
    const dy = gesture.value?.kind === 'move' ? gesture.value.dy : 0;
    const moveX = l.move_x + dx;
    const moveY = l.move_y + dy;

    const out: Record<string, string | number> = {};

    if (moveX !== 0 || moveY !== 0) {
        out.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    }

    if (liveWidth.value !== null) {
        out.width = `${liveWidth.value}%`;
    }

    if (l.z_index !== 1) {
        out.position = 'relative';
        out.zIndex = l.z_index;
    }

    return out;
});

function startDrag(event: PointerEvent) {
    if (!props.editable) {
        return;
    }

    if ((event.target as HTMLElement).closest('[data-mev-resize-handle]')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const startX = event.clientX;
    const startY = event.clientY;
    gesture.value = { kind: 'move', dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        gesture.value = {
            kind: 'move',
            dx: (e.clientX - startX) / props.scaleFactor,
            dy: (e.clientY - startY) / props.scaleFactor,
        };
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);

        const dx = (e.clientX - startX) / props.scaleFactor;
        const dy = (e.clientY - startY) / props.scaleFactor;
        gesture.value = null;

        if (dx === 0 && dy === 0) {
            return;
        }

        const layout: BreakpointLayout = {
            move_x: clamp(props.layout.move_x + dx, -2000, 2000),
            move_y: clamp(props.layout.move_y + dy, -2000, 2000),
            width: props.layout.width,
            z_index: props.layout.z_index,
        };

        emit('commit', props.elementKey, props.breakpoint, layout);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}

function startResize(event: PointerEvent) {
    if (!props.editable) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const startX = event.clientX;
    gesture.value = { kind: 'resize', dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        gesture.value = {
            kind: 'resize',
            dx: (e.clientX - startX) / props.scaleFactor,
            dy: 0,
        };
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);

        const dx = (e.clientX - startX) / props.scaleFactor;
        gesture.value = null;

        if (dx === 0) {
            return;
        }

        const layout: BreakpointLayout = {
            move_x: props.layout.move_x,
            move_y: props.layout.move_y,
            width: liveWidth.value,
            z_index: props.layout.z_index,
        };

        emit('commit', props.elementKey, props.breakpoint, layout);
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}

function nudge(event: KeyboardEvent) {
    if (!props.editable) {
        return;
    }

    const keys: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
    };

    const delta = keys[event.key];

    if (!delta) {
        return;
    }

    event.preventDefault();
    emit('select', props.elementKey);

    const step = event.shiftKey ? 10 : 1;

    const layout: BreakpointLayout = {
        move_x: clamp(props.layout.move_x + delta[0] * step, -2000, 2000),
        move_y: clamp(props.layout.move_y + delta[1] * step, -2000, 2000),
        width: props.layout.width,
        z_index: props.layout.z_index,
    };

    emit('commit', props.elementKey, props.breakpoint, layout);
}

function selectFromFocus() {
    if (props.editable) {
        emit('select', props.elementKey);
    }
}
</script>

<template>
    <div
        ref="root"
        class="tc-mev"
        :class="{
            'tc-mev--editable': editable,
            'tc-mev--selected': editable && selected,
        }"
        :style="style"
        :tabindex="editable ? 0 : undefined"
        :aria-label="editable ? label || elementKey : undefined"
        @pointerdown="startDrag"
        @keydown="nudge"
        @focus="selectFromFocus"
    >
        <slot />
        <span
            v-if="editable && selected"
            class="tc-mev-label"
            aria-hidden="true"
            >{{ label || elementKey }}</span
        >
        <div
            v-if="editable && selected"
            data-mev-resize-handle
            class="tc-mev-handle"
            @pointerdown="startResize"
        />
    </div>
</template>

<style scoped>
/* A propósito no fija display/position aquí: el host (.tc-mp-photo, un
   título, etc.) ya trae el display que necesita (flex, block…) y le
   agregamos esta clase encima — imponer display:block pisaría eso. transform
   funciona en cualquier elemento de caja sin necesitar position:relative;
   z-index si lo necesita, se activa vía estilo inline solo cuando aplica
   (ver computed `style`). */
.tc-mev--editable {
    cursor: grab;
    outline-offset: 2px;
}

.tc-mev--editable:hover {
    outline: 1.5px dashed rgba(109, 76, 255, 0.55);
}

.tc-mev--selected {
    outline: 2px solid var(--tc-blue, #144e8f) !important;
    cursor: grabbing;
    position: relative;
}

.tc-mev-label {
    position: absolute;
    top: -22px;
    left: 0;
    background: var(--tc-blue, #144e8f);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 999;
    pointer-events: none;
}

.tc-mev-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--tc-blue, #144e8f);
    border: 2px solid #fff;
    cursor: nwse-resize;
    z-index: 999;
}
</style>
