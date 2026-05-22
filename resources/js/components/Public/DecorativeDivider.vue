<script setup lang="ts">
import { computed } from 'vue';
import { dividerUp, dividerDown } from '@/lib/tres-cantares-assets';

const props = withDefaults(
    defineProps<{
        type?: 'up' | 'down';
    }>(),
    {
        type: 'up',
    },
);

const dividerSrc = computed(() => {
    return props.type === 'down' ? dividerDown : dividerUp;
});

const dividerClass = computed(() => {
    return props.type === 'down' ? 'tc-divider-down' : 'tc-divider-up';
});
</script>

<template>
    <!-- Imágenes reales — sin CSS inventado -->
    <div class="tc-real-divider" :class="dividerClass">
        <img :src="dividerSrc" alt="" loading="lazy" decoding="async" />
    </div>
</template>
