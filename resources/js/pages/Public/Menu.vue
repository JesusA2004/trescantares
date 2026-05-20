<script setup lang="ts">
import { ref, computed } from 'vue';
import { Head, Link } from '@inertiajs/vue3';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';
import MenuCard from '@/components/Public/MenuCard.vue';
import { imgMenu, bgLocation, tornPaperLarge } from '@/lib/tres-cantares-assets';

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
    <Head>
        <title>Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán</title>
        <meta head-key="description" name="description"
            content="Explora el menú de Tres Cantares: platillos mexicanos auténticos preparados con ingredientes frescos. Cantaritos, tacos, pozole y mucho más en Tepoztlán, Morelos." />
        <meta head-key="keywords" name="keywords"
            content="menú Tres Cantares, platillos mexicanos, cantarito Tepoztlán, tacos Tepoztlán, comida mexicana auténtica, pozole Morelos" />
        <meta head-key="og:title" property="og:title"
            content="Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán" />
        <meta head-key="og:description" property="og:description"
            content="Descubre nuestros platillos mexicanos auténticos: cantaritos, tacos, pozole y mucho más. El sabor de México en cada bocado, en Tepoztlán, Morelos." />
        <meta head-key="og:url" property="og:url" content="/menu" />
        <meta head-key="twitter:title" name="twitter:title"
            content="Menú — Tres Cantares | Comida Mexicana Auténtica" />
        <meta head-key="twitter:description" name="twitter:description"
            content="Cantaritos, tacos, pozole y mucho más. El sabor auténtico de México en Tres Cantares, Tepoztlán." />
        <link head-key="canonical" rel="canonical" href="/menu" />
    </Head>

    <!-- ============================================================
         HERO DEL MENÚ
    ============================================================ -->
    <section class="relative min-h-[340px] lg:min-h-[400px] flex flex-col">

        <!-- Background (location bg reused for menu hero) -->
        <div class="absolute inset-0 overflow-hidden">
            <img :src="bgLocation" alt="Menú Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <div class="absolute inset-0 hero-overlay"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 flex-1 flex flex-col items-center justify-center pt-32 pb-16 px-4 text-center">
            <!-- Menu title image -->
            <div class="mb-2">
                <img :src="imgMenu" alt="Menú"
                    class="max-w-xs sm:max-w-sm lg:max-w-md w-full h-auto drop-shadow-xl mx-auto" />
            </div>
        </div>

        <!-- Torn paper bottom -->
        <div class="absolute bottom-0 left-0 right-0 z-20 leading-[0] pointer-events-none">
            <img :src="tornPaperLarge" alt="" class="w-full block"
                style="transform: scaleY(-1); height: 55px; object-fit: fill;" />
        </div>
    </section>

    <!-- ============================================================
         DIVIDER
    ============================================================ -->
    <DecorativeDivider />

    <!-- ============================================================
         FILTROS Y CATEGORÍAS
    ============================================================ -->
    <section class="py-16 lg:py-24" style="background-color: var(--tc-paper);">
        <div class="max-w-7xl mx-auto px-6">

            <!-- Category filter tabs -->
            <div class="flex flex-wrap justify-center gap-2 sm:gap-3 mb-14">
                <button
                    @click="setCategory(null)"
                    class="font-display tracking-[0.15em] text-xs sm:text-sm px-5 sm:px-7 py-2 rounded-full border-2 transition-all uppercase"
                    :class="activeCategory === null
                        ? 'text-white border-transparent'
                        : 'text-tc-pink border-tc-pink hover:text-white'"
                    :style="activeCategory === null
                        ? 'background-color: var(--tc-pink); border-color: var(--tc-pink);'
                        : ''">
                    Todos
                </button>
                <button
                    v-for="cat in categories"
                    :key="cat.id"
                    @click="setCategory(cat.id)"
                    class="font-display tracking-[0.15em] text-xs sm:text-sm px-5 sm:px-7 py-2 rounded-full border-2 transition-all uppercase"
                    :class="activeCategory === cat.id
                        ? 'text-white border-transparent'
                        : 'border-tc-pink text-tc-pink hover:text-white'"
                    :style="activeCategory === cat.id
                        ? 'background-color: var(--tc-pink); border-color: var(--tc-pink);'
                        : ''">
                    {{ cat.name }}
                </button>
            </div>

            <!-- Categories with items -->
            <div v-for="category in filteredCategories" :key="category.id" class="mb-20">

                <!-- Category header -->
                <div class="flex items-center gap-4 mb-10">
                    <div class="flex-1 h-px" style="background-color: var(--tc-yellow);"></div>
                    <h2 class="font-display text-3xl lg:text-4xl tracking-[0.15em] uppercase text-center"
                        style="color: var(--tc-blue);">
                        {{ category.name }}
                    </h2>
                    <div class="flex-1 h-px" style="background-color: var(--tc-yellow);"></div>
                </div>

                <!-- Category description -->
                <p v-if="category.description"
                    class="text-center font-body text-gray-500 text-sm mb-8 italic max-w-lg mx-auto">
                    {{ category.description }}
                </p>

                <!-- Items grid -->
                <div v-if="category.items && category.items.length > 0"
                    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <MenuCard v-for="item in category.items" :key="item.id" :item="item" />
                </div>
                <div v-else class="text-center py-10 font-body text-gray-400">
                    No hay platillos disponibles en esta categoría.
                </div>
            </div>

            <!-- Empty state -->
            <div v-if="filteredCategories.length === 0"
                class="text-center py-24 font-body text-gray-400">
                No hay categorías disponibles en el menú.
            </div>
        </div>
    </section>
</template>
