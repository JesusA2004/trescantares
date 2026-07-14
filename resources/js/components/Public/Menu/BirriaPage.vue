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
const sides = computed(() => byZone(props.category.items, 'side'));
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

        <div v-if="main" class="tc-mp-hero-row">
            <MenuItemPhoto :item="main" class="tc-mp-hero-photo" />
            <DotOrnament
                :color="category.color_secondary ?? undefined"
                :size="50"
            />
            <p
                class="tc-mp-price tc-mp-price--xl"
                :style="{ color: category.color_secondary ?? undefined }"
            >
                ${{ money(main.price) }}
            </p>
        </div>

        <div
            v-if="category.tagline"
            class="tc-mp-dot-divider"
            :style="{ color: category.color_secondary ?? undefined }"
        >
            <span class="tc-mp-dot-divider-line" />
            <span
                class="tc-mp-subtitle-text"
                :style="{ color: category.color_secondary ?? undefined }"
                >{{ category.tagline }}</span
            >
            <span class="tc-mp-dot-divider-line" />
        </div>

        <div class="tc-mp-birria-sides">
            <div
                v-for="(side, idx) in sides"
                :key="side.id"
                class="tc-mp-alt-row"
                :class="{ 'tc-mp-alt-row--reverse': idx % 2 === 1 }"
            >
                <MenuItemPhoto :item="side" class="tc-mp-alt-photo" />
                <div class="tc-mp-alt-text">
                    <p
                        class="tc-mp-name tc-mp-name--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        {{ side.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--sm"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        ${{ money(side.price) }}
                    </p>
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
