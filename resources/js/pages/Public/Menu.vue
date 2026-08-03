<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { layoutFor } from '@/components/Public/Menu/layoutRegistry';
import MenuEditableElement from '@/components/Public/Menu/MenuEditableElement.vue';
import MenuSideNav from '@/components/Public/Menu/MenuSideNav.vue';
import {
    MENU_DEVICE_WIDTH,
    categoryElementFor,
    decorationElementFor,
    isV2Config,
    itemElementFor,
    resolveMenuDevice,
    sectionHeightFor,
    toAnchorCoordinates,
} from '@/components/Public/Menu/types';
import type {
    CategoryElementKey,
    ItemElementKey,
    MenuCategoryData,
    MenuDecorationData,
    MenuDevice,
    StoredElementConfig,
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

const navCategories = computed(() => categories.filter((c) => c.show_in_nav));

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

/**
 * Alt+clic para seleccionar el elemento de ABAJO cuando un adorno (u otro
 * elemento) tapa a otro en el mismo punto — la capa de adornos siempre pinta
 * encima del contenido (ver .tc-mp-decoration-layer en app.css), así que un
 * clic normal en esa zona SIEMPRE llega primero al adorno; sin esto, el
 * elemento tapado queda inalcanzable desde el lienzo (solo quedaría la lista
 * lateral). Capture phase en `document` para interceptar el gesto ANTES de
 * que llegue al propio `@pointerdown="startDrag"` del elemento superior
 * (bubble phase, en MenuEditableElement.vue) — `stopPropagation()` aquí
 * impide que ese handler se ejecute, así que un clic SIN Alt nunca se ve
 * afectado. Cada Alt+clic avanza un paso en el stack de
 * `elementsFromPoint()`, cicla al llegar al final.
 */
function handleEditorAltClick(event: PointerEvent) {
    if (!event.altKey) {
        return;
    }

    const target = event.target as HTMLElement | null;

    if (!target?.closest('.tc-mev')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    for (const el of document.elementsFromPoint(event.clientX, event.clientY)) {
        const withKey = (el as HTMLElement).closest?.(
            '[data-element-key]',
        ) as HTMLElement | null;
        const key = withKey?.getAttribute('data-element-key');

        if (key && !keys.includes(key)) {
            keys.push(key);
        }
    }

    if (keys.length === 0) {
        return;
    }

    const currentIndex = selectedKey.value ? keys.indexOf(selectedKey.value) : -1;
    onElementSelect(keys[(currentIndex + 1) % keys.length]);
}

let observer: IntersectionObserver | null = null;

onMounted(() => {
    if (props.editable) {
        document.addEventListener('pointerdown', handleEditorAltClick, {
            capture: true,
        });
    }

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
    if (props.editable) {
        document.removeEventListener('pointerdown', handleEditorAltClick, {
            capture: true,
        });
    }

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
    kind: 'item' | 'category' | 'decoration';
    id: number;
    element: ItemElementKey | CategoryElementKey | 'image';
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

    const decorationMatch = /^decoration-(\d+):(.+)$/.exec(key);

    if (decorationMatch) {
        return {
            kind: 'decoration',
            id: Number(decorationMatch[1]),
            element: decorationMatch[2] as 'image',
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

function findDecoration(id: number) {
    for (const cat of categories) {
        const decoration = (cat.decorations ?? []).find((d) => d.id === id);

        if (decoration) {
            return decoration;
        }
    }

    return null;
}

/** Todos los adornos activos de una categoría que NO estén ocultos en la
 * vista resuelta actual — nunca se piden imágenes de adornos ocultos. */
function visibleDecorations(category: MenuCategoryData): MenuDecorationData[] {
    return (category.decorations ?? []).filter(
        (d) => !decorationElementFor(d, viewportWidth.value).hidden,
    );
}

function resolveConfig(key: string): StoredElementConfig | null {
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

    if (parsed.kind === 'decoration') {
        const decoration = findDecoration(parsed.id);

        return decoration
            ? decorationElementFor(decoration, viewportWidth.value)
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
    config: StoredElementConfig | null,
    bp: MenuDevice = currentDevice.value,
) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    if (parsed.kind === 'decoration') {
        const decoration = findDecoration(parsed.id);

        if (!decoration) {
            return;
        }

        const settings = { ...(decoration.visual_settings ?? {}) };

        if (config) {
            settings[bp] = config;
        } else {
            delete settings[bp];
        }

        decoration.visual_settings = Object.keys(settings).length
            ? settings
            : null;

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
    config: StoredElementConfig | null,
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
    } else if (parsed.kind === 'decoration') {
        await patchJson(`/admin/menu-decorations/${parsed.id}/element`, body);
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

function onElementCommit(key: string, config: StoredElementConfig) {
    // Un commit que se origina en un gesto de MenuEditableElement (arrastre,
    // resize, nudge) YA llega en % (V2, ver currentConfigAsV2 ahí) — el %
    // se mide contra el ancho REAL del positioning-root en el momento del
    // gesto, así que es resolución-independiente por diseño: no hace falta
    // ningún reescalado "ancho real de edición -> ancla de referencia" antes
    // de guardarlo, a diferencia del viejo formato V1 en px (donde SÍ hacía
    // falta, porque 'desktop' podía editarse a cualquier ancho real de
    // pantalla — ver Index.vue/desktopRealWidth). La rama V1 se conserva
    // solo por robustez, nunca debería activarse desde MenuEditableElement
    // tal como está hoy (todo commit interactivo ya sale en V2).
    const toSave = isV2Config(config)
        ? config
        : toAnchorCoordinates(
              config,
              viewportWidth.value,
              MENU_DEVICE_WIDTH[currentDevice.value],
          );
    applyLocal(key, toSave);
    void persist(key, toSave);
    bridge.post({ type: 'commit', elementKey: key, config: toSave });
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
                <!-- Portada no soporta adornos (nunca los tuvo) — sin
                     .tc-mp-decoration-layer a propósito, pero SÍ necesita
                     .tc-mp-content-layer/.tc-mp-customized-layer como
                     cualquier otra sección, para que un elemento
                     personalizado tenga el mismo positioning-root estable
                     (ver useMenuPositioningRoot). .tc-mp-customized-layer
                     vive DENTRO de .tc-mp-content-layer (no hermana) — ver
                     comentario detallado en la rama de abajo (misma razón:
                     mismo origen exacto para medir y renderizar %). -->
                <div class="tc-mp-content-layer">
                    <component
                        :is="layoutFor(category)"
                        :category="category"
                        :breakpoint="viewportWidth"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onElementSelect"
                        @commit="onElementCommit"
                    />
                    <div class="tc-mp-customized-layer" />
                </div>
            </section>
            <section
                v-else
                :id="`cat-${category.id}`"
                class="tc-mp-page"
                :style="{
                    minHeight: sectionHeightFor(category, viewportWidth)
                        ? `${sectionHeightFor(category, viewportWidth)}px`
                        : undefined,
                }"
            >
                <!-- Capa de contenido: título/fotos/precios/ingredientes…
                     aislada en su propio stacking context (isolation:isolate,
                     ver app.css) para que NINGÚN z-index interno, por alto
                     que sea, pueda competir directamente con la capa de
                     adornos de abajo — ver .tc-mp-content-layer.

                     .tc-mp-customized-layer vive DENTRO de esta capa (no
                     hermana en la sección) a propósito: measureRootRect()
                     (useMenuPositioningRoot) mide SIEMPRE el rect de
                     .tc-mp-content-layer para convertir/renderizar x_pct/
                     y_pct, así que el Teleport de un elemento normalizado
                     debe aterrizar en un contenedor que comparta EXACTAMENTE
                     ese mismo origen. .tc-mp-content-layer y
                     .tc-mp-decoration-layer eran ambas hermanas directas de
                     esta sección CON padding propio (clamp(...) en
                     .tc-mp-page) — un hijo position:absolute;inset:0 de la
                     sección se ancla al PADDING BOX de la sección (el borde
                     donde el padding EMPIEZA), mientras que un hijo en flujo
                     normal (.tc-mp-content-layer) arranca en su CONTENT BOX
                     (donde el padding TERMINA): un desplazamiento real de
                     hasta el padding completo de la sección (confirmado con
                     getBoundingClientRect() vía Playwright: ~65px en Móvil,
                     muy por encima de los 2px de tolerancia), no una
                     suposición. Anidar .tc-mp-customized-layer aquí dentro
                     hace que su inset:0 se ancle al padding box de
                     .tc-mp-content-layer (sin padding propio) = su propio
                     content box = el mismo rect que mide measureRootRect(). -->
                <div class="tc-mp-content-layer">
                    <component
                        :is="layoutFor(category)"
                        :category="category"
                        :breakpoint="viewportWidth"
                        :editable="editable"
                        :selected-key="selectedKey"
                        :background-url="settings.menu_background_url"
                        @select="onElementSelect"
                        @commit="onElementCommit"
                    />
                    <div class="tc-mp-customized-layer" />
                </div>

                <!-- Capa de adornos: SIEMPRE por encima de la capa de
                     contenido Y de los elementos personalizados (ver
                     jerarquía en app.css: content(0) < customized(1, anidada
                     arriba) < decoration(2)), sin importar qué elemento esté
                     seleccionado o personalizado. position:absolute + inset:0
                     reproduce EXACTAMENTE el mismo origen de coordenadas que
                     tenían los adornos como hijos directos de .tc-mp-page
                     (top:0/left:0 de su caja de relleno), así que ningún x/y
                     guardado cambia de significado. -->
                <div class="tc-mp-decoration-layer">
                    <MenuEditableElement
                        v-for="decoration in visibleDecorations(category)"
                        :key="decoration.element_key"
                        :element-key="decoration.element_key"
                        :label="decoration.name"
                        :config="decorationElementFor(decoration, viewportWidth)"
                        :editable="editable"
                        :selected="selectedKey === decoration.element_key"
                        kind="image"
                        :src="decoration.image_url"
                        :alt="decoration.alt_text ?? decoration.name"
                        decoration
                        class="tc-mp-decoration"
                        @select="onElementSelect"
                        @commit="onElementCommit"
                    />
                </div>

                <!-- Cuarta capa, reservada para la interfaz del editor
                     (contornos/manijas) — siempre por encima de adornos, sin
                     alterar el apilamiento real de ningún elemento (ver
                     app.css). Vacía por defecto: hoy el contorno de selección
                     y la manija de resize siguen viviendo dentro del propio
                     elemento (ver MenuEditableElement.vue), así que esta capa
                     no tiene aún contenido propio salvo que un adorno quede
                     literalmente encima de la manija de un elemento
                     seleccionado — caso límite no cubierto en este cambio. -->
                <div class="tc-mp-editor-interaction-layer" />
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
