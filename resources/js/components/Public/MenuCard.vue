<script setup lang="ts">
defineProps<{
    item: {
        id: number
        name: string
        description?: string
        price: number | string
        image_url?: string
        is_featured?: boolean
    }
}>();
</script>

<template>
    <div class="bg-white rounded-xl overflow-hidden shadow-md tc-card-hover border border-gray-100">
        <!-- Image -->
        <div class="relative h-44 bg-crema overflow-hidden">
            <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                class="w-full h-full object-cover" loading="lazy" />
            <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
                <svg class="w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
            </div>
            <!-- Destacado badge -->
            <span v-if="item.is_featured"
                class="absolute top-2 right-2 bg-tc-rojo text-white text-xs font-display tracking-wider px-2 py-1 rounded">
                ESPECIAL
            </span>
        </div>
        <!-- Content -->
        <div class="p-4">
            <h3 class="font-display text-lg text-tc-oscuro tracking-wide mb-1">{{ item.name }}</h3>
            <p v-if="item.description" class="text-sm text-gray-500 font-body mb-3 line-clamp-2">{{ item.description }}</p>
            <p class="font-display text-xl text-tc-rojo">${{ Number(item.price).toFixed(2) }}</p>
        </div>
    </div>
</template>
