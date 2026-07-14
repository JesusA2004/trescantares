<script setup lang="ts">
withDefaults(
    defineProps<{
        color?: string;
        size?: number;
    }>(),
    {
        color: '#DB3465',
        size: 22,
    },
);
</script>

<template>
    <svg
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        class="mx-auto"
    >
        <path d="M12 2c1.2 3 1.2 5-0 8-1.2-3-1.2-5 0-8Z" :fill="color" />
        <path d="M12 22c1.2-3 1.2-5-0-8-1.2 3-1.2 5 0 8Z" :fill="color" />
        <path d="M2 12c3-1.2 5-1.2 8 0-3 1.2-5 1.2-8 0Z" :fill="color" />
        <path d="M22 12c-3-1.2-5-1.2-8 0 3 1.2 5 1.2 8 0Z" :fill="color" />
        <circle cx="12" cy="12" r="2.1" :fill="color" />
    </svg>
</template>
