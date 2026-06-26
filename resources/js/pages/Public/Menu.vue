<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import MenuCard from '@/components/Public/MenuCard.vue';
import {
    cantaritoMain, pozoleLeft, tacoLeft, limonLeft, menuDishRight,
    cardCantarito, cardNopal,
} from '@/lib/tres-cantares-assets';

const props = defineProps<{
    settings: Record<string, any>;
    categories: any[];
}>();

// Active section tracked by IntersectionObserver
const activeSectionId = ref<string | null>(null);
const searchQuery = ref('');
const showScrollTop = ref(false);

// All categories shown (no hiding) — scroll-based navigation
const filteredCategories = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return props.categories;
    return props.categories.map((cat) => ({
        ...cat,
        items: (cat.items ?? []).filter((item: any) =>
            item.name.toLowerCase().includes(q) ||
            (item.description ?? '').toLowerCase().includes(q),
        ),
    })).filter((cat) => cat.items.length > 0);
});

function categoryAnchor(cat: any): string {
    return `cat-${cat.id}`;
}

function scrollTo(catId: number | null) {
    if (catId === null) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }
    const el = document.getElementById(`cat-${catId}`);
    if (el) {
        const offset = 90; // sticky nav height
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

let observer: IntersectionObserver | null = null;

onMounted(() => {
    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    activeSectionId.value = entry.target.id;
                }
            }
        },
        { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    );

    props.categories.forEach((cat) => {
        const el = document.getElementById(`cat-${cat.id}`);
        if (el) observer!.observe(el);
    });

    window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener('scroll', onScroll);
});

function onScroll() {
    showScrollTop.value = window.scrollY > 400;
}

function isActive(catId: number): boolean {
    return activeSectionId.value === `cat-${catId}`;
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

    <div class="tc-menu-wrap tc-public-layout">

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

        <!-- ── NAVEGACIÓN RÁPIDA STICKY ───────────────── -->
        <div v-if="categories.length > 0" class="tc-menu-quicknav-wrap">
            <div class="tc-menu-quicknav">
                <!-- Search -->
                <div class="tc-menu-quicknav-search">
                    <svg class="tc-menu-quicknav-search-icon" viewBox="0 0 20 20" fill="none">
                        <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.8"/>
                        <path d="M13 13l3.5 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Buscar platillo…"
                        class="tc-menu-quicknav-input"
                    />
                </div>

                <!-- Category pills -->
                <div class="tc-menu-quicknav-pills">
                    <button
                        class="tc-menu-quicknav-pill font-display"
                        :class="{ 'tc-menu-quicknav-pill--active': !activeSectionId }"
                        @click="scrollTo(null)"
                    >
                        <span>✦</span> Inicio
                    </button>
                    <button
                        v-for="cat in categories"
                        :key="cat.id"
                        class="tc-menu-quicknav-pill font-display"
                        :class="{ 'tc-menu-quicknav-pill--active': isActive(cat.id) }"
                        @click="scrollTo(cat.id)"
                    >
                        {{ cat.name }}
                    </button>
                </div>
            </div>
        </div>

        <!-- ── SECCIONES DE CATEGORÍAS ─────────────── -->
        <main class="tc-menu-content" style="position:relative; z-index:30;">
            <div class="tc-menu-content-inner">

                <template v-if="filteredCategories.length > 0">
                    <section
                        v-for="category in filteredCategories"
                        :key="category.id"
                        :id="categoryAnchor(category)"
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

        <!-- Botón subir -->
        <Transition name="tc-scroll-top">
            <button
                v-if="showScrollTop"
                class="tc-scroll-top-btn"
                aria-label="Subir al inicio"
                @click="scrollTo(null)"
            >
                <svg viewBox="0 0 20 20" fill="none" class="w-5 h-5">
                    <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
        </Transition>

    </div>
</template>
