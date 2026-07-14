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
const options = computed(() => byZone(props.category.items, 'option'));
const footer = computed(() => byZone(props.category.items, 'footer')[0]);
</script>

<template>
    <MenuPageFrame :primary-color="category.color ?? undefined" :secondary-color="category.color_secondary ?? undefined">
        <img v-if="category.title_image_url" :src="category.title_image_url" :alt="category.name" class="tc-mp-title-img" />
        <h2 v-else class="tc-mp-title-text" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ category.name }}</h2>

        <div v-if="main" class="tc-mp-pancita-main" style="margin-top: 14px">
            <MenuItemPhoto :item="main" class="tc-mp-pancita-main-photo" />
        </div>

        <div v-if="main" class="tc-mp-pancita-price">
            <p class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '2.1rem' }">${{ money(main.price) }}</p>
            <p v-if="main.choice_label" class="tc-mp-choice" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ main.choice_label }}</p>
        </div>

        <div v-if="options.length" class="tc-mp-options-grid">
            <div v-for="opt in options" :key="opt.id" class="tc-mp-option-item">
                <MenuItemPhoto :item="opt" class="tc-mp-option-photo" />
                <p class="tc-mp-option-label">{{ opt.name }}</p>
            </div>
        </div>

        <div v-if="category.tagline" style="text-align: center; margin-top: 22px">
            <p class="tc-mp-tagline-text" :style="{ color: category.color_secondary ?? undefined }">{{ category.tagline }}</p>
            <p v-if="category.tagline_sub" class="tc-mp-ingredients" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ category.tagline_sub }}</p>
        </div>

        <div v-if="footer" class="tc-mp-footer-row">
            <img v-if="category.tagline_image_url" :src="category.tagline_image_url" :alt="category.tagline_sub ?? footer.name" style="width: 55%" />
            <MenuItemPhoto :item="footer" class="tc-mp-footer-photo" />
        </div>
    </MenuPageFrame>
</template>
