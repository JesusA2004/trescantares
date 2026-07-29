<script setup lang="ts">
import { computed } from 'vue';
import DotOrnament from './DotOrnament.vue';
import MenuEditableElement from './MenuEditableElement.vue';
import MenuItemVisual from './MenuItemVisual.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import MenuPriceVisual from './MenuPriceVisual.vue';
import MenuTextVisual from './MenuTextVisual.vue';
import { byZone, categoryElementFor, itemElementFor } from './types';
import type { ElementConfig, MenuBreakpoint, MenuCategoryData } from './types';

const props = withDefaults(
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

const main = computed(() => byZone(props.category.items, 'main')[0]);
const sides = computed(() => byZone(props.category.items, 'side'));
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
            label="Título Birria"
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
            label="Título Birria"
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

        <MenuEditableElement
            v-if="main"
            :element-key="`item-${main.id}:container`"
            :label="`${main.name} — contenedor`"
            :config="itemElementFor(main, 'container', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `item-${main.id}:container`"
            @select="onSelect"
            @commit="onCommit"
        >
            <div class="tc-mp-hero-row">
                <MenuItemVisual
                    :item="main"
                    class="tc-mp-hero-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected-key="selectedKey"
                    @select="onSelect"
                    @commit="onCommit"
                />
                <DotOrnament
                    :color="category.color_secondary ?? undefined"
                    :size="50"
                />
                <MenuPriceVisual
                    :element-key="`item-${main.id}:price`"
                    :label="`${main.name} — precio`"
                    :config="itemElementFor(main, 'price', breakpoint)"
                    :value="main.price"
                    :editable="editable"
                    :selected-key="selectedKey"
                    class="tc-mp-price tc-mp-price--xl"
                    :style="{ color: category.color_secondary ?? undefined }"
                    @select="onSelect"
                    @commit="onCommit"
                />
            </div>
        </MenuEditableElement>

        <MenuEditableElement
            v-if="category.tagline"
            :element-key="`category-${category.id}:tagline`"
            label="Y más…"
            :config="categoryElementFor(category, 'tagline', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:tagline`"
            @select="onSelect"
            @commit="onCommit"
        >
            <div
                class="tc-mp-dot-divider"
                :style="{ color: category.color_secondary ?? undefined }"
            >
                <span class="tc-mp-dot-divider-line" />
                <span
                    class="tc-mp-subtitle-text"
                    :style="{ color: category.color_secondary ?? undefined }"
                    >{{ category.tagline }}</span
                >
                <span class="tc-mp-dot-divider-line" />
            </div>
        </MenuEditableElement>

        <div class="tc-mp-birria-sides">
            <MenuEditableElement
                v-for="(side, idx) in sides"
                :key="side.id"
                :element-key="`item-${side.id}:container`"
                :label="`${side.name} — contenedor`"
                :config="itemElementFor(side, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${side.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div
                    class="tc-mp-alt-row"
                    :class="{ 'tc-mp-alt-row--reverse': idx % 2 === 1 }"
                >
                    <MenuItemVisual
                        :item="side"
                        class="tc-mp-alt-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <div class="tc-mp-alt-text">
                        <MenuTextVisual
                            :element-key="`item-${side.id}:name`"
                            :label="`${side.name} — nombre`"
                            :config="itemElementFor(side, 'name', breakpoint)"
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
                            {{ side.name }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            :element-key="`item-${side.id}:price`"
                            :label="`${side.name} — precio`"
                            :config="itemElementFor(side, 'price', breakpoint)"
                            :value="side.price"
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
    </MenuPageFrame>
</template>
