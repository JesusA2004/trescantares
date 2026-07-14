<script setup lang="ts">
import { computed } from 'vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { byZone, money } from './types';
import type { MenuCategoryData } from './types';

const props = defineProps<{
    category: MenuCategoryData;
}>();

const groups = computed(() => [
    { key: 'tequila', title: 'Tequila', items: byZone(props.category.items, 'tequila') },
    { key: 'mezcal', title: 'Mezcal', items: byZone(props.category.items, 'mezcal') },
    { key: 'ron', title: 'Ron', items: byZone(props.category.items, 'ron') },
]);
</script>

<template>
    <MenuPageFrame :primary-color="category.color ?? undefined" :secondary-color="category.color_secondary ?? undefined">
        <div class="tc-mp-spirit-groups">
            <div v-for="group in groups" :key="group.key" class="tc-mp-spirit-group">
                <template v-if="group.items.length">
                    <p class="tc-mp-spirit-group-title">{{ group.title }}</p>
                    <div class="tc-mp-spirit-head">
                        <span>Copa</span>
                        <span>Botella</span>
                    </div>
                    <div v-for="item in group.items" :key="item.id" class="tc-mp-spirit-row">
                        <span class="tc-mp-spirit-name">
                            {{ item.name }}
                            <span v-if="item.presentation" class="tc-mp-spirit-presentation">({{ item.presentation }})</span>
                        </span>
                        <span class="tc-mp-spirit-prices">
                            <span>${{ money(item.price) }}</span>
                            <span>${{ money(item.price_secondary) }}</span>
                        </span>
                    </div>
                </template>
            </div>
        </div>

        <img
            v-if="category.tagline_image_url"
            :src="category.tagline_image_url"
            :alt="category.tagline_sub ?? ''"
            class="tc-mp-tagline-img tc-mp-tagline-img--sm mt-[22px]"
        />

        <div class="tc-mp-social-row">
            <a href="https://facebook.com/trescantares" target="_blank" rel="noopener" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"
                    />
                </svg>
            </a>
            <a href="https://instagram.com/trescantares" target="_blank" rel="noopener" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
                </svg>
            </a>
            <a href="https://tiktok.com/@trescantares" target="_blank" rel="noopener" aria-label="TikTok">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path
                        d="M16.6 3c.4 2 1.7 3.6 3.9 3.9v2.9c-1.5.1-2.9-.4-4-1.3v6.6a5.9 5.9 0 1 1-5.9-5.9c.2 0 .5 0 .7.1v3a3 3 0 1 0 2.1 2.8V3h3.2Z"
                    />
                </svg>
            </a>
            <span class="tc-mp-social-handle">@trescantares</span>
        </div>
    </MenuPageFrame>
</template>
