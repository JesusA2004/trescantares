<script setup lang="ts">
import MenuEditableVisual from './MenuEditableVisual.vue';
import MenuItemPhoto from './MenuItemPhoto.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { categoryVisualFor, money } from './types';
import type {
    BreakpointLayout,
    MenuBreakpoint,
    MenuCategoryData,
} from './types';

withDefaults(
    defineProps<{
        category: MenuCategoryData;
        breakpoint: MenuBreakpoint;
        editable?: boolean;
        selectedKey?: string | null;
        scaleFactor?: number;
    }>(),
    {
        editable: false,
        selectedKey: null,
        scaleFactor: 1,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, breakpoint: MenuBreakpoint, layout: BreakpointLayout];
}>();

function onSelect(key: string) {
    emit('select', key);
}

function onCommit(key: string, bp: MenuBreakpoint, layout: BreakpointLayout) {
    emit('commit', key, bp, layout);
}
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <MenuEditableVisual
            element-key="title"
            label="Título Postres"
            :layout="categoryVisualFor(category, 'title', breakpoint)"
            :breakpoint="breakpoint"
            :editable="editable"
            :selected="selectedKey === 'title'"
            :scale-factor="scaleFactor"
            @select="onSelect"
            @commit="onCommit"
        >
            <img
                v-if="category.title_image_url"
                :src="category.title_image_url"
                :alt="category.name"
                class="tc-mp-title-img"
            />
            <h2
                v-else
                class="tc-mp-title-text"
                :style="{
                    color: category.color ?? undefined,
                    '--tc-mp-h': category.color ?? undefined,
                }"
            >
                {{ category.name }}
            </h2>
        </MenuEditableVisual>

        <MenuEditableVisual
            v-if="!category.title_image_url && category.subtitle"
            element-key="subtitle"
            label="Subtítulo Postres"
            :layout="categoryVisualFor(category, 'subtitle', breakpoint)"
            :breakpoint="breakpoint"
            :editable="editable"
            :selected="selectedKey === 'subtitle'"
            :scale-factor="scaleFactor"
            @select="onSelect"
            @commit="onCommit"
        >
            <p
                class="tc-mp-choice text-center"
                :style="{ color: category.color_secondary ?? undefined }"
            >
                {{ category.subtitle }}
            </p>
        </MenuEditableVisual>

        <div class="tc-mp-dessert-list">
            <div
                v-for="(item, idx) in category.items"
                :key="item.id"
                class="tc-mp-dessert-row"
                :class="{ 'tc-mp-dessert-row--reverse': idx % 2 === 0 }"
            >
                <MenuItemPhoto
                    :item="item"
                    class="tc-mp-dessert-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === `item-${item.id}`"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                />
                <div class="tc-mp-dessert-text">
                    <p
                        class="tc-mp-name tc-mp-name--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        {{ item.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--sm"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        ${{ money(item.price) }}
                    </p>
                </div>
            </div>
        </div>

        <MenuEditableVisual
            v-if="category.tagline_image_url"
            element-key="tagline_image"
            label="Postres — gráfico"
            :layout="categoryVisualFor(category, 'tagline_image', breakpoint)"
            :breakpoint="breakpoint"
            :editable="editable"
            :selected="selectedKey === 'tagline_image'"
            :scale-factor="scaleFactor"
            @select="onSelect"
            @commit="onCommit"
        >
            <img
                :src="category.tagline_image_url"
                :alt="category.tagline_sub ?? ''"
                class="tc-mp-tagline-img mt-[18px]"
            />
        </MenuEditableVisual>
    </MenuPageFrame>
</template>
