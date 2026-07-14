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
            :label="`Título ${category.name}`"
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
        <p
            v-if="category.description"
            class="tc-mp-ingredients mt-2 text-center"
        >
            {{ category.description }}
        </p>

        <div class="tc-mp-fusion-list">
            <div
                v-for="item in category.items"
                :key="item.id"
                class="tc-mp-fusion-row"
            >
                <MenuItemPhoto
                    :item="item"
                    class="tc-mp-fusion-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected="selectedKey === `item-${item.id}`"
                    :scale-factor="scaleFactor"
                    @select="onSelect"
                    @commit="onCommit"
                />
                <div class="tc-mp-fusion-text">
                    <p
                        class="tc-mp-name tc-mp-name--lg"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ item.name }}
                    </p>
                    <p v-if="item.ingredients" class="tc-mp-ingredients">
                        {{ item.ingredients }}
                    </p>
                    <p
                        v-if="Number(item.price) > 0"
                        class="tc-mp-price tc-mp-price--md"
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
