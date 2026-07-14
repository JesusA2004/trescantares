<script setup lang="ts">
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import Footer from '@/components/Public/Footer.vue';
import Navbar from '@/components/Public/Navbar.vue';

const page = usePage();
const settings = computed(() => (page.props as any).settings ?? {});
const isHome = computed(() => page.component === 'Public/Home');
// El menú público abre con una portada de foto completa (como el hero de
// Home): el navbar debe flotar encima de ella en vez de empujarla hacia
// abajo. Ninguna otra página pública se ve afectada por esta clase.
const isMenuHero = computed(() => page.component === 'Public/Menu');
</script>

<template>
    <div
        class="font-body tc-public-shell min-h-screen"
        :class="{
            'tc-public-shell--paper': !isHome,
            'tc-public-shell--menu-hero': isMenuHero,
        }"
        style="font-family: var(--tc-font-body)"
    >
        <template v-if="isHome">
            <slot />
        </template>
        <template v-else>
            <Navbar :settings="settings" />
            <main>
                <slot />
            </main>
            <Footer :settings="settings" />
        </template>
    </div>
</template>
