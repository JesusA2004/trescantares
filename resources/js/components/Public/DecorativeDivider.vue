<script setup lang="ts">
import { dividerUp, dividerDown } from '@/lib/tres-cantares-assets';

withDefaults(defineProps<{
    variant?: 'up' | 'down' | 'both'
}>(), {
    variant: 'both',
});
</script>

<template>
    <div class="w-full overflow-hidden leading-[0]">
        <img
            v-if="variant === 'up' || variant === 'both'"
            :src="dividerUp"
            alt=""
            class="w-full block"
            style="object-fit: fill;" />
        <img
            v-if="variant === 'down' || variant === 'both'"
            :src="dividerDown"
            alt=""
            class="w-full block"
            style="object-fit: fill;" />
    </div>
</template>
