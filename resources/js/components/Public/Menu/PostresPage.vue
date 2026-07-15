<script setup lang="ts">
import MenuEditableElement from './MenuEditableElement.vue';
import MenuItemVisual from './MenuItemVisual.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import MenuPriceVisual from './MenuPriceVisual.vue';
import MenuTextVisual from './MenuTextVisual.vue';
import { categoryElementFor, itemElementFor } from './types';
import type { ElementConfig, MenuBreakpoint, MenuCategoryData } from './types';

withDefaults(
    defineProps<{
        category: MenuCategoryData;
        breakpoint: MenuBreakpoint;
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
    >
        <MenuEditableElement
            :element-key="`category-${category.id}:title`"
            label="Título Postres"
            :config="categoryElementFor(category, 'title', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:title`"
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
        </MenuEditableElement>

        <MenuEditableElement
            v-if="!category.title_image_url && category.subtitle"
            :element-key="`category-${category.id}:subtitle`"
            label="Subtítulo Postres"
            :config="categoryElementFor(category, 'subtitle', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:subtitle`"
            @select="onSelect"
            @commit="onCommit"
        >
            <p
                class="tc-mp-choice text-center"
                :style="{ color: category.color_secondary ?? undefined }"
            >
                {{ category.subtitle }}
            </p>
        </MenuEditableElement>

        <div class="tc-mp-dessert-list">
            <MenuEditableElement
                v-for="(item, idx) in category.items"
                :key="item.id"
                :element-key="`item-${item.id}:container`"
                :label="`${item.name} — contenedor`"
                :config="itemElementFor(item, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${item.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div
                    class="tc-mp-dessert-row"
                    :class="{ 'tc-mp-dessert-row--reverse': idx % 2 === 0 }"
                >
                    <MenuItemVisual
                        :item="item"
                        class="tc-mp-dessert-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <div class="tc-mp-dessert-text">
                        <MenuTextVisual
                            :element-key="`item-${item.id}:name`"
                            :label="`${item.name} — nombre`"
                            :config="itemElementFor(item, 'name', breakpoint)"
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-name tc-mp-name--md"
                            :style="{
                                color: category.color_secondary ?? undefined,
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
                                color: category.color ?? undefined,
                                '--tc-mp-h': category.color ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                    </div>
                </div>
            </MenuEditableElement>
        </div>

        <MenuEditableElement
            v-if="category.tagline_image_url"
            :element-key="`category-${category.id}:tagline_image`"
            label="Postres — gráfico"
            :config="categoryElementFor(category, 'tagline_image', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:tagline_image`"
            @select="onSelect"
            @commit="onCommit"
        >
            <img
                :src="category.tagline_image_url"
                :alt="category.tagline_sub ?? ''"
                class="tc-mp-tagline-img mt-[18px]"
            />
        </MenuEditableElement>
    </MenuPageFrame>
</template>
