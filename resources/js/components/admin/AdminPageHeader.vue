<script setup lang="ts">
defineProps<{
    title: string;
    description?: string;
}>();
</script>

<template>
    <div class="tc-admin-page-header">
        <div>
            <div class="tc-admin-accent">
                <span class="text-xs font-semibold tracking-widest uppercase text-[var(--tc-yellow)]">
                    <slot name="label">Panel</slot>
                </span>
            </div>
            <h1 class="tc-admin-page-title">{{ title }}</h1>
            <p v-if="description" class="tc-admin-page-description">{{ description }}</p>
        </div>
        <div v-if="$slots.actions" class="flex items-center gap-2 flex-shrink-0">
            <slot name="actions" />
        </div>
    </div>
</template>
