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
            v-if="category.title_image_url"
            :element-key="`category-${category.id}:title_image`"
            :label="`Título ${category.name}`"
            :config="categoryElementFor(category, 'title_image', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:title_image`"
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
            :label="`Título ${category.name}`"
            :config="categoryElementFor(category, 'title', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:title`"
            kind="text"
            @select="onSelect"
            @commit="onCommit"
        >
            <h2
                class="tc-mp-title-text"
                :style="{
                    color: category.color ?? undefined,
                    '--tc-mp-h': category.color ?? undefined,
                }"
            >
                {{ category.name }}
            </h2>
        </MenuEditableElement>
        <p
            v-if="category.description"
            class="tc-mp-ingredients mt-2 text-center"
        >
            {{ category.description }}
        </p>

        <div class="tc-mp-fusion-list">
            <MenuEditableElement
                v-for="item in category.items"
                :key="item.id"
                :element-key="`item-${item.id}:container`"
                :label="`${item.name} — contenedor`"
                :config="itemElementFor(item, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${item.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-fusion-row">
                    <MenuItemVisual
                        :item="item"
                        class="tc-mp-fusion-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <div class="tc-mp-fusion-text">
                        <MenuTextVisual
                            :element-key="`item-${item.id}:name`"
                            :label="`${item.name} — nombre`"
                            :config="itemElementFor(item, 'name', breakpoint)"
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-name tc-mp-name--lg"
                            :style="{
                                color: category.color ?? undefined,
                                '--tc-mp-h': category.color ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ item.name }}
                        </MenuTextVisual>
                        <MenuTextVisual
                            v-if="item.ingredients"
                            :element-key="`item-${item.id}:ingredients`"
                            :label="`${item.name} — ingredientes`"
                            :config="
                                itemElementFor(item, 'ingredients', breakpoint)
                            "
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-ingredients"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ item.ingredients }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            v-if="Number(item.price) > 0"
                            :element-key="`item-${item.id}:price`"
                            :label="`${item.name} — precio`"
                            :config="itemElementFor(item, 'price', breakpoint)"
                            :value="item.price"
                            :editable="editable"
                            :selected-key="selectedKey"
                            class="tc-mp-price tc-mp-price--md"
                            :style="{
                                color: category.color_secondary ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                    </div>
                </div>
            </MenuEditableElement>
        </div>
    </MenuPageFrame>
</template>
