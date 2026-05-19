<script setup lang="ts">
import Navbar from '@/components/Public/Navbar.vue';
import Footer from '@/components/Public/Footer.vue';
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const page = usePage();
const settings = computed(() => (page.props as any).settings ?? {});
const setting = (key: string, fallback = '') => settings.value?.[key] ?? fallback;
</script>

<template>
    <div class="min-h-screen flex flex-col font-body" style="font-family: var(--tc-font-body)">
        <Navbar :settings="settings" />
        <main class="flex-1">
            <slot />
        </main>
        <Footer :settings="settings" />
    </div>
</template>
