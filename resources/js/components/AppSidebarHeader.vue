<script setup lang="ts">
import Breadcrumbs from '@/components/Breadcrumbs.vue';
import type { BreadcrumbItem } from '@/types';

withDefaults(
    defineProps<{
        breadcrumbs?: BreadcrumbItem[];
    }>(),
    {
        breadcrumbs: () => [],
    },
);
</script>

<template>
    <header class="tc-admin-topbar">
        <Breadcrumbs v-if="breadcrumbs && breadcrumbs.length > 0" :breadcrumbs="breadcrumbs" />
        <div v-else class="h-4" />
    </header>
</template>
