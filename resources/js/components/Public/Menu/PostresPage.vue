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
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <img
            v-if="category.title_image_url"
            :src="category.title_image_url"
            :alt="category.name"
            class="tc-mp-title-img"
        />
        <template v-else>
            <h2
                class="tc-mp-title-text"
                :style="{
                    color: category.color ?? undefined,
                    '--tc-mp-h': category.color ?? undefined,
                }"
            >
                {{ category.name }}
            </h2>
            <p
                v-if="category.subtitle"
                class="tc-mp-choice text-center"
                :style="{ color: category.color_secondary ?? undefined }"
            >
                {{ category.subtitle }}
            </p>
        </template>

        <div class="tc-mp-dessert-list">
            <div
                v-for="(item, idx) in category.items"
                :key="item.id"
                class="tc-mp-dessert-row"
                :class="{ 'tc-mp-dessert-row--reverse': idx % 2 === 0 }"
            >
                <MenuItemPhoto :item="item" class="tc-mp-dessert-photo" />
                <div class="tc-mp-dessert-text">
                    <p
                        class="tc-mp-name tc-mp-name--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        {{ item.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--sm"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        ${{ money(item.price) }}
                    </p>
                </div>
            </div>
        </div>

        <img
            v-if="category.tagline_image_url"
            :src="category.tagline_image_url"
            :alt="category.tagline_sub ?? ''"
            class="tc-mp-tagline-img mt-[18px]"
        />
    </MenuPageFrame>
</template>
