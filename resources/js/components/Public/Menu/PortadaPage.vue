<script setup lang="ts">
import { computed } from 'vue';
import { logoTresCantares } from '@/lib/tres-cantares-assets';
import type { MenuCategoryData } from './types';

const props = defineProps<{
    category: MenuCategoryData;
}>();

// background_position permite reencuadrar Portada.png (p. ej. "center 30%")
// sin recurrir a un valor fijo — controla el encuadre real de la foto.
const coverStyle = computed(() => ({
    '--tc-mp-bg-pos': props.category.background_position || 'center',
}));
</script>

<template>
    <section
        class="tc-mp-cover"
        aria-label="Tres Cantares — Puritito Norte"
        :style="coverStyle"
    >
        <img v-if="category.image_url" :src="category.image_url" alt="" />
        <div class="tc-mp-cover-overlay" />
        <div class="tc-mp-cover-logo-wrap">
            <img
                :src="logoTresCantares"
                alt="Tres Cantares — Puritito Norte"
                class="tc-mp-cover-logo"
            />
        </div>
        <div class="tc-mp-cover-scroll" aria-hidden="true">
            <span>Desliza</span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path
                    d="M4 7l6 6 6-6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </svg>
        </div>
    </section>
</template>
