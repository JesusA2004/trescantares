<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { logoTresCantares } from '@/lib/tres-cantares-assets';

defineOptions({
    inheritAttrs: false,
});

type Props = {
    className?: HTMLAttributes['class'];
};

defineProps<Props>();
</script>

<template>
    <img
        :src="logoTresCantares"
        alt="Tres Cantares"
        :class="className"
        v-bind="$attrs"
        style="object-fit: contain;"
    />
</template>
