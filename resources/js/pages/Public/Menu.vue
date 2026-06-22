<script setup lang="ts">
import { ref, computed } from 'vue';
import { Head } from '@inertiajs/vue3';
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

    <!-- HERO -->
    <section class="tc-menu-page-hero">
        <div class="tc-menu-page-hero-bg">
            <img :src="bgLocation" alt="Menú Tres Cantares"
                class="w-full h-full object-cover object-center" loading="eager" />
            <div class="tc-menu-page-hero-overlay"></div>
        </div>

        <div class="tc-menu-page-hero-content">
            <div class="tc-menu-page-star-row">
                <span class="tc-menu-page-star">✦</span>
                <span class="tc-menu-page-hero-eyebrow font-display">Tres Cantares</span>
                <span class="tc-menu-page-star">✦</span>
            </div>
            <div class="tc-menu-page-title-wrap">
                <img :src="imgMenu" alt="Nuestro Menú"
                    class="tc-menu-page-title-img" />
            </div>
            <p class="tc-menu-page-hero-sub font-body">
                Sabores auténticos de México, preparados con ingredientes frescos cada día
            </p>
        </div>

        <!-- Torn paper bottom -->
        <div class="tc-menu-page-torn-bottom">
            <img :src="tornPaperLarge" alt=""
                style="transform: scaleY(-1); width:100%; height:55px; object-fit:fill; display:block;" />
        </div>
    </section>

    <!-- CONTENT -->
    <section class="tc-menu-page-body">
        <div class="tc-menu-page-inner">

            <!-- Category filter -->
            <div v-if="categories.length > 0" class="tc-menu-page-filters">
                <button
                    @click="setCategory(null)"
                    class="tc-menu-filter-btn font-display"
                    :class="{ 'tc-menu-filter-btn--active': activeCategory === null }">
                    Todos
                </button>
                <button
                    v-for="cat in categories"
                    :key="cat.id"
                    @click="setCategory(cat.id)"
                    class="tc-menu-filter-btn font-display"
                    :class="{ 'tc-menu-filter-btn--active': activeCategory === cat.id }">
                    {{ cat.name }}
                </button>
            </div>

            <!-- Category sections -->
            <template v-if="filteredCategories.length > 0">
                <div v-for="category in filteredCategories" :key="category.id" class="tc-menu-page-category">

                    <!-- Category header -->
                    <div class="tc-menu-page-cat-header">
                        <div class="tc-menu-page-cat-line"></div>
                        <div class="tc-menu-page-cat-title-wrap">
                            <span class="tc-menu-page-cat-star">✦</span>
                            <h2 class="tc-menu-page-cat-name font-display">{{ category.name }}</h2>
                            <span class="tc-menu-page-cat-star">✦</span>
                        </div>
                        <div class="tc-menu-page-cat-line"></div>
                    </div>

                    <p v-if="category.description"
                        class="tc-menu-page-cat-desc font-body">
                        {{ category.description }}
                    </p>

                    <!-- Items grid -->
                    <div v-if="category.items && category.items.length > 0"
                        class="tc-menu-page-grid">
                        <MenuCard v-for="item in category.items" :key="item.id" :item="item" />
                    </div>

                    <!-- Empty category -->
                    <div v-else class="tc-menu-page-cat-empty">
                        <span class="font-display" style="color: var(--tc-blue); opacity:.4; font-size:2rem;">✦</span>
                        <p class="font-body" style="color: var(--tc-blue); opacity:.5; margin-top:8px;">
                            Próximamente platillos en esta categoría
                        </p>
                    </div>
                </div>
            </template>

            <!-- Empty menu state -->
            <div v-else class="tc-menu-page-empty">
                <img :src="imgMenu" alt="Menú"
                    style="max-width:260px; width:100%; opacity:.18; margin:0 auto 24px; display:block;" />
                <p class="font-display tc-menu-page-empty-title">Pronto disponible</p>
                <p class="font-body tc-menu-page-empty-sub">
                    Estamos preparando algo delicioso. Vuelve pronto para descubrir nuestro menú.
                </p>
            </div>

        </div>
    </section>
</template>
