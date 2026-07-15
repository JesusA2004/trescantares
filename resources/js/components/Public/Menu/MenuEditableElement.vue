<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { defaultElementConfig } from './types';
import type { ElementConfig } from './types';

const props = withDefaults(
    defineProps<{
        elementKey: string;
        label?: string;
        config?: ElementConfig;
        editable?: boolean;
        selected?: boolean;
        /** 'image' conserva proporción al redimensionar por defecto. */
        kind?: 'container' | 'image' | 'text';
    }>(),
    {
        label: '',
        config: () => defaultElementConfig(),
        editable: false,
        selected: false,
        kind: 'container',
    },
);

const emit = defineEmits<{
    select: [elementKey: string];
    commit: [elementKey: string, config: ElementConfig];
}>();

const root = useTemplateRef<HTMLDivElement>('root');
const locked = computed(() => !!props.config.locked);
const interactive = computed(() => props.editable && !locked.value);

// Delta en curso (px REALES del documento — este componente siempre vive
// dentro del documento del iframe de vista previa, que nunca tiene un
// transform:scale aplicado a sí mismo, así que getBoundingClientRect() y
// clientX/clientY están siempre en el mismo sistema de coordenadas sin
// necesidad de dividir por ningún "scaleFactor" externo).
const gesture = ref<{
    kind: 'move' | 'resize' | 'rotate';
    dx: number;
    dy: number;
} | null>(null);

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

const liveWidth = computed(() => {
    const base = props.config.width;

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
            ? base
            : ((
                  root.value?.firstElementChild as HTMLElement | null
              )?.getBoundingClientRect().width ?? parentWidth);

    return Math.max(10, baseWidthPx + gesture.value.dx);
});

const style = computed(() => {
    const c = props.config;
    const dx = gesture.value?.kind === 'move' ? gesture.value.dx : 0;
    const dy = gesture.value?.kind === 'move' ? gesture.value.dy : 0;
    const x = c.x + dx;
    const y = c.y + dy;

    const transforms: string[] = [];

    if (x !== 0 || y !== 0) {
        transforms.push(`translate(${x}px, ${y}px)`);
    }

    if (c.scale !== 1) {
        transforms.push(`scale(${c.scale})`);
    }

    if (c.rotation !== 0) {
        transforms.push(`rotate(${c.rotation}deg)`);
    }

    const out: Record<string, string | number> = {};

    if (transforms.length) {
        out.transform = transforms.join(' ');
    }

    if (liveWidth.value !== null) {
        out.width = `${liveWidth.value}px`;
    }

    if (c.height !== null) {
        out.height = `${c.height}px`;
    }

    if (c.z_index !== 1) {
        out.position = 'relative';
        out.zIndex = c.z_index;
    }

    return out;
});

function currentConfigFromDom(): ElementConfig {
    if (
        props.config.x !== 0 ||
        props.config.y !== 0 ||
        props.config.width !== null
    ) {
        return { ...props.config };
    }

    // Sin personalizar aún: el offset 0,0 ya representa su posición natural
    // de flujo — no hace falta medir nada, basta con partir de la config
    // por defecto (igual que hoy se ve, sin salto visual al empezar a mover).
    return { ...defaultElementConfig(), ...props.config };
}

function startDrag(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    if ((event.target as HTMLElement).closest('[data-mev-handle]')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const baseline = currentConfigFromDom();
    const startX = event.clientX;
    const startY = event.clientY;
    gesture.value = { kind: 'move', dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        gesture.value = {
            kind: 'move',
            dx: e.clientX - startX,
            dy: e.clientY - startY,
        };
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        gesture.value = null;

        if (dx === 0 && dy === 0) {
            return;
        }

        emit('commit', props.elementKey, {
            ...baseline,
            x: clamp(baseline.x + dx, -4000, 4000),
            y: clamp(baseline.y + dy, -4000, 4000),
        });
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}

function startResize(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const baseline = currentConfigFromDom();
    const startWidth =
        baseline.width ??
        (
            root.value?.firstElementChild as HTMLElement | null
        )?.getBoundingClientRect().width ??
        100;
    const startX = event.clientX;
    gesture.value = { kind: 'resize', dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        gesture.value = { kind: 'resize', dx: e.clientX - startX, dy: 0 };
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);

        const dx = e.clientX - startX;
        gesture.value = null;

        if (dx === 0) {
            return;
        }

        emit('commit', props.elementKey, {
            ...baseline,
            width: Math.max(10, startWidth + dx),
        });
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}

function nudge(event: KeyboardEvent) {
    if (!interactive.value) {
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
    const baseline = currentConfigFromDom();

    emit('commit', props.elementKey, {
        ...baseline,
        x: clamp(baseline.x + delta[0] * step, -4000, 4000),
        y: clamp(baseline.y + delta[1] * step, -4000, 4000),
    });
}

function selectFromFocus() {
    if (props.editable) {
        emit('select', props.elementKey);
    }
}

defineExpose({ root });
</script>

<template>
    <div
        ref="root"
        class="tc-mev"
        :class="{
            'tc-mev--editable': editable,
            'tc-mev--selected': editable && selected,
            'tc-mev--locked': editable && locked,
        }"
        :style="style"
        :data-element-key="elementKey"
        :tabindex="interactive ? 0 : undefined"
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
            >{{ label || elementKey }}{{ locked ? ' 🔒' : '' }}</span
        >
        <div
            v-if="editable && selected && !locked"
            data-mev-handle
            class="tc-mev-handle"
            @pointerdown="startResize"
        />
    </div>
</template>

<style scoped>
/* A propósito no fija display/position: el host (imagen, título, bloque de
   precio…) ya trae el display que necesita — imponer uno propio pisaría
   flex/grid del layout público. transform funciona en cualquier caja sin
   necesitar position:relative; z-index se activa solo cuando aplica. */
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

.tc-mev--locked.tc-mev--selected {
    outline-color: #9ca3af !important;
    cursor: not-allowed;
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
