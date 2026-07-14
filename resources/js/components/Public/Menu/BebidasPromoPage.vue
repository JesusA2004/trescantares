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
        <div class="tc-mp-grid--bebidas-promo">
            <MenuEditableVisual
                element-key="title"
                label="Título Bebidas"
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
                    class="tc-mp-title-text tc-mp-title-text--promo"
                    :style="{
                        color: category.color ?? undefined,
                        '--tc-mp-h': category.color ?? undefined,
                    }"
                >
                    {{ category.tagline ?? category.name }}
                </h2>
            </MenuEditableVisual>

            <div class="tc-mp-promo-media">
                <MenuEditableVisual
                    v-if="category.image_url"
                    element-key="image"
                    label="Foto Bebidas"
                    :layout="categoryVisualFor(category, 'image', breakpoint)"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === 'image'"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                >
                    <div class="tc-mp-promo-hero">
                        <MenuItemPhoto
                            :item="{
                                image_url: category.image_url,
                                name: category.name,
                            }"
                        />
                    </div>
                </MenuEditableVisual>

                <MenuEditableVisual
                    v-if="category.subtitle_image_url"
                    element-key="subtitle"
                    label="Compra dos"
                    :layout="
                        categoryVisualFor(category, 'subtitle', breakpoint)
                    "
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === 'subtitle'"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                >
                    <img
                        :src="category.subtitle_image_url"
                        :alt="category.subtitle ?? ''"
                        class="tc-mp-promo-banner"
                    />
                </MenuEditableVisual>
            </div>

            <div class="tc-mp-promo-prices">
                <div
                    v-for="item in category.items"
                    :key="item.id"
                    class="tc-mp-promo-price-item"
                >
                    <p
                        class="tc-mp-choice"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ item.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--sm"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(item.price) }}
                    </p>
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
