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
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <div class="tc-mp-grid--comal">
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

            <div class="tc-mp-comal-hero">
                <div v-if="main" class="tc-mp-comal-main">
                    <MenuItemPhoto
                        :item="main"
                        class="tc-mp-comal-main-photo"
                    />
                </div>

                <div v-if="main" class="tc-mp-comal-name-block">
                    <p
                        class="tc-mp-name tc-mp-name--lg"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ main.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(main.price) }}
                    </p>
                </div>
            </div>

            <div
                v-if="fillings.length"
                class="tc-mp-options-grid tc-mp-comal-fillings"
            >
                <div
                    v-for="(f, idx) in fillings"
                    :key="f.id"
                    class="tc-mp-option-item"
                    :class="{ 'tc-mp-option-item--last': idx === 4 }"
                >
                    <MenuItemPhoto :item="f" class="tc-mp-option-photo" />
                    <p class="tc-mp-option-label">{{ f.name }}</p>
                </div>
            </div>

            <div v-if="sope" class="tc-mp-alt-row tc-mp-comal-sope">
                <MenuItemPhoto :item="sope" class="tc-mp-alt-photo" />
                <div class="tc-mp-alt-text">
                    <p
                        class="tc-mp-name tc-mp-name--lg"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ sope.name }}
                    </p>
                    <p
                        class="tc-mp-price tc-mp-price--md"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        ${{ money(sope.price) }}
                    </p>
                </div>
            </div>
        </div>
    </MenuPageFrame>
</template>
