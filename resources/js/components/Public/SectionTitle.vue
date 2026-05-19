<script setup lang="ts">
defineProps<{
    title: string
    color?: 'rojo' | 'azul' | 'verde' | 'blanco'
    subtitle?: string
}>();
</script>

<template>
    <div class="text-center mb-10">
        <h2 class="font-display tracking-widest uppercase"
            :class="{
                'text-5xl lg:text-7xl text-tc-rojo': color === 'rojo' || !color,
                'text-5xl lg:text-7xl text-tc-azul': color === 'azul',
                'text-5xl lg:text-7xl text-tc-verde': color === 'verde',
                'text-5xl lg:text-7xl text-white': color === 'blanco',
            }">
            {{ title }}
        </h2>
        <p v-if="subtitle" class="mt-4 text-gray-600 font-body max-w-2xl mx-auto text-base leading-relaxed">
            {{ subtitle }}
        </p>
    </div>
</template>
