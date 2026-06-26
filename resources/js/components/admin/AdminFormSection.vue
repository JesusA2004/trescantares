<script setup lang="ts">
defineProps<{
    title: string;
    description?: string;
}>();
</script>

<template>
    <div class="tc-form-section">
        <div class="tc-form-section-header">
            <h3 class="tc-form-section-title">{{ title }}</h3>
            <p v-if="description" class="text-xs text-gray-500 dark:text-white/60 mt-0.5">{{ description }}</p>
        </div>
        <div class="tc-form-section-body">
            <slot />
        </div>
    </div>
</template>
