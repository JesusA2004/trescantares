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
        <h2 v-else class="tc-mp-title-text" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ category.name }}</h2>
        <p v-if="category.description" class="tc-mp-ingredients" style="text-align: center; margin-top: 8px">{{ category.description }}</p>

        <div v-for="item in category.items" :key="item.id" class="tc-mp-fusion-row">
            <MenuItemPhoto :item="item" class="tc-mp-fusion-photo" />
            <div class="tc-mp-fusion-text">
                <p class="tc-mp-name" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: '1.3rem' }">{{ item.name }}</p>
                <p v-if="item.ingredients" class="tc-mp-ingredients">{{ item.ingredients }}</p>
                <p v-if="Number(item.price) > 0" class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.6rem' }">
                    ${{ money(item.price) }}
                </p>
            </div>
        </div>
    </MenuPageFrame>
</template>
