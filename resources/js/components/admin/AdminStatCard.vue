<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
    label: string;
    value: string | number;
    icon?: Component;
    color?: 'blue' | 'pink' | 'green' | 'yellow';
    href?: string;
}>();
</script>

<template>
    <component
        :is="href ? 'a' : 'div'"
        :href="href"
        class="tc-stat-card-premium group"
        :class="color ?? 'blue'"
    >
        <div class="flex items-start justify-between gap-2">
            <p class="tc-stat-card-premium-label">{{ label }}</p>
            <div
                v-if="icon"
                class="tc-stat-card-premium-icon"
                :class="color ?? 'blue'"
            >
                <component :is="icon" class="w-5 h-5" />
            </div>
        </div>
        <p class="tc-stat-card-premium-value">{{ value }}</p>
        <slot name="footer" />
    </component>
</template>
