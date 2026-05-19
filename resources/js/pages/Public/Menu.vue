<script setup lang="ts">
import { ref, computed } from 'vue';
import { Head } from '@inertiajs/vue3';
import SectionTitle from '@/components/Public/SectionTitle.vue';
import MenuCard from '@/components/Public/MenuCard.vue';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';

const props = defineProps<{
    settings: Record<string, any>
    categories: any[]
}>();

const activeCategory = ref<number | null>(null);

const filteredCategories = computed(() => {
    if (activeCategory.value === null) return props.categories;
    return props.categories.filter(c => c.id === activeCategory.value);
});

function setCategory(id: number | null) {
    activeCategory.value = id;
}
</script>

<template>
    <Head title="Menú" />

    <!-- Hero pequeño -->
    <section class="relative h-64 flex items-center justify-center">
        <div class="absolute inset-0 overflow-hidden">
            <div class="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
            <div class="absolute inset-0 hero-overlay"></div>
        </div>
        <div class="relative z-10 text-center pt-16 pb-8">
            <h1 class="font-display text-6xl lg:text-8xl text-white tracking-widest drop-shadow-2xl">MENÚ</h1>
        </div>
    </section>

    <DecorativeDivider />

    <!-- Contenido del menú -->
    <section class="tc-section bg-papel">
        <div class="max-w-7xl mx-auto px-6">
            <!-- Filtros de categorías -->
            <div class="flex flex-wrap justify-center gap-3 mb-12">
                <button
                    @click="setCategory(null)"
                    class="font-display tracking-wider text-sm px-6 py-2 rounded-full border-2 transition-all uppercase"
                    :class="activeCategory === null
                        ? 'bg-tc-rojo border-tc-rojo text-white'
                        : 'border-tc-rojo text-tc-rojo hover:bg-tc-rojo hover:text-white'">
                    Todos
                </button>
                <button
                    v-for="cat in categories"
                    :key="cat.id"
                    @click="setCategory(cat.id)"
                    class="font-display tracking-wider text-sm px-6 py-2 rounded-full border-2 transition-all uppercase"
                    :class="activeCategory === cat.id
                        ? 'bg-tc-rojo border-tc-rojo text-white'
                        : 'border-tc-rojo text-tc-rojo hover:bg-tc-rojo hover:text-white'">
                    {{ cat.name }}
                </button>
            </div>

            <!-- Categorías con platillos -->
            <div v-for="category in filteredCategories" :key="category.id" class="mb-16">
                <div class="flex items-center gap-4 mb-8">
                    <div class="flex-1 h-px bg-gray-200"></div>
                    <h2 class="font-display text-3xl lg:text-4xl text-tc-azul tracking-widest uppercase">
                        {{ category.name }}
                    </h2>
                    <div class="flex-1 h-px bg-gray-200"></div>
                </div>
                <p v-if="category.description" class="text-center font-body text-gray-500 text-sm mb-6">
                    {{ category.description }}
                </p>
                <div v-if="category.items && category.items.length > 0"
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <MenuCard v-for="item in category.items" :key="item.id" :item="item" />
                </div>
                <div v-else class="text-center py-8 text-gray-400 font-body">
                    No hay platillos disponibles en esta categoría.
                </div>
            </div>

            <div v-if="filteredCategories.length === 0" class="text-center py-20 text-gray-400 font-body">
                No hay categorías disponibles.
            </div>
        </div>
    </section>
</template>
