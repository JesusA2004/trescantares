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
const accompaniment = computed(
    () => byZone(props.category.items, 'accompaniment')[0],
);
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <div class="tc-mp-grid--pozole">
            <MenuEditableElement
                v-if="category.title_image_url"
                :element-key="`category-${category.id}:title_image`"
                label="Título Pozole"
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
                label="Título Pozole"
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
                <div class="tc-mp-pozole-main">
                    <MenuItemVisual
                        :item="main"
                        class="tc-mp-pozole-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <div class="tc-mp-pozole-price-block">
                        <MenuTextVisual
                            v-if="main.price_label"
                            :element-key="`item-${main.id}:price_label`"
                            :label="`${main.name} — etiqueta de precio`"
                            :config="
                                itemElementFor(main, 'price_label', breakpoint)
                            "
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-price tc-mp-price--lg"
                            :style="{
                                color: category.color_secondary ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ main.price_label }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            :element-key="`item-${main.id}:price`"
                            :label="`${main.name} — precio`"
                            :config="itemElementFor(main, 'price', breakpoint)"
                            :value="main.price"
                            :editable="editable"
                            :selected-key="selectedKey"
                            class="tc-mp-price tc-mp-price--xl"
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

            <div
                v-if="main && (main.choice_label || main.ingredients)"
                class="tc-mp-dot-divider"
                :style="{
                    color: category.color ?? undefined,
                    '--tc-mp-h': category.color ?? undefined,
                }"
            >
                <span class="tc-mp-dot-divider-line" />
                <span class="text-center">
                    <MenuTextVisual
                        v-if="main.choice_label"
                        :element-key="`item-${main.id}:choice_label`"
                        :label="`${main.name} — elección`"
                        :config="
                            itemElementFor(main, 'choice_label', breakpoint)
                        "
                        :editable="editable"
                        :selected-key="selectedKey"
                        as="span"
                        class="tc-mp-choice"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                        @select="onSelect"
                        @commit="onCommit"
                        >{{ main.choice_label }}</MenuTextVisual
                    >
                    <br v-if="main.choice_label && main.ingredients" />
                    <MenuTextVisual
                        v-if="main.ingredients"
                        :element-key="`item-${main.id}:ingredients`"
                        :label="`${main.name} — ingredientes`"
                        :config="
                            itemElementFor(main, 'ingredients', breakpoint)
                        "
                        :editable="editable"
                        :selected-key="selectedKey"
                        as="span"
                        class="tc-mp-ingredients"
                        @select="onSelect"
                        @commit="onCommit"
                        >{{ main.ingredients }}</MenuTextVisual
                    >
                </span>
                <span class="tc-mp-dot-divider-line" />
            </div>

            <MenuEditableElement
                v-if="category.subtitle_image_url"
                :element-key="`category-${category.id}:subtitle_image`"
                label="Acompáñalo"
                :config="
                    categoryElementFor(category, 'subtitle_image', breakpoint)
                "
                :editable="editable"
                :selected="
                    selectedKey === `category-${category.id}:subtitle_image`
                "
                kind="image"
                :src="category.subtitle_image_url"
                :alt="category.subtitle ?? ''"
                img-class="tc-mp-subtitle-img mt-2.5"
                @select="onSelect"
                @commit="onCommit"
            />

            <MenuEditableElement
                v-if="accompaniment"
                :element-key="`item-${accompaniment.id}:container`"
                :label="`${accompaniment.name} — contenedor`"
                :config="itemElementFor(accompaniment, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${accompaniment.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-accompaniment">
                    <div class="text-center">
                        <MenuTextVisual
                            :element-key="`item-${accompaniment.id}:name`"
                            :label="`${accompaniment.name} — nombre`"
                            :config="
                                itemElementFor(
                                    accompaniment,
                                    'name',
                                    breakpoint,
                                )
                            "
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-name tc-mp-name--lg"
                            :style="{
                                color: category.color_secondary ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ accompaniment.name }}
                        </MenuTextVisual>
                        <MenuTextVisual
                            v-if="accompaniment.ingredients"
                            :element-key="`item-${accompaniment.id}:ingredients`"
                            :label="`${accompaniment.name} — ingredientes`"
                            :config="
                                itemElementFor(
                                    accompaniment,
                                    'ingredients',
                                    breakpoint,
                                )
                            "
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-ingredients"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ accompaniment.ingredients }}
                        </MenuTextVisual>
                        <MenuPriceVisual
                            :element-key="`item-${accompaniment.id}:price`"
                            :label="`${accompaniment.name} — precio`"
                            :config="
                                itemElementFor(
                                    accompaniment,
                                    'price',
                                    breakpoint,
                                )
                            "
                            :value="accompaniment.price"
                            :editable="editable"
                            :selected-key="selectedKey"
                            class="tc-mp-price tc-mp-price--lg"
                            :style="{
                                color: category.color ?? undefined,
                                '--tc-mp-h': category.color ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                    </div>
                    <MenuItemVisual
                        :item="accompaniment"
                        class="tc-mp-accompaniment-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                </div>
            </MenuEditableElement>

            <DotOrnament
                :color="category.color ?? undefined"
                class="tc-mp-area-ornament mt-3.5"
            />
        </div>
    </MenuPageFrame>
</template>
