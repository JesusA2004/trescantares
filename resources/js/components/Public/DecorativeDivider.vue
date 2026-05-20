<script setup lang="ts">
import { dividerUp, dividerDown } from '@/lib/tres-cantares-assets';

withDefaults(defineProps<{
    variant?: 'up' | 'down' | 'both'
}>(), {
    variant: 'both',
});
</script>

<template>
    <!-- mexican-divider-up.png + mexican-divider-down.png — imágenes reales, sin CSS inventado -->
    <div class="tc-real-divider">
        <img
            v-if="variant === 'up' || variant === 'both'"
            :src="dividerUp"
            alt="" />
        <img
            v-if="variant === 'down' || variant === 'both'"
            :src="dividerDown"
            alt="" />
    </div>
</template>
