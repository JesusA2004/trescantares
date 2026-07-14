<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { layoutFor } from '@/components/Public/Menu/layoutRegistry';
import MenuSideNav from '@/components/Public/Menu/MenuSideNav.vue';
import type { MenuCategoryData } from '@/components/Public/Menu/types';

const props = defineProps<{
    settings: Record<string, any>;
    categories: MenuCategoryData[];
}>();

const navCategories = computed(() => props.categories.filter((c) => c.layout !== 'portada'));

// Etiquetas cortas para la navegación lateral (el nombre completo va en aria-label).
const SHORT_LABELS: Record<string, string> = {
    pozole: 'Pozole',
    pancita: 'Pancita',
    birria: 'Birria',
    fusiones: 'Fusiones',
    comal: 'Comal',
    postres: 'Postres',
    bebidas_promo: 'Cantaritos',
    bebidas_tabla: 'Bebidas',
    destilados: 'Destilados',
};

const navItems = computed(() => [
    { id: null, label: 'Inicio', fullLabel: 'Inicio' },
    ...navCategories.value.map((cat) => ({
        id: cat.id,
        label: SHORT_LABELS[cat.layout] ?? cat.name,
        fullLabel: cat.name,
    })),
]);

const activeSectionId = ref<string | null>(null);
const activeCategoryId = computed(() => {
    if (!activeSectionId.value) {
return null;
}

    const match = /^cat-(\d+)$/.exec(activeSectionId.value);

    return match ? Number(match[1]) : null;
});
const showScrollTop = ref(false);

function scrollTo(catId: number | null) {
    if (catId === null) {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        return;
    }

    const el = document.getElementById(`cat-${catId}`);

    if (el) {
        const offset = 16;
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
        { rootMargin: '-25% 0px -65% 0px', threshold: 0 },
    );

    navCategories.value.forEach((cat) => {
        const el = document.getElementById(`cat-${cat.id}`);

        if (el) {
observer!.observe(el);
}
    });

    window.addEventListener('scroll', onScroll, { passive: true });
});

onUnmounted(() => {
    observer?.disconnect();
    window.removeEventListener('scroll', onScroll);
});

function onScroll() {
    showScrollTop.value = window.scrollY > 600;
}
</script>

<template>
    <Head>
        <title>Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán</title>
        <meta
            head-key="description"
            name="description"
            content="Explora el menú de Tres Cantares: pozole, pancita, birria, fusiones, postres, cantaritos y destilados. Tradición mexicana en Tepoztlán, Morelos."
        />
        <meta head-key="og:title" property="og:title" content="Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán" />
        <meta head-key="og:url" property="og:url" content="/menu" />
        <link head-key="canonical" rel="canonical" href="/menu" />
    </Head>

    <div class="tc-mp tc-public-layout">
        <MenuSideNav v-if="navCategories.length > 0" :items="navItems" :active-id="activeCategoryId" @navigate="scrollTo" />

        <template v-for="category in categories" :key="category.id">
            <section v-if="category.layout === 'portada'" :id="`cat-${category.id}`">
                <component :is="layoutFor(category)" :category="category" />
            </section>
            <section v-else :id="`cat-${category.id}`" class="tc-mp-page">
                <component :is="layoutFor(category)" :category="category" />
            </section>
        </template>

        <div v-if="categories.length === 0" style="padding: 60px 20px; text-align: center">
            <p class="tc-mp-title-text" style="color: var(--tc-pink)">Estamos preparando nuestro menú</p>
            <p class="tc-mp-ingredients" style="color: var(--tc-blue); margin-top: 10px">Próximamente nuevos sabores. ¡Vuelve pronto!</p>
        </div>

        <Transition name="tc-mp-fade">
            <button v-if="showScrollTop" class="tc-mp-scroll-top" aria-label="Subir al inicio" @click="scrollTo(null)">
                <svg viewBox="0 0 20 20" fill="none" class="w-5 h-5">
                    <path d="M10 15V5M5 10l5-5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
        </Transition>
    </div>
</template>
