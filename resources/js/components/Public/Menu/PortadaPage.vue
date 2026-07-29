<script setup lang="ts">
import type { MenuBreakpoint, MenuCategoryData } from './types';

// Portada no tiene platillos ni títulos movibles — breakpoint/editable se
// aceptan solo para no filtrar como atributos HTML sueltos al <section>.
defineProps<{
    category: MenuCategoryData;
    breakpoint?: MenuBreakpoint;
    editable?: boolean;
    selectedKey?: string | null;
}>();

defineEmits<{
    select: [key: string];
    commit: [key: string, config: unknown];
}>();
</script>

<template>
    <section class="tc-mp-cover" aria-label="Tres Cantares — Puritito Norte">
        <picture v-if="category.image_url">
            <source
                v-if="category.image_mobile_url"
                media="(max-width: 767px)"
                :srcset="category.image_mobile_url"
            />
            <img
                :src="category.image_url"
                alt="Tres Cantares — Puritito Norte"
            />
        </picture>
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
