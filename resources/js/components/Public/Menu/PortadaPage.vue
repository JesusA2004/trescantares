<script setup lang="ts">
import { logoTresCantares } from '@/lib/tres-cantares-assets';
import type { MenuCategoryData } from './types';

defineProps<{
    category: MenuCategoryData;
}>();
</script>

<template>
    <section class="tc-mp-cover" aria-label="Tres Cantares — Puritito Norte">
        <img v-if="category.image_url" :src="category.image_url" alt="" />
        <div
            style="
                position: absolute;
                inset: 0;
                background: linear-gradient(180deg, rgba(123, 16, 48, 0.42) 0%, rgba(123, 16, 48, 0.12) 38%, rgba(20, 30, 50, 0.18) 100%);
            "
        />
        <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 10%">
            <img
                :src="logoTresCantares"
                alt="Tres Cantares — Puritito Norte"
                style="
                    width: 100%;
                    max-width: 380px;
                    filter: brightness(0) invert(1) drop-shadow(0 6px 14px rgba(0, 0, 0, 0.35));
                "
            />
        </div>
        <div class="tc-mp-cover-scroll" aria-hidden="true">
            <span>Desliza</span>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M4 7l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </div>
    </section>
</template>
