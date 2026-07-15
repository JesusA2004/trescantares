<script setup lang="ts">
import { computed } from 'vue';
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

const main = computed(() => byZone(props.category.items, 'main')[0]);
const fillings = computed(() => byZone(props.category.items, 'filling'));
const sope = computed(() => byZone(props.category.items, 'sope')[0]);
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <div class="tc-mp-grid--comal">
            <MenuEditableElement
                :element-key="`category-${category.id}:title`"
                label="Del Comal a tu Mesa"
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
                v-if="main"
                :element-key="`item-${main.id}:container`"
                :label="`${main.name} — contenedor`"
                :config="itemElementFor(main, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${main.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-comal-hero">
                    <div class="tc-mp-comal-main">
                        <MenuItemVisual
                            :item="main"
                            class="tc-mp-comal-main-photo"
                            :breakpoint="breakpoint"
                            :editable="editable"
                            :selected-key="selectedKey"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                    </div>

                    <div class="tc-mp-comal-name-block">
                        <MenuTextVisual
                            :element-key="`item-${main.id}:name`"
                            :label="`${main.name} — nombre`"
                            :config="itemElementFor(main, 'name', breakpoint)"
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
                            {{ main.name }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            :element-key="`item-${main.id}:price`"
                            :label="`${main.name} — precio`"
                            :config="itemElementFor(main, 'price', breakpoint)"
                            :value="main.price"
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

            <div
                v-if="fillings.length"
                class="tc-mp-options-grid tc-mp-comal-fillings"
            >
                <div
                    v-for="(f, idx) in fillings"
                    :key="f.id"
                    class="tc-mp-option-item"
                    :class="{ 'tc-mp-option-item--last': idx === 4 }"
                >
                    <MenuItemVisual
                        :item="f"
                        class="tc-mp-option-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <MenuTextVisual
                        :element-key="`item-${f.id}:name`"
                        :label="`${f.name} — nombre`"
                        :config="itemElementFor(f, 'name', breakpoint)"
                        :editable="editable"
                        :selected-key="selectedKey"
                        as="p"
                        class="tc-mp-option-label"
                        @select="onSelect"
                        @commit="onCommit"
                    >
                        {{ f.name }}
                    </MenuTextVisual>
                </div>
            </div>

            <MenuEditableElement
                v-if="sope"
                :element-key="`item-${sope.id}:container`"
                :label="`${sope.name} — contenedor`"
                :config="itemElementFor(sope, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${sope.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-alt-row tc-mp-comal-sope">
                    <MenuItemVisual
                        :item="sope"
                        class="tc-mp-alt-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <div class="tc-mp-alt-text">
                        <MenuTextVisual
                            :element-key="`item-${sope.id}:name`"
                            :label="`${sope.name} — nombre`"
                            :config="itemElementFor(sope, 'name', breakpoint)"
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
                            {{ sope.name }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            :element-key="`item-${sope.id}:price`"
                            :label="`${sope.name} — precio`"
                            :config="itemElementFor(sope, 'price', breakpoint)"
                            :value="sope.price"
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
