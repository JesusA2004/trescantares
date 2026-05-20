<script setup lang="ts">
import { dividerUp, dividerDown } from '@/lib/tres-cantares-assets';

withDefaults(defineProps<{
    type?: 'up' | 'down'
}>(), {
    type: 'up',
});
</script>

<template>
    <!-- Imágenes reales — sin CSS inventado -->
    <div class="tc-real-divider">
        <img v-if="type === 'up'"   :src="dividerUp"   alt="" />
        <img v-if="type === 'down'" :src="dividerDown" alt="" />
    </div>
</template>
