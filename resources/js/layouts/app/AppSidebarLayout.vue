<script setup lang="ts">
import AppSidebar from '@/components/AppSidebar.vue';
import AppSidebarHeader from '@/components/AppSidebarHeader.vue';
import { Toaster } from '@/components/ui/sonner';
import type { BreadcrumbItem } from '@/types';

type Props = {
    breadcrumbs?: BreadcrumbItem[];
};

withDefaults(defineProps<Props>(), {
    breadcrumbs: () => [],
});
</script>

<template>
    <div class="tc-admin-layout">
        <AppSidebar />
        <div class="tc-admin-main-wrap">
            <AppSidebarHeader :breadcrumbs="breadcrumbs" />
            <main class="tc-admin-content">
                <slot />
            </main>
        </div>
        <Toaster />
    </div>
</template>
