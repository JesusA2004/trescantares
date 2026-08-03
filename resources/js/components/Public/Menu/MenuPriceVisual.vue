<script setup lang="ts">
import MenuTextVisual from './MenuTextVisual.vue';
import { money } from './types';
import type { StoredElementConfig } from './types';

withDefaults(
    defineProps<{
        elementKey: string;
        label: string;
        config: StoredElementConfig;
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
    commit: [key: string, config: StoredElementConfig];
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
