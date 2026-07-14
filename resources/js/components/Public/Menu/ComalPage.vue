<script setup lang="ts">
import { computed } from 'vue';
import MenuEditableVisual from './MenuEditableVisual.vue';
import MenuItemPhoto from './MenuItemPhoto.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { byZone, categoryVisualFor, money } from './types';
import type {
    BreakpointLayout,
    MenuBreakpoint,
    MenuCategoryData,
} from './types';

const props = withDefaults(
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
            <MenuEditableVisual
                element-key="title"
                label="Del Comal a tu Mesa"
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

            <div v-if="main" class="tc-mp-comal-hero">
                <div class="tc-mp-comal-main">
                    <MenuItemPhoto
                        :item="main"
                        class="tc-mp-comal-main-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected="selectedKey === `item-${main.id}`"
                        :scale-factor="scaleFactor"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                </div>

                <div class="tc-mp-comal-name-block">
                    <p
                        class="tc-mp-name tc-mp-name--lg"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ main.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(main.price) }}
                    </p>
                </div>
            </div>

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
                    <MenuItemPhoto
                        :item="f"
                        class="tc-mp-option-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected="selectedKey === `item-${f.id}`"
                        :scale-factor="scaleFactor"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <p class="tc-mp-option-label">{{ f.name }}</p>
                </div>
            </div>

            <div v-if="sope" class="tc-mp-alt-row tc-mp-comal-sope">
                <MenuItemPhoto
                    :item="sope"
                    class="tc-mp-alt-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === `item-${sope.id}`"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                />
                <div class="tc-mp-alt-text">
                    <p
                        class="tc-mp-name tc-mp-name--lg"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ sope.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(sope.price) }}
                    </p>
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
