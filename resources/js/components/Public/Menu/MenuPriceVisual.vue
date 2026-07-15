<script setup lang="ts">
import MenuTextVisual from './MenuTextVisual.vue';
import { money } from './types';
import type { ElementConfig } from './types';

withDefaults(
    defineProps<{
        elementKey: string;
        label: string;
        config: ElementConfig;
        value: number | string | null | undefined;
        editable?: boolean;
        selectedKey?: string | null;
    }>(),
    {
        editable: false,
        selectedKey: null,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: ElementConfig];
}>();
</script>

<template>
    <MenuTextVisual
        :element-key="elementKey"
        :label="label"
        :config="config"
        :editable="editable"
        :selected-key="selectedKey"
        as="span"
        @select="emit('select', $event)"
        @commit="(k, c) => emit('commit', k, c)"
    >
        ${{ money(value) }}
    </MenuTextVisual>
</template>
