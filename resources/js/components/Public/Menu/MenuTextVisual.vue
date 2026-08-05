<script setup lang="ts">
import { computed } from 'vue';
import MenuEditableElement from './MenuEditableElement.vue';
import type { StoredElementConfig } from './types';

const props = withDefaults(
    defineProps<{
        elementKey: string;
        label: string;
        config: StoredElementConfig;
        editable?: boolean;
        selectedKey?: string | null;
        as?: string;
        /** true SOLO para un adorno de texto (ver Menu.vue) — reenviado tal
         * cual a MenuEditableElement, que lo necesita para fijar SIEMPRE
         * position:absolute (nunca condicionado a Teleport/normalized, ver
         * comentario completo en MenuEditableElement.vue) y así vivir en
         * .tc-mp-decoration-layer igual que un adorno de imagen. */
        decoration?: boolean;
    }>(),
    {
        editable: false,
        selectedKey: null,
        as: 'div',
        decoration: false,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: StoredElementConfig];
}>();

const textStyle = computed(() => {
    const c = props.config;
    const style: Record<string, string> = {};

    if (c.font_size) {
        style.fontSize = `${c.font_size}px`;
    }

    if (c.line_height) {
        style.lineHeight = `${c.line_height}`;
    }

    if (c.letter_spacing) {
        style.letterSpacing = `${c.letter_spacing}px`;
    }

    if (c.align) {
        style.textAlign = c.align;
    }

    if (c.max_width) {
        style.maxWidth = `${c.max_width}px`;
    }

    if (c.color) {
        style.color = c.color;
    }

    return style;
});
</script>

<template>
    <MenuEditableElement
        :element-key="elementKey"
        :label="label"
        :config="config"
        :editable="editable"
        :selected="selectedKey === elementKey"
        kind="text"
        :decoration="decoration"
        @select="emit('select', $event)"
        @commit="(k, c) => emit('commit', k, c)"
    >
        <component :is="as" :style="textStyle"><slot /></component>
    </MenuEditableElement>
</template>
