<script setup lang="ts">
import MenuEditableElement from './MenuEditableElement.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import MenuPriceVisual from './MenuPriceVisual.vue';
import MenuTextVisual from './MenuTextVisual.vue';
import { categoryElementFor, itemElementFor } from './types';
import type { StoredElementConfig, MenuBreakpoint, MenuCategoryData } from './types';

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
    commit: [key: string, config: StoredElementConfig];
}>();

function onSelect(key: string) {
    emit('select', key);
}

function onCommit(key: string, config: StoredElementConfig) {
    emit('commit', key, config);
}
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
        :background-url="backgroundUrl"
    >
        <div class="tc-mp-grid--bebidas-promo">
            <MenuEditableElement
                v-if="category.title_image_url"
                :element-key="`category-${category.id}:title_image`"
                label="Título Bebidas"
                :config="
                    categoryElementFor(category, 'title_image', breakpoint)
                "
                :editable="editable"
                :selected="
                    selectedKey === `category-${category.id}:title_image`
                "
                kind="image"
                :src="category.title_image_url"
                :alt="category.name"
                img-class="tc-mp-title-img"
                @select="onSelect"
                @commit="onCommit"
            />
            <MenuEditableElement
                v-else
                :element-key="`category-${category.id}:title`"
                label="Título Bebidas"
                :config="categoryElementFor(category, 'title', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `category-${category.id}:title`"
                kind="text"
                @select="onSelect"
                @commit="onCommit"
            >
                <h2
                    class="tc-mp-title-text tc-mp-title-text--promo"
                    :style="{
                        color: category.color ?? undefined,
                        '--tc-mp-h': category.color ?? undefined,
                    }"
                >
                    {{ category.tagline ?? category.name }}
                </h2>
            </MenuEditableElement>

            <div class="tc-mp-promo-media">
                <MenuEditableElement
                    v-if="category.image_url"
                    :element-key="`category-${category.id}:image`"
                    label="Foto Bebidas"
                    :config="categoryElementFor(category, 'image', breakpoint)"
                    :editable="editable"
                    :selected="selectedKey === `category-${category.id}:image`"
                    @select="onSelect"
                    @commit="onCommit"
                >
                    <div class="tc-mp-promo-hero">
                        <img
                            :src="category.image_url"
                            :alt="category.name"
                            class="h-full w-full object-cover"
                        />
                    </div>
                </MenuEditableElement>

                <MenuEditableElement
                    v-if="category.subtitle_image_url"
                    :element-key="`category-${category.id}:subtitle_image`"
                    label="Compra dos"
                    :config="
                        categoryElementFor(
                            category,
                            'subtitle_image',
                            breakpoint,
                        )
                    "
                    :editable="editable"
                    :selected="
                        selectedKey === `category-${category.id}:subtitle_image`
                    "
                    kind="image"
                    :src="category.subtitle_image_url"
                    :alt="category.subtitle ?? ''"
                    img-class="tc-mp-promo-banner"
                    @select="onSelect"
                    @commit="onCommit"
                />
            </div>

            <div class="tc-mp-promo-prices">
                <div
                    v-for="item in category.items"
                    :key="item.id"
                    class="tc-mp-promo-price-item"
                >
                    <MenuTextVisual
                        :element-key="`item-${item.id}:name`"
                        :label="`${item.name} — nombre`"
                        :config="itemElementFor(item, 'name', breakpoint)"
                        :editable="editable"
                        :selected-key="selectedKey"
                        as="p"
                        class="tc-mp-choice"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                        @select="onSelect"
                        @commit="onCommit"
                    >
                        {{ item.name }}
                    </MenuTextVisual>
                    <MenuPriceVisual
                        :element-key="`item-${item.id}:price`"
                        :label="`${item.name} — precio`"
                        :config="itemElementFor(item, 'price', breakpoint)"
                        :value="item.price"
                        :editable="editable"
                        :selected-key="selectedKey"
                        class="tc-mp-price tc-mp-price--sm"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
