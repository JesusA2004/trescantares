<script setup lang="ts">
defineProps<{
    title: string;
    color?: 'rojo' | 'azul' | 'verde' | 'blanco';
    subtitle?: string;
}>();
</script>

<template>
    <div class="mb-10 text-center">
        <h2
            class="font-display tracking-widest uppercase"
            :class="{
                'text-tc-rojo text-5xl lg:text-7xl': color === 'rojo' || !color,
                'text-tc-azul text-5xl lg:text-7xl': color === 'azul',
                'text-tc-verde text-5xl lg:text-7xl': color === 'verde',
                'text-5xl text-white lg:text-7xl': color === 'blanco',
            }"
        >
            {{ title }}
        </h2>
        <p
            v-if="subtitle"
            class="font-body mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600"
        >
            {{ subtitle }}
        </p>
    </div>
</template>
