<script setup lang="ts">
import { ref, computed } from 'vue';
import { Head } from '@inertiajs/vue3';
import MenuCard from '@/components/Public/MenuCard.vue';
import {
    cantaritoMain, pozoleLeft, tacoLeft, limonLeft, menuDishRight,
    cardCantarito, cardNopal,
} from '@/lib/tres-cantares-assets';

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
        <meta head-key="og:title" property="og:title"
            content="Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán" />
        <meta head-key="og:url" property="og:url" content="/menu" />
        <link head-key="canonical" rel="canonical" href="/menu" />
    </Head>

    <div class="tc-menu-wrap">

        <!-- ── IMÁGENES DECORATIVAS FLOTANTES ─────────── -->

        <!-- Cantarito — derecha alta -->
        <img :src="cantaritoMain" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="right: -10px; top: 20px; width: clamp(160px, 16vw, 300px); animation: tc-float-slow 9s ease-in-out infinite;" />

        <!-- Pozole — derecha media -->
        <img :src="pozoleLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="right: -30px; top: 55%; width: clamp(180px, 18vw, 340px); animation: tc-float 11s 2s ease-in-out infinite;" />

        <!-- Tacos — izquierda alta -->
        <img :src="tacoLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="left: -30px; top: 60px; width: clamp(170px, 17vw, 320px); animation: tc-float-med 10s 1s ease-in-out infinite;" />

        <!-- Limones — izquierda media-baja -->
        <img :src="limonLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="left: -10px; top: 52%; width: clamp(100px, 10vw, 180px); opacity: .85; animation: tc-float-slow 8s 3s ease-in-out infinite;" />

        <!-- Card cantarito — abajo derecha -->
        <img :src="cardCantarito" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="right: 20px; bottom: 100px; width: clamp(90px, 9vw, 160px); opacity: .7; animation: tc-float-med 7s 4s ease-in-out infinite;" />

        <!-- Card nopal — abajo izquierda -->
        <img :src="cardNopal" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food tc-menu-deco-img"
            style="left: 20px; bottom: 80px; width: clamp(90px, 9vw, 160px); opacity: .7; animation: tc-float 8s 5s ease-in-out infinite;" />

        <!-- ── HEADER EDITORIAL ─────────────────────── -->
        <header class="tc-menu-header" style="position:relative; z-index:30;">
            <div class="tc-menu-header-inner">

                <div class="tc-premium-ornament">
                    <span class="tc-gold-line"></span>
                    <span class="tc-gold-star font-display">✦</span>
                    <span class="tc-gold-line"></span>
                </div>

                <h1 class="tc-page-title-xl" style="text-align:center;">
                    Nuestro<br>Menú
                </h1>

                <p class="tc-page-title-tagline" style="margin-top:16px; text-align:center;">
                    Tradición, abundancia y sabor que se canta.
                </p>

                <div class="tc-premium-ornament">
                    <span class="tc-gold-line"></span>
                    <span class="tc-gold-star font-display">✦</span>
                    <span class="tc-gold-line"></span>
                </div>

            </div>
        </header>

        <!-- ── FILTROS DE CATEGORÍA ─────────────────── -->
        <div v-if="categories.length > 0" class="tc-menu-filters-wrap" style="position:relative; z-index:30;">
            <div class="tc-menu-filters">
                <button
                    class="tc-menu-tab font-display"
                    :class="{ 'tc-menu-tab--active': activeCategory === null }"
                    @click="setCategory(null)">
                    <span class="tc-menu-tab-star">✦</span>
                    Todos
                </button>
                <button
                    v-for="cat in categories" :key="cat.id"
                    class="tc-menu-tab font-display"
                    :class="{ 'tc-menu-tab--active': activeCategory === cat.id }"
                    @click="setCategory(cat.id)">
                    <span class="tc-menu-tab-star">✦</span>
                    {{ cat.name }}
                </button>
            </div>
        </div>

        <!-- ── SECCIONES DE CATEGORÍAS ─────────────── -->
        <main class="tc-menu-content" style="position:relative; z-index:30;">
            <div class="tc-menu-content-inner">

                <template v-if="filteredCategories.length > 0">
                    <section
                        v-for="category in filteredCategories"
                        :key="category.id"
                        class="tc-menu-section"
                    >
                        <!-- Encabezado de sección -->
                        <div class="tc-menu-section-head">
                            <div class="tc-menu-section-line"></div>
                            <div class="tc-menu-section-title-wrap">
                                <span class="tc-menu-section-star font-display">✦</span>
                                <h2 class="tc-menu-section-title font-display">{{ category.name }}</h2>
                                <span class="tc-menu-section-star font-display">✦</span>
                            </div>
                            <div class="tc-menu-section-line"></div>
                        </div>

                        <p v-if="category.description" class="tc-menu-section-desc font-body">
                            {{ category.description }}
                        </p>

                        <!-- Grid de productos -->
                        <div v-if="category.items && category.items.length > 0" class="tc-menu-grid">
                            <MenuCard v-for="item in category.items" :key="item.id" :item="item" />
                        </div>

                        <!-- Sin productos en categoría -->
                        <div v-else class="tc-menu-empty-cat">
                            <span class="font-display" style="color:var(--tc-yellow); font-size:2rem; opacity:.5;">✦</span>
                            <p class="font-body" style="color:var(--tc-blue); opacity:.45; margin-top:10px; font-size:.95rem;">
                                Próximamente platillos en esta categoría
                            </p>
                        </div>

                    </section>
                </template>

                <!-- Estado vacío completo -->
                <div v-else class="tc-menu-empty-full">
                    <div class="tc-premium-ornament">
                        <span class="tc-gold-line"></span>
                        <span class="tc-gold-star font-display">✦</span>
                        <span class="tc-gold-line"></span>
                    </div>
                    <img :src="menuDishRight" alt="" aria-hidden="true"
                        style="max-width:220px; width:100%; opacity:.35; margin:24px auto; display:block;" />
                    <p class="font-display tc-menu-empty-title">Estamos preparando nuestro menú</p>
                    <p class="font-body tc-menu-empty-sub">Próximamente nuevos sabores. ¡Vuelve pronto!</p>
                </div>

            </div>
        </main>

    </div>
</template>
