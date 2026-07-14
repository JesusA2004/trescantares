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
const options = computed(() => byZone(props.category.items, 'option'));
const footer = computed(() => byZone(props.category.items, 'footer')[0]);
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <div class="tc-mp-grid--pancita">
            <MenuEditableVisual
                element-key="title"
                label="Título Pancita"
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

            <div v-if="main" class="tc-mp-pancita-hero">
                <div class="tc-mp-pancita-main">
                    <MenuItemPhoto
                        :item="main"
                        class="tc-mp-pancita-main-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected="selectedKey === `item-${main.id}`"
                        :scale-factor="scaleFactor"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                </div>

                <div class="tc-mp-pancita-price">
                    <p
                        class="tc-mp-price tc-mp-price--xl"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(main.price) }}
                    </p>
                    <p
                        v-if="main.choice_label"
                        class="tc-mp-choice"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ main.choice_label }}
                    </p>
                </div>
            </div>

            <div v-if="options.length" class="tc-mp-options-grid">
                <div
                    v-for="opt in options"
                    :key="opt.id"
                    class="tc-mp-option-item"
                >
                    <MenuItemPhoto
                        :item="opt"
                        class="tc-mp-option-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected="selectedKey === `item-${opt.id}`"
                        :scale-factor="scaleFactor"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <p class="tc-mp-option-label">{{ opt.name }}</p>
                </div>
            </div>

            <MenuEditableVisual
                v-if="category.tagline"
                element-key="tagline"
                label="Caldo ilimitado"
                :layout="categoryVisualFor(category, 'tagline', breakpoint)"
                :breakpoint="breakpoint"
                :editable="editable"
                :selected="selectedKey === 'tagline'"
                :scale-factor="scaleFactor"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-pancita-tagline">
                    <p
                        class="tc-mp-tagline-text"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        {{ category.tagline }}
                    </p>
                    <p
                        v-if="category.tagline_sub"
                        class="tc-mp-ingredients"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ category.tagline_sub }}
                    </p>
                </div>
            </MenuEditableVisual>

            <div v-if="footer" class="tc-mp-footer-row">
                <MenuEditableVisual
                    v-if="category.tagline_image_url"
                    element-key="tagline_image"
                    label="Textos gráficos tortillas"
                    :layout="
                        categoryVisualFor(category, 'tagline_image', breakpoint)
                    "
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === 'tagline_image'"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                >
                    <img
                        :src="category.tagline_image_url"
                        :alt="category.tagline_sub ?? footer.name"
                        class="w-[55%]"
                    />
                </MenuEditableVisual>

                <MenuItemPhoto
                    :item="footer"
                    class="tc-mp-footer-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === `item-${footer.id}`"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                />
            </div>
        </div>
    </MenuPageFrame>
</template>
