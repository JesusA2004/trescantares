<script setup lang="ts">
import { computed } from 'vue';
import DotOrnament from './DotOrnament.vue';
import MenuItemPhoto from './MenuItemPhoto.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { byZone, money } from './types';
import type { MenuCategoryData } from './types';

const props = defineProps<{
    category: MenuCategoryData;
}>();

const main = computed(() => byZone(props.category.items, 'main')[0]);
const accompaniment = computed(() => byZone(props.category.items, 'accompaniment')[0]);
</script>

<template>
    <MenuPageFrame :primary-color="category.color ?? undefined" :secondary-color="category.color_secondary ?? undefined">
        <img v-if="category.title_image_url" :src="category.title_image_url" :alt="category.name" class="tc-mp-title-img" />
        <h2 v-else class="tc-mp-title-text" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">{{ category.name }}</h2>

        <div v-if="main" class="tc-mp-pozole-main" style="margin-top: 18px">
            <MenuItemPhoto :item="main" class="tc-mp-pozole-photo" />
            <div class="tc-mp-pozole-price-block">
                <p v-if="main.price_label" class="tc-mp-price" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.9rem' }">
                    {{ main.price_label }}
                </p>
                <p class="tc-mp-price" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: '2.1rem' }">${{ money(main.price) }}</p>
            </div>
        </div>

        <div v-if="main && (main.choice_label || main.ingredients)" class="tc-mp-dot-divider" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined }">
            <span class="tc-mp-dot-divider-line" />
            <span style="text-align: center">
                <span v-if="main.choice_label" class="tc-mp-choice" :style="{ color: category.color_secondary ?? undefined }">{{
                    main.choice_label
                }}</span>
                <br v-if="main.choice_label && main.ingredients" />
                <span v-if="main.ingredients" class="tc-mp-ingredients">{{ main.ingredients }}</span>
            </span>
            <span class="tc-mp-dot-divider-line" />
        </div>

        <img
            v-if="category.subtitle_image_url"
            :src="category.subtitle_image_url"
            :alt="category.subtitle ?? ''"
            class="tc-mp-subtitle-img"
            style="margin-top: 10px"
        />

        <div v-if="accompaniment" class="tc-mp-accompaniment">
            <div style="text-align: center">
                <p class="tc-mp-name" :style="{ color: category.color_secondary ?? undefined, fontSize: '1.5rem' }">{{ accompaniment.name }}</p>
                <p v-if="accompaniment.ingredients" class="tc-mp-ingredients">{{ accompaniment.ingredients }}</p>
                <p class="tc-mp-price" :style="{ color: category.color ?? undefined, '--tc-mp-h': category.color ?? undefined, fontSize: '1.8rem' }">${{ money(accompaniment.price) }}</p>
            </div>
            <MenuItemPhoto :item="accompaniment" class="tc-mp-accompaniment-photo" />
        </div>

        <DotOrnament :color="category.color ?? undefined" style="margin-top: 14px" />
    </MenuPageFrame>
</template>
