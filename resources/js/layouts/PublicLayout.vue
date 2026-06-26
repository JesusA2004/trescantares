<script setup lang="ts">
import Navbar from '@/components/Public/Navbar.vue';
import Footer from '@/components/Public/Footer.vue';
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const settings = computed(() => (page.props as any).settings ?? {});
const isHome = computed(() => page.component === 'Public/Home');
</script>

<template>
    <div class="min-h-screen font-body tc-public-shell"
         :class="{ 'tc-public-shell--paper': !isHome }"
         style="font-family: var(--tc-font-body)">
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
