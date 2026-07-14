<script setup lang="ts">
import MenuItemPhoto from './MenuItemPhoto.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { money } from './types';
import type { MenuCategoryData } from './types';

defineProps<{
    category: MenuCategoryData;
}>();
</script>

<template>
    <MenuPageFrame :primary-color="category.color ?? undefined" :secondary-color="category.color_secondary ?? undefined">
        <img v-if="category.title_image_url" :src="category.title_image_url" :alt="category.name" class="tc-mp-title-img" />
        <h2 v-else class="tc-mp-title-text" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: 'clamp(2rem, 9vw, 3rem)' }">
            {{ category.tagline ?? category.name }}
        </h2>

        <div v-if="category.image_url" class="tc-mp-promo-hero" style="margin-top: 14px">
            <MenuItemPhoto :item="{ image_url: category.image_url, name: category.name }" />
        </div>

        <img
            v-if="category.subtitle_image_url"
            :src="category.subtitle_image_url"
            :alt="category.subtitle ?? ''"
            class="tc-mp-promo-banner"
        />

        <div class="tc-mp-promo-prices">
            <div v-for="item in category.items" :key="item.id" class="tc-mp-promo-price-item">
                <p class="tc-mp-choice" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ item.name }}</p>
                <p class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.4rem' }">${{ money(item.price) }}</p>
            </div>
        </div>
    </MenuPageFrame>
</template>
