<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { layoutFor } from '@/components/Public/Menu/layoutRegistry';
import MenuSideNav from '@/components/Public/Menu/MenuSideNav.vue';
import {
    categoryElementFor,
    itemElementFor,
    resolveMenuDevice,
} from '@/components/Public/Menu/types';
import type {
    CategoryElementKey,
    ElementConfig,
    ItemElementKey,
    MenuCategoryData,
    MenuDevice,
} from '@/components/Public/Menu/types';
import { useViewportWidth } from '@/composables/useBreakpoint';
import { useMenuPreviewChild } from '@/composables/useMenuPreviewBridge';
import { patchJson } from '@/lib/jsonApi';

// Ancho real y continuo del viewport — cada elemento interpola su posición
// entre Móvil/Tablet/Escritorio según este número (ver resolveElementConfig
// en types.ts). Dentro del iframe del editor este valor SIEMPRE coincide
// EXACTO con uno de los tres anchos de referencia (390/768/1440), así que la
// interpolación resuelve al ancla pura, sin mezclar — por eso editor y
// /menu son pixel-exactos entre sí.
const viewportWidth = useViewportWidth();
// Vista (mobile/tablet/desktop) en la que se persiste un arrastre/resize
// hecho DENTRO del iframe — solo aplica en modo editable.
const currentDevice = computed<MenuDevice>(() =>
    resolveMenuDevice(viewportWidth.value),
);

const props = withDefaults(
    defineProps<{
        settings: Record<string, any>;
        categories: MenuCategoryData[];
        editable?: boolean;
    }>(),
    {
        editable: false,
    },
);

// Copia local reactiva — en modo editable el iframe aplica el cambio de
// inmediato (feedback instantáneo) y lo persiste en segundo plano; en modo
// público es simplemente los props tal cual (nunca se muta).
const categories = reactive<MenuCategoryData[]>(
    JSON.parse(JSON.stringify(props.categories)),
);

const navCategories = computed(() =>
    categories.filter((c) => c.layout !== 'portada'),
);

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

/* ------------------------------------------------------------------ */
/* Modo editable: selección + guardado, puenteado al padre (editor)     */
/* ------------------------------------------------------------------ */

const selectedKey = ref<string | null>(null);

interface ParsedKey {
    kind: 'item' | 'category';
    id: number;
    element: ItemElementKey | CategoryElementKey;
}

function parseKey(key: string): ParsedKey | null {
    const itemMatch = /^item-(\d+):(.+)$/.exec(key);

    if (itemMatch) {
        return {
            kind: 'item',
            id: Number(itemMatch[1]),
            element: itemMatch[2] as ItemElementKey,
        };
    }

    const catMatch = /^category-(\d+):(.+)$/.exec(key);

    if (catMatch) {
        return {
            kind: 'category',
            id: Number(catMatch[1]),
            element: catMatch[2] as CategoryElementKey,
        };
    }

    return null;
}

function findItem(id: number) {
    for (const cat of categories) {
        const item = cat.items.find((i) => i.id === id);

        if (item) {
            return item;
        }
    }

    return null;
}

function findCategory(id: number) {
    return categories.find((c) => c.id === id) ?? null;
}

function resolveConfig(key: string): ElementConfig | null {
    const parsed = parseKey(key);

    if (!parsed) {
        return null;
    }

    if (parsed.kind === 'item') {
        const item = findItem(parsed.id);

        return item
            ? itemElementFor(
                  item,
                  parsed.element as ItemElementKey,
                  viewportWidth.value,
              )
            : null;
    }

    const category = findCategory(parsed.id);

    return category
        ? categoryElementFor(
              category,
              parsed.element as CategoryElementKey,
              viewportWidth.value,
          )
        : null;
}

function applyLocal(
    key: string,
    config: ElementConfig | null,
    bp: MenuDevice = currentDevice.value,
) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    const target =
        parsed.kind === 'item' ? findItem(parsed.id) : findCategory(parsed.id);

    if (!target) {
        return;
    }

    const field =
        parsed.kind === 'item' ? 'layout_settings' : 'visual_settings';
    const settings = { ...((target as any)[field] ?? {}) };
    const elementSettings = { ...(settings[parsed.element] ?? {}) };

    if (config) {
        elementSettings[bp] = config;
    } else {
        delete elementSettings[bp];
    }

    if (Object.keys(elementSettings).length) {
        settings[parsed.element] = elementSettings;
    } else {
        delete settings[parsed.element];
    }

    (target as any)[field] = Object.keys(settings).length ? settings : null;
}

async function persist(
    key: string,
    config: ElementConfig | null,
    bp: MenuDevice = currentDevice.value,
) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    const body = config
        ? { element: parsed.element, breakpoint: bp, config }
        : { element: parsed.element, breakpoint: bp, clear: true };

    if (parsed.kind === 'item') {
        await patchJson(`/admin/menu-editor/items/${parsed.id}/element`, body);
    } else {
        await patchJson(
            `/admin/menu-editor/categories/${parsed.id}/element`,
            body,
        );
    }
}

function scrollToCategoryId(categoryId: number | null) {
    if (categoryId === null) {
        window.scrollTo({ top: 0 });

        return;
    }

    document
        .getElementById(`cat-${categoryId}`)
        ?.scrollIntoView({ block: 'start' });
}

function measureRect(elementKey: string) {
    const el = document.querySelector<HTMLElement>(
        `[data-element-key="${CSS.escape(elementKey)}"]`,
    );

    if (!el) {
        return null;
    }

    const parent = el.parentElement;
    const elRect = el.getBoundingClientRect();
    const parentRect = (parent ?? el).getBoundingClientRect();

    return {
        element: {
            left: elRect.left,
            top: elRect.top,
            width: elRect.width,
            height: elRect.height,
        },
        parent: {
            left: parentRect.left,
            top: parentRect.top,
            width: parentRect.width,
            height: parentRect.height,
        },
    };
}

const bridge = useMenuPreviewChild({
    onSelectElement: (key) => {
        selectedKey.value = key;
    },
    onUpdateConfig: (key, config, bp) => {
        applyLocal(key, config, bp ?? currentDevice.value);
        void persist(key, config, bp ?? currentDevice.value);
    },
    onClearElement: (key, bp) => {
        applyLocal(key, null, bp ?? currentDevice.value);
        void persist(key, null, bp ?? currentDevice.value);
    },
    onScrollToCategory: (categoryId) => {
        scrollToCategoryId(categoryId);
    },
    onRequestRect: (elementKey, requestId) => {
        bridge.post({ type: 'rect', requestId, rect: measureRect(elementKey) });
    },
});

function onElementSelect(key: string) {
    selectedKey.value = key;
    const config = resolveConfig(key);

    if (config) {
        bridge.post({ type: 'select', elementKey: key, config });
    }
}

function onElementCommit(key: string, config: ElementConfig) {
    applyLocal(key, config);
    void persist(key, config);
    bridge.post({ type: 'commit', elementKey: key, config });
}
</script>

<template>
    <Head>
        <title>
            Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán
        </title>
        <meta
            head-key="description"
            name="description"
            content="Explora el menú de Tres Cantares: pozole, pancita, birria, fusiones, postres, cantaritos y destilados. Tradición mexicana en Tepoztlán, Morelos."
        />
        <meta
            head-key="og:title"
            property="og:title"
            content="Menú — Tres Cantares | Comida Mexicana Auténtica en Tepoztlán"
        />
        <meta head-key="og:url" property="og:url" content="/menu" />
        <link head-key="canonical" rel="canonical" href="/menu" />
    </Head>

    <div
        class="tc-mp tc-public-layout"
        :class="{ 'tc-mp--editable': editable }"
    >
        <MenuSideNav
            v-if="navCategories.length > 0 && !editable"
            :items="navItems"
            :active-id="activeCategoryId"
            @navigate="scrollTo"
        />

        <template v-for="category in categories" :key="category.id">
            <section
                v-if="category.layout === 'portada'"
                :id="`cat-${category.id}`"
            >
                <component
                    :is="layoutFor(category)"
                    :category="category"
                    :breakpoint="viewportWidth"
                    :editable="editable"
                    :selected-key="selectedKey"
                    @select="onElementSelect"
                    @commit="onElementCommit"
                />
            </section>
            <section v-else :id="`cat-${category.id}`" class="tc-mp-page">
                <component
                    :is="layoutFor(category)"
                    :category="category"
                    :breakpoint="viewportWidth"
                    :editable="editable"
                    :selected-key="selectedKey"
                    @select="onElementSelect"
                    @commit="onElementCommit"
                />
            </section>
        </template>

        <div
            v-if="categories.length === 0"
            style="padding: 60px 20px; text-align: center"
        >
            <p class="tc-mp-title-text" style="color: var(--tc-pink)">
                Estamos preparando nuestro menú
            </p>
            <p
                class="tc-mp-ingredients"
                style="color: var(--tc-blue); margin-top: 10px"
            >
                Próximamente nuevos sabores. ¡Vuelve pronto!
            </p>
        </div>

        <Transition name="tc-mp-fade">
            <button
                v-if="showScrollTop && !editable"
                class="tc-mp-scroll-top"
                aria-label="Subir al inicio"
                @click="scrollTo(null)"
            >
                <svg viewBox="0 0 20 20" fill="none" class="h-5 w-5">
                    <path
                        d="M10 15V5M5 10l5-5 5 5"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    />
                </svg>
            </button>
        </Transition>
    </div>
</template>
