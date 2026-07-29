<script setup lang="ts">
import MenuEditableElement from './MenuEditableElement.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { categoryElementFor } from './types';
import type { ElementConfig, MenuBreakpoint, MenuCategoryData } from './types';

withDefaults(
    defineProps<{
        category: MenuCategoryData;
        breakpoint: MenuBreakpoint;
        editable?: boolean;
        selectedKey?: string | null;
        backgroundUrl?: string | null;
    }>(),
    {
        editable: false,
        selectedKey: null,
        backgroundUrl: null,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: ElementConfig];
}>();

function onSelect(key: string) {
    emit('select', key);
}

function onCommit(key: string, config: ElementConfig) {
    emit('commit', key, config);
}
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
        :background-url="backgroundUrl"
    >
        <MenuEditableElement
            v-if="category.image_url"
            :element-key="`category-${category.id}:image`"
            :label="`Imagen ${category.name}`"
            :config="categoryElementFor(category, 'image', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:image`"
            kind="image"
            :src="category.image_url"
            :alt="category.name"
            img-class="tc-mp-promo-full-img"
            @select="onSelect"
            @commit="onCommit"
        />
    </MenuPageFrame>
</template>
