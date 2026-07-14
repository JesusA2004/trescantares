<script setup lang="ts">
import { computed } from 'vue';
import MenuItemPhoto from './MenuItemPhoto.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { byZone, money } from './types';
import type { MenuCategoryData } from './types';

const props = defineProps<{
    category: MenuCategoryData;
}>();

const main = computed(() => byZone(props.category.items, 'main')[0]);
const fillings = computed(() => byZone(props.category.items, 'filling'));
const sope = computed(() => byZone(props.category.items, 'sope')[0]);
</script>

<template>
    <MenuPageFrame :primary-color="category.color ?? undefined" :secondary-color="category.color_secondary ?? undefined">
        <img v-if="category.title_image_url" :src="category.title_image_url" :alt="category.name" class="tc-mp-title-img" />
        <h2 v-else class="tc-mp-title-text" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ category.name }}</h2>

        <div v-if="main" class="tc-mp-comal-main" style="margin-top: 14px">
            <MenuItemPhoto :item="main" class="tc-mp-comal-main-photo" />
        </div>

        <div v-if="fillings.length" class="tc-mp-options-grid" style="margin-top: 8px">
            <div v-for="(f, idx) in fillings" :key="f.id" class="tc-mp-option-item" :style="idx === 4 ? 'grid-column:3;grid-row:2' : undefined">
                <MenuItemPhoto :item="f" class="tc-mp-option-photo" />
                <p class="tc-mp-option-label">{{ f.name }}</p>
            </div>
        </div>

        <div v-if="main" style="text-align: center; margin-top: 6px">
            <p class="tc-mp-name" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: '1.5rem' }">{{ main.name }}</p>
            <p class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.7rem' }">${{ money(main.price) }}</p>
        </div>

        <div v-if="sope" class="tc-mp-alt-row" style="margin-top: 22px">
            <MenuItemPhoto :item="sope" class="tc-mp-alt-photo" />
            <div class="tc-mp-alt-text">
                <p class="tc-mp-name" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: '1.5rem' }">{{ sope.name }}</p>
                <p class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.7rem' }">${{ money(sope.price) }}</p>
            </div>
        </div>
    </MenuPageFrame>
</template>
