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
        <div class="tc-mp-grid--bebidas-promo">
            <img v-if="category.title_image_url" :src="category.title_image_url" :alt="category.name" class="tc-mp-title-img" />
            <h2 v-else class="tc-mp-title-text tc-mp-title-text--promo" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">
                {{ category.tagline ?? category.name }}
            </h2>

            <div class="tc-mp-promo-media">
                <div v-if="category.image_url" class="tc-mp-promo-hero">
                    <MenuItemPhoto :item="{ image_url: category.image_url, name: category.name }" />
                </div>

                <img
                    v-if="category.subtitle_image_url"
                    :src="category.subtitle_image_url"
                    :alt="category.subtitle ?? ''"
                    class="tc-mp-promo-banner"
                />
            </div>

            <div class="tc-mp-promo-prices">
                <div v-for="item in category.items" :key="item.id" class="tc-mp-promo-price-item">
                    <p class="tc-mp-choice" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ item.name }}</p>
                    <p class="tc-mp-price tc-mp-price--sm" :style="{ color: category.color_secondary ?? undefined }">${{ money(item.price) }}</p>
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
