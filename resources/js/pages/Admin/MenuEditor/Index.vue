<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import {
    computed,
    onMounted,
    onUnmounted,
    reactive,
    ref,
    useTemplateRef,
    watch,
} from 'vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import {
    BREAKPOINT_ORDER,
    CATEGORY_ELEMENT_LABELS,
    ITEM_ELEMENT_LABELS,
    categoryElementFor,
    hasOwnElementConfig,
    itemElementFor,
    resolveBreakpoint,
} from '@/components/Public/Menu/types';
import type {
    CategoryElementKey,
    ElementConfig,
    ItemElementKey,
    MenuBreakpoint,
    MenuCategoryData,
    MenuItemData,
} from '@/components/Public/Menu/types';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import { useAutosave } from '@/composables/useAutosave';
import { useDragSort } from '@/composables/useDragSort';
import { useMenuPreviewParent } from '@/composables/useMenuPreviewBridge';
import { patchJson, postJson } from '@/lib/jsonApi';
import { zonesForLayout } from '@/pages/Admin/MenuItems/zones';

const props = defineProps<{
    categories: MenuCategoryData[];
}>();

// Copia local: refleja de inmediato lo que el usuario hace (arrastrar dentro
// del iframe, editar el inspector, reordenar) para que la barra lateral y el
// inspector no dependan de un viaje de ida y vuelta al servidor. El iframe
// de vista previa tiene SU PROPIA copia (carga /admin/menu-editor/preview de
// forma independiente) — ambas copias se sincronizan vía postMessage:
// arrastrar dentro del iframe emite "commit" hacia aquí, y los cambios del
// inspector se envían hacia el iframe con "updateConfig"/"clearElement".
const categories = reactive<MenuCategoryData[]>(
    JSON.parse(JSON.stringify(props.categories)),
);

const previewUrl = '/admin/menu-editor/preview';

/* ------------------------------------------------------------------ */
/* Viewport real (breakpoints Tailwind reales, no una simulación de 3)  */
/* ------------------------------------------------------------------ */

const BREAKPOINT_PRESETS: {
    key: MenuBreakpoint;
    label: string;
    width: number;
}[] = [
    { key: 'base', label: 'Móvil', width: 390 },
    { key: 'sm', label: 'SM', width: 640 },
    { key: 'md', label: 'Tablet', width: 768 },
    { key: 'lg', label: 'Laptop', width: 1024 },
    { key: 'xl', label: 'Desktop', width: 1280 },
    { key: '2xl', label: 'Pantalla grande', width: 1536 },
];
const WIDTH_PRESETS = [
    375, 390, 412, 640, 768, 1024, 1280, 1366, 1440, 1536, 1920,
];

// El ancho del iframe ES el ancho real de su documento — Menu.vue resuelve
// su propio breakpoint leyendo window.innerWidth del iframe (vía
// useBreakpoint), así que cambiar este número cambia de verdad qué
// breakpoint de Tailwind aplica adentro, exactamente igual que /menu.
const viewportWidth = ref(390);
const activeBreakpoint = computed(() => resolveBreakpoint(viewportWidth.value));

// El zoom es puramente visual (transform:scale sobre un envoltorio), nunca
// se aplica al iframe mismo — así las coordenadas guardadas nunca dependen
// del zoom, tal como exige el WYSIWYG real. PANEL_WIDTH se fija por encima
// del ancho máximo permitido (2200) para que zoom=100% signifique SIEMPRE
// tamaño real 1:1 (baseScale=1) — el panel simplemente permite scroll
// horizontal en viewports anchos en vez de reducir la escala en automático,
// así "100%" nunca miente sobre el tamaño real renderizado.
const zoom = ref(100);
const PANEL_WIDTH = 2600;
const baseScale = computed(() =>
    Math.min(1, PANEL_WIDTH / viewportWidth.value),
);
const scale = computed(() => baseScale.value * (zoom.value / 100));

// Alto FIJO del iframe (nunca medido/realimentado desde su propio
// contenido): el menú público usa secciones con min-height:100vh (la
// portada) — si el alto del iframe se ajustara a partir de su propio
// scrollHeight, ese 100vh crecería junto con el iframe en un bucle de
// realimentación sin límite (100vh de un iframe es relativo a SU PROPIA
// altura). Un valor generoso y estático evita el bucle; el panel exterior
// ya tiene overflow:auto para lo que sobre. En móvil el contenido se apila
// en una sola columna y necesita más alto que en escritorio.
const contentHeight = computed(() =>
    activeBreakpoint.value === 'base' || activeBreakpoint.value === 'sm'
        ? 11000
        : 7000,
);

/* ------------------------------------------------------------------ */
/* Iframe WYSIWYG + puente postMessage                                  */
/* ------------------------------------------------------------------ */

const iframeEl = useTemplateRef<HTMLIFrameElement>('iframeEl');
const previewReady = ref(false);
let reselectAfterReload = false;

const bridge = useMenuPreviewParent(() => iframeEl.value, {
    onReady: () => {
        previewReady.value = true;

        if (reselectAfterReload && selectedKey.value) {
            reselectAfterReload = false;
            bridge.selectElement(selectedKey.value);
        }
    },
    onSelect: (key) => {
        selectedKey.value = key;
        followSelectionCategory(key);
    },
    onCommit: (key, config) => {
        onIframeCommit(key, config);
    },
});

let reloadTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleIframeReload() {
    if (reloadTimer) {
        clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(() => {
        reloadTimer = null;
        reselectAfterReload = !!selectedKey.value;
        previewReady.value = false;
        iframeEl.value?.contentWindow?.location.reload();
    }, 400);
}

/* ------------------------------------------------------------------ */
/* Secciones (categorías) — navegación                                  */
/* ------------------------------------------------------------------ */

const activeCategoryId = ref<number | null>(categories[0]?.id ?? null);
const activeCategory = computed(
    () => categories.find((c) => c.id === activeCategoryId.value) ?? null,
);
const activeIndex = computed(() =>
    categories.findIndex((c) => c.id === activeCategoryId.value),
);

function goToIndex(idx: number) {
    if (idx < 0 || idx >= categories.length) {
        return;
    }

    activeCategoryId.value = categories[idx].id;
    bridge.scrollToCategory(categories[idx].id);
}

function selectCategory(id: number) {
    activeCategoryId.value = id;
    bridge.scrollToCategory(id);
}

function followSelectionCategory(key: string) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    if (parsed.kind === 'item') {
        const owner = categories.find((c) =>
            c.items.some((i) => i.id === parsed.id),
        );

        if (owner) {
            activeCategoryId.value = owner.id;
        }
    } else {
        activeCategoryId.value = parsed.id;
    }
}

/* ------------------------------------------------------------------ */
/* Claves de elemento: item-{id}:{el} / category-{id}:{el}              */
/* ------------------------------------------------------------------ */

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

function findItemGlobal(id: number): MenuItemData | null {
    for (const cat of categories) {
        const item = cat.items.find((i) => i.id === id);

        if (item) {
            return item;
        }
    }

    return null;
}

function findCategoryGlobal(id: number): MenuCategoryData | null {
    return categories.find((c) => c.id === id) ?? null;
}

function resolveConfig(key: string, bp: MenuBreakpoint): ElementConfig {
    const parsed = parseKey(key);

    if (!parsed) {
        return itemElementFor({ layout_settings: null }, 'container', bp);
    }

    if (parsed.kind === 'item') {
        const item = findItemGlobal(parsed.id);

        return itemElementFor(
            { layout_settings: item?.layout_settings },
            parsed.element as ItemElementKey,
            bp,
        );
    }

    const category = findCategoryGlobal(parsed.id);

    return categoryElementFor(
        { visual_settings: category?.visual_settings },
        parsed.element as CategoryElementKey,
        bp,
    );
}

function hasOwnConfig(key: string, bp: MenuBreakpoint): boolean {
    const parsed = parseKey(key);

    if (!parsed) {
        return false;
    }

    if (parsed.kind === 'item') {
        const item = findItemGlobal(parsed.id);

        return hasOwnElementConfig(
            item?.layout_settings?.[parsed.element as ItemElementKey],
            bp,
        );
    }

    const category = findCategoryGlobal(parsed.id);

    return hasOwnElementConfig(
        category?.visual_settings?.[parsed.element as CategoryElementKey],
        bp,
    );
}

function applyMirror(
    key: string,
    config: ElementConfig | null,
    bp: MenuBreakpoint,
) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    const target =
        parsed.kind === 'item'
            ? findItemGlobal(parsed.id)
            : findCategoryGlobal(parsed.id);

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

/** Aplica localmente y envía al iframe (sin registrar deshacer — lo hacen
 * las funciones que inician el cambio). */
function applyChange(
    key: string,
    bp: MenuBreakpoint,
    config: ElementConfig | null,
) {
    applyMirror(key, config, bp);

    if (config) {
        bridge.updateConfig(key, config, bp);
    } else {
        bridge.clearElement(key, bp);
    }
}

/* ------------------------------------------------------------------ */
/* Selección + inspector                                                */
/* ------------------------------------------------------------------ */

const selectedKey = ref<string | null>(null);

const selectedItem = computed<MenuItemData | null>(() => {
    const parsed = selectedKey.value ? parseKey(selectedKey.value) : null;

    return parsed?.kind === 'item' ? findItemGlobal(parsed.id) : null;
});

const selectedItemCategory = computed<MenuCategoryData | null>(() => {
    if (!selectedItem.value) {
        return null;
    }

    return (
        categories.find((c) =>
            c.items.some((i) => i.id === selectedItem.value!.id),
        ) ?? null
    );
});

const selectedLabel = computed(() => {
    const parsed = selectedKey.value ? parseKey(selectedKey.value) : null;

    if (!parsed) {
        return '';
    }

    if (parsed.kind === 'item') {
        const label = ITEM_ELEMENT_LABELS[parsed.element as ItemElementKey];

        return selectedItem.value
            ? `${selectedItem.value.name} — ${label}`
            : label;
    }

    const cat = findCategoryGlobal(parsed.id);
    const label = CATEGORY_ELEMENT_LABELS[parsed.element as CategoryElementKey];

    return cat ? `${cat.name} — ${label}` : label;
});

const IMAGE_ELEMENTS = new Set([
    'image',
    'title_image',
    'subtitle_image',
    'tagline_image',
    'caption_image',
]);
const TEXT_ELEMENTS = new Set([
    'name',
    'description',
    'price',
    'price_label',
    'price_secondary',
    'price_secondary_label',
    'presentation',
    'ingredients',
    'choice_label',
    'badge',
    'title',
    'subtitle',
    'tagline',
    'tagline_sub',
]);

const selectedKind = computed<'image' | 'text' | 'container'>(() => {
    const parsed = selectedKey.value ? parseKey(selectedKey.value) : null;

    if (!parsed) {
        return 'container';
    }

    if (IMAGE_ELEMENTS.has(parsed.element)) {
        return 'image';
    }

    if (TEXT_ELEMENTS.has(parsed.element)) {
        return 'text';
    }

    return 'container';
});

const inspectorConfig = computed<ElementConfig | null>(() =>
    selectedKey.value
        ? resolveConfig(selectedKey.value, activeBreakpoint.value)
        : null,
);
const selectedHasOwnConfig = computed(() =>
    selectedKey.value
        ? hasOwnConfig(selectedKey.value, activeBreakpoint.value)
        : false,
);

function onSelectFromSidebar(key: string) {
    selectedKey.value = key;
    followSelectionCategory(key);
    bridge.selectElement(key);
}

/* ------------------------------------------------------------------ */
/* Deshacer / rehacer (solo esta sesión)                                */
/* ------------------------------------------------------------------ */

interface UndoAction {
    key: string;
    bp: MenuBreakpoint;
    prev: ElementConfig | null;
    next: ElementConfig | null;
}

const undoStack = ref<UndoAction[]>([]);
const redoStack = ref<UndoAction[]>([]);

function recordUndo(action: UndoAction) {
    undoStack.value.push(action);

    if (undoStack.value.length > 50) {
        undoStack.value.shift();
    }

    redoStack.value = [];
}

function undo() {
    const action = undoStack.value.pop();

    if (!action) {
        return;
    }

    redoStack.value.push(action);
    applyChange(action.key, action.bp, action.prev);
}

function redo() {
    const action = redoStack.value.pop();

    if (!action) {
        return;
    }

    undoStack.value.push(action);
    applyChange(action.key, action.bp, action.next);
}

function onKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) {
        return;
    }

    const key = e.key.toLowerCase();

    if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    } else if (key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
    }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));

// Un arrastre/resize/nudge dentro del iframe ya se aplicó y persistió allí
// mismo (Menu.vue en modo editable) — aquí solo espejamos el resultado para
// que la barra lateral/inspector no queden desincronizados, y registramos
// el deshacer.
function onIframeCommit(key: string, config: ElementConfig) {
    const bp = activeBreakpoint.value;
    const prev = hasOwnConfig(key, bp) ? resolveConfig(key, bp) : null;
    applyMirror(key, config, bp);
    recordUndo({ key, bp, prev, next: config });
}

/* ------------------------------------------------------------------ */
/* Inspector: edición de campos con lote corto (evita saturar red)      */
/* ------------------------------------------------------------------ */

let inspectorDebounce: ReturnType<typeof setTimeout> | null = null;
let inspectorBurstPrev: ElementConfig | null | undefined;

function updateInspectorField<K extends keyof ElementConfig>(
    field: K,
    value: ElementConfig[K],
) {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const bp = activeBreakpoint.value;

    if (inspectorBurstPrev === undefined) {
        inspectorBurstPrev = hasOwnConfig(key, bp)
            ? resolveConfig(key, bp)
            : null;
    }

    const next = { ...resolveConfig(key, bp), [field]: value };
    applyMirror(key, next, bp);

    if (inspectorDebounce) {
        clearTimeout(inspectorDebounce);
    }

    inspectorDebounce = setTimeout(() => {
        inspectorDebounce = null;
        const prev = inspectorBurstPrev ?? null;
        inspectorBurstPrev = undefined;
        recordUndo({ key, bp, prev, next });
        bridge.updateConfig(key, next, bp);
    }, 150);
}

/** Cambia un campo y lo confirma de inmediato (sin lote) — para acciones
 * discretas de un solo clic (bloquear, traer al frente, centrar…). */
function commitFieldNow<K extends keyof ElementConfig>(
    field: K,
    value: ElementConfig[K],
) {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const bp = activeBreakpoint.value;
    const prev = hasOwnConfig(key, bp) ? resolveConfig(key, bp) : null;
    const next = { ...resolveConfig(key, bp), [field]: value };
    recordUndo({ key, bp, prev, next });
    applyChange(key, bp, next);
}

function toggleAutoHeight(auto: boolean) {
    updateInspectorField(
        'height',
        auto ? null : Math.round(inspectorConfig.value?.height ?? 200),
    );
}

function toggleAutoWidth(auto: boolean) {
    updateInspectorField(
        'width',
        auto ? null : Math.round(inspectorConfig.value?.width ?? 200),
    );
}

function toggleLock() {
    commitFieldNow('locked', !inspectorConfig.value?.locked);
}

function bringToFront() {
    commitFieldNow('z_index', 999);
}

function sendToBack() {
    commitFieldNow('z_index', 0);
}

async function centerHorizontally() {
    if (!selectedKey.value) {
        return;
    }

    const rect = await bridge.requestRect(selectedKey.value);

    if (!rect) {
        return;
    }

    const current = resolveConfig(selectedKey.value, activeBreakpoint.value);
    const dx =
        rect.parent.left +
        rect.parent.width / 2 -
        (rect.element.left + rect.element.width / 2);
    commitFieldNow('x', Math.round(current.x + dx));
}

async function centerVertically() {
    if (!selectedKey.value) {
        return;
    }

    const rect = await bridge.requestRect(selectedKey.value);

    if (!rect) {
        return;
    }

    const current = resolveConfig(selectedKey.value, activeBreakpoint.value);
    const dy =
        rect.parent.top +
        rect.parent.height / 2 -
        (rect.element.top + rect.element.height / 2);
    commitFieldNow('y', Math.round(current.y + dy));
}

function restoreBreakpoint() {
    if (!selectedKey.value || !selectedHasOwnConfig.value) {
        return;
    }

    const key = selectedKey.value;
    const bp = activeBreakpoint.value;
    const prev = resolveConfig(key, bp);
    recordUndo({ key, bp, prev, next: null });
    applyChange(key, bp, null);
}

function restoreAllBreakpoints() {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;

    for (const bp of BREAKPOINT_ORDER) {
        if (hasOwnConfig(key, bp)) {
            const prev = resolveConfig(key, bp);
            recordUndo({ key, bp, prev, next: null });
            applyChange(key, bp, null);
        }
    }
}

function copyToNextBreakpoint() {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const idx = BREAKPOINT_ORDER.indexOf(activeBreakpoint.value);
    const nextBp = BREAKPOINT_ORDER[idx + 1];

    if (!nextBp) {
        return;
    }

    const config = { ...resolveConfig(key, activeBreakpoint.value) };
    const prev = hasOwnConfig(key, nextBp) ? resolveConfig(key, nextBp) : null;
    recordUndo({ key, bp: nextBp, prev, next: config });
    applyChange(key, nextBp, config);
}

function copyToAllBreakpoints() {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const config = resolveConfig(key, activeBreakpoint.value);

    for (const bp of BREAKPOINT_ORDER) {
        if (bp === activeBreakpoint.value) {
            continue;
        }

        const prev = hasOwnConfig(key, bp) ? resolveConfig(key, bp) : null;
        recordUndo({ key, bp, prev, next: { ...config } });
        applyChange(key, bp, { ...config });
    }
}

/* ------------------------------------------------------------------ */
/* Edición rápida de contenido del platillo seleccionado                */
/* ------------------------------------------------------------------ */

const quickAutosave = useAutosave<{
    id: number;
    data: Record<string, unknown>;
}>(async (payload) => {
    await patchJson(
        `/admin/menu-editor/items/${payload.id}/quick`,
        payload.data,
    );
    scheduleIframeReload();
}, 500);

const zoneOptions = computed(() =>
    zonesForLayout(selectedItemCategory.value?.layout),
);

function updateQuickField(field: string, value: unknown) {
    if (!selectedItem.value) {
        return;
    }

    (selectedItem.value as unknown as Record<string, unknown>)[field] = value;
    quickAutosave.schedule({
        id: selectedItem.value.id,
        data: { [field]: value },
    });
}

/* ------------------------------------------------------------------ */
/* Reordenar platillos de la sección activa                             */
/* ------------------------------------------------------------------ */

const { registerZone, start, dragging, saving } = useDragSort<MenuItemData>(
    (zones) => {
        const [key, items] = Object.entries(zones)[0] ?? [];

        if (!key || !activeCategory.value) {
            return Promise.resolve();
        }

        activeCategory.value.items = items;

        return postJson('/admin/menu-editor/items/reorder', {
            items: items.map((item, idx) => ({
                id: item.id,
                menu_category_id: activeCategory.value!.id,
                sort_order: idx + 1,
            })),
        }).then(() => scheduleIframeReload());
    },
);

const reorderZoneEl = ref<HTMLElement | null>(null);

function bindReorderZone(el: HTMLElement | null) {
    reorderZoneEl.value = el;

    if (el && activeCategory.value) {
        registerZone(
            String(activeCategory.value.id),
            activeCategory.value.items,
            el,
        );
    }
}

watch(activeCategory, (cat) => {
    if (reorderZoneEl.value && cat) {
        registerZone(String(cat.id), cat.items, reorderZoneEl.value);
    }
});

function onReorderHandleDown(item: MenuItemData, e: PointerEvent) {
    if (!activeCategory.value) {
        return;
    }

    start(item, String(activeCategory.value.id), e);
}

/* ------------------------------------------------------------------ */
/* Árbol de elementos por sección (expandible, con candado)             */
/* ------------------------------------------------------------------ */

function itemElementKeys(item: MenuItemData): ItemElementKey[] {
    const keys: ItemElementKey[] = ['container'];

    if (item.image_url) {
        keys.push('image');
    }

    keys.push('name');

    if (item.description) {
        keys.push('description');
    }

    if (Number(item.price) > 0) {
        keys.push('price');
    }

    if (item.price_label) {
        keys.push('price_label');
    }

    if (item.price_secondary) {
        keys.push('price_secondary');
    }

    if (item.price_secondary_label) {
        keys.push('price_secondary_label');
    }

    if (item.presentation) {
        keys.push('presentation');
    }

    if (item.ingredients) {
        keys.push('ingredients');
    }

    if (item.choice_label) {
        keys.push('choice_label');
    }

    if (item.badge) {
        keys.push('badge');
    }

    if (item.caption_image_url) {
        keys.push('caption_image');
    }

    return keys;
}

function categoryElementKeys(cat: MenuCategoryData): CategoryElementKey[] {
    const keys: CategoryElementKey[] = ['title'];

    if (cat.subtitle) {
        keys.push('subtitle');
    }

    if (cat.tagline) {
        keys.push('tagline');
    }

    if (cat.tagline_sub) {
        keys.push('tagline_sub');
    }

    if (cat.title_image_url) {
        keys.push('title_image');
    }

    if (cat.subtitle_image_url) {
        keys.push('subtitle_image');
    }

    if (cat.tagline_image_url) {
        keys.push('tagline_image');
    }

    if (cat.image_url) {
        keys.push('image');
    }

    return keys;
}

const expandedItems = reactive<Set<number>>(new Set());

function toggleExpanded(id: number) {
    if (expandedItems.has(id)) {
        expandedItems.delete(id);
    } else {
        expandedItems.add(id);
    }
}

function isElementLocked(key: string): boolean {
    return !!resolveConfig(key, activeBreakpoint.value).locked;
}

function toggleElementLock(key: string) {
    const bp = activeBreakpoint.value;
    const config = resolveConfig(key, bp);
    const prev = hasOwnConfig(key, bp) ? config : null;
    const next = { ...config, locked: !config.locked };
    recordUndo({ key, bp, prev, next });
    applyChange(key, bp, next);
}

/* ------------------------------------------------------------------ */
/* Guardado — estado visible (todo lo demás ya autosalva en segundo     */
/* plano dentro del iframe o vía useAutosave arriba)                    */
/* ------------------------------------------------------------------ */

const saveStatus = computed(() =>
    quickAutosave.status.value === 'error' ? 'error' : 'ok',
);
</script>

<template>
    <Head title="Editor visual del menú" />

    <div class="tc-admin-page tc-menu-editor space-y-4">
        <AdminPageHeader
            title="Editor visual del menú"
            description="Mueve, redimensiona y edita cada elemento directamente sobre el menú público real"
        >
            <template #label>Menú</template>
            <template #actions>
                <span
                    class="tc-badge text-[11px]"
                    :class="
                        saveStatus === 'error'
                            ? 'tc-badge-pink'
                            : 'tc-badge-blue'
                    "
                    >{{
                        saveStatus === 'error'
                            ? 'Error al guardar'
                            : previewReady
                              ? 'Vista previa activa'
                              : 'Cargando…'
                    }}</span
                >
                <Link href="/admin/menu-items" class="tc-btn-secondary"
                    >← Volver</Link
                >
            </template>
        </AdminPageHeader>

        <div class="tc-editor-toolbar tc-admin-card">
            <div
                class="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5"
            >
                <button
                    v-for="preset in BREAKPOINT_PRESETS"
                    :key="preset.key"
                    type="button"
                    class="rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors"
                    :class="
                        viewportWidth === preset.width
                            ? 'bg-white text-[var(--tc-blue)] shadow-sm dark:bg-[#262626]'
                            : 'text-gray-500'
                    "
                    :title="`${preset.width}px`"
                    @click="viewportWidth = preset.width"
                >
                    {{ preset.label }}
                </button>
            </div>

            <div class="flex items-center gap-1.5">
                <label class="text-xs text-gray-500">Ancho</label>
                <input
                    v-model.number="viewportWidth"
                    type="number"
                    min="280"
                    max="2200"
                    list="tc-editor-width-presets"
                    class="tc-input w-20 py-1 text-xs"
                />
                <datalist id="tc-editor-width-presets">
                    <option v-for="w in WIDTH_PRESETS" :key="w" :value="w" />
                </datalist>
                <span class="text-xs text-gray-400"
                    >px · {{ activeBreakpoint }}</span
                >
            </div>

            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="tc-btn-secondary"
                    :disabled="activeIndex <= 0"
                    @click="goToIndex(activeIndex - 1)"
                >
                    ◀ Anterior
                </button>
                <span class="text-xs font-medium text-gray-500">
                    {{ activeCategory?.name }} ({{ activeIndex + 1 }}/{{
                        categories.length
                    }})
                </span>
                <button
                    type="button"
                    class="tc-btn-secondary"
                    :disabled="activeIndex >= categories.length - 1"
                    @click="goToIndex(activeIndex + 1)"
                >
                    Siguiente ▶
                </button>
            </div>

            <div class="flex items-center gap-2">
                <button
                    type="button"
                    class="tc-btn-secondary"
                    :disabled="!undoStack.length"
                    @click="undo"
                >
                    ↶ Deshacer
                </button>
                <button
                    type="button"
                    class="tc-btn-secondary"
                    :disabled="!redoStack.length"
                    @click="redo"
                >
                    ↷ Rehacer
                </button>
            </div>

            <div class="flex items-center gap-2">
                <label class="text-xs text-gray-500">Zoom (solo visual)</label>
                <input
                    v-model.number="zoom"
                    type="range"
                    min="25"
                    max="150"
                    step="5"
                    class="w-24"
                />
                <span class="w-10 text-right text-xs text-gray-500 tabular-nums"
                    >{{ zoom }}%</span
                >
            </div>
        </div>

        <div class="tc-editor-grid">
            <!-- Izquierda: secciones + árbol de elementos + orden -->
            <aside class="tc-admin-card tc-editor-sidebar">
                <h3
                    class="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase"
                >
                    Secciones
                </h3>
                <ul class="mb-4 space-y-0.5">
                    <li v-for="(cat, idx) in categories" :key="cat.id">
                        <button
                            type="button"
                            class="w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors"
                            :class="
                                cat.id === activeCategoryId
                                    ? 'bg-[var(--tc-blue)] text-white'
                                    : 'text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/5'
                            "
                            @click="
                                selectCategory(cat.id);
                                void idx;
                            "
                        >
                            {{ cat.name }}
                        </button>
                    </li>
                </ul>

                <template v-if="activeCategory">
                    <h3
                        class="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase"
                    >
                        Elementos de la sección
                    </h3>
                    <ul class="mb-4 space-y-0.5">
                        <li
                            v-for="el in categoryElementKeys(activeCategory)"
                            :key="el"
                            class="flex items-center gap-1"
                        >
                            <button
                                type="button"
                                class="flex-1 truncate rounded-lg px-2 py-1 text-left text-xs"
                                :class="
                                    selectedKey ===
                                    `category-${activeCategory.id}:${el}`
                                        ? 'bg-blue-50 text-[var(--tc-blue)] dark:bg-white/10'
                                        : 'text-gray-600 hover:bg-gray-50 dark:text-white/70 dark:hover:bg-white/5'
                                "
                                @click="
                                    onSelectFromSidebar(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                "
                            >
                                {{ CATEGORY_ELEMENT_LABELS[el] }}
                            </button>
                            <button
                                type="button"
                                class="px-1 text-xs opacity-70 hover:opacity-100"
                                :aria-label="
                                    isElementLocked(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                        ? 'Desbloquear elemento'
                                        : 'Bloquear elemento'
                                "
                                @click="
                                    toggleElementLock(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                "
                            >
                                {{
                                    isElementLocked(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                        ? '🔒'
                                        : '🔓'
                                }}
                            </button>
                        </li>
                    </ul>
                </template>

                <template v-if="activeCategory && activeCategory.items.length">
                    <h3
                        class="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase"
                    >
                        Platillos
                        <span
                            v-if="saving"
                            class="ml-1 font-normal text-[var(--tc-blue)] normal-case"
                            >guardando…</span
                        >
                    </h3>
                    <ul
                        :ref="(el) => bindReorderZone(el as HTMLElement)"
                        class="space-y-0.5"
                    >
                        <li
                            v-for="item in activeCategory.items"
                            :key="item.id"
                            data-drag-row
                            class="rounded-lg text-xs"
                            :class="{
                                'opacity-40': dragging?.item.id === item.id,
                            }"
                        >
                            <div class="flex items-center gap-1.5 px-1.5 py-1">
                                <button
                                    type="button"
                                    class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                    aria-label="Arrastrar para reordenar"
                                    @pointerdown="
                                        onReorderHandleDown(item, $event)
                                    "
                                >
                                    ⠿
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 truncate text-left text-gray-700 dark:text-white/80"
                                    @click="toggleExpanded(item.id)"
                                >
                                    {{ expandedItems.has(item.id) ? '▾' : '▸' }}
                                    {{ item.name }}
                                </button>
                            </div>
                            <ul
                                v-if="expandedItems.has(item.id)"
                                class="mb-1 ml-6 space-y-0.5"
                            >
                                <li
                                    v-for="el in itemElementKeys(item)"
                                    :key="el"
                                    class="flex items-center gap-1"
                                >
                                    <button
                                        type="button"
                                        class="flex-1 truncate rounded-md px-2 py-1 text-left"
                                        :class="
                                            selectedKey ===
                                            `item-${item.id}:${el}`
                                                ? 'bg-blue-50 text-[var(--tc-blue)] dark:bg-white/10'
                                                : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
                                        "
                                        @click="
                                            onSelectFromSidebar(
                                                `item-${item.id}:${el}`,
                                            )
                                        "
                                    >
                                        {{ ITEM_ELEMENT_LABELS[el] }}
                                    </button>
                                    <button
                                        type="button"
                                        class="px-1 text-xs opacity-70 hover:opacity-100"
                                        :aria-label="
                                            isElementLocked(
                                                `item-${item.id}:${el}`,
                                            )
                                                ? 'Desbloquear elemento'
                                                : 'Bloquear elemento'
                                        "
                                        @click="
                                            toggleElementLock(
                                                `item-${item.id}:${el}`,
                                            )
                                        "
                                    >
                                        {{
                                            isElementLocked(
                                                `item-${item.id}:${el}`,
                                            )
                                                ? '🔒'
                                                : '🔓'
                                        }}
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </template>
            </aside>

            <!-- Centro: iframe con el MISMO Public/Menu.vue -->
            <div class="tc-admin-card tc-editor-canvas-wrap">
                <div class="tc-editor-canvas-viewport">
                    <div
                        class="tc-editor-canvas-scaled"
                        :style="{
                            width: viewportWidth + 'px',
                            height: contentHeight + 'px',
                            transform: `scale(${scale})`,
                        }"
                    >
                        <iframe
                            ref="iframeEl"
                            :src="previewUrl"
                            :style="{
                                width: viewportWidth + 'px',
                                height: contentHeight + 'px',
                                border: 'none',
                                display: 'block',
                            }"
                            title="Vista previa editable del menú"
                        />
                    </div>
                </div>
                <p class="mt-2 text-xs text-gray-400">
                    Haz clic en cualquier elemento del menú (imagen, nombre,
                    precio, título…) para seleccionarlo, arrástralo para
                    moverlo, usa la manija inferior derecha para redimensionar y
                    las flechas del teclado para ajustes finos (Shift = 10px).
                    Esta vista es el menú público real a {{ viewportWidth }}px —
                    lo que ves aquí es exactamente lo que verá el visitante.
                </p>
            </div>

            <!-- Derecha: inspector -->
            <aside class="tc-admin-card tc-editor-inspector">
                <template v-if="!selectedKey || !inspectorConfig">
                    <p class="text-sm text-gray-400">
                        Selecciona un elemento en el lienzo o en la lista de la
                        izquierda para editarlo.
                    </p>
                </template>

                <template v-else>
                    <h3
                        class="mb-3 text-sm font-bold text-gray-800 dark:text-white"
                    >
                        {{ selectedLabel }}
                    </h3>

                    <div class="mb-4 space-y-2.5">
                        <p
                            class="text-xs font-semibold tracking-wide text-gray-400 uppercase"
                        >
                            Posición y tamaño ({{ activeBreakpoint }})
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcInput
                                label="X (px)"
                                type="number"
                                :model-value="Math.round(inspectorConfig.x)"
                                @update:model-value="
                                    updateInspectorField('x', Number($event))
                                "
                            />
                            <TcInput
                                label="Y (px)"
                                type="number"
                                :model-value="Math.round(inspectorConfig.y)"
                                @update:model-value="
                                    updateInspectorField('y', Number($event))
                                "
                            />
                            <TcInput
                                label="Escala"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.scale"
                                @update:model-value="
                                    updateInspectorField(
                                        'scale',
                                        Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Rotación (°)"
                                type="number"
                                :model-value="inspectorConfig.rotation"
                                @update:model-value="
                                    updateInspectorField(
                                        'rotation',
                                        Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Nivel (z-index)"
                                type="number"
                                :model-value="inspectorConfig.z_index"
                                @update:model-value="
                                    updateInspectorField(
                                        'z_index',
                                        Number($event),
                                    )
                                "
                            />
                            <div class="tc-field">
                                <label class="tc-field-label">Ancho (px)</label>
                                <input
                                    type="number"
                                    class="tc-input"
                                    :disabled="inspectorConfig.width === null"
                                    :value="inspectorConfig.width ?? ''"
                                    @input="
                                        updateInspectorField(
                                            'width',
                                            Number(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).value,
                                            ),
                                        )
                                    "
                                />
                                <label
                                    class="mt-1 flex items-center gap-1.5 text-xs text-gray-500"
                                >
                                    <input
                                        type="checkbox"
                                        :checked="
                                            inspectorConfig.width === null
                                        "
                                        @change="
                                            toggleAutoWidth(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).checked,
                                            )
                                        "
                                    />
                                    Automático
                                </label>
                            </div>
                            <div class="tc-field">
                                <label class="tc-field-label">Alto (px)</label>
                                <input
                                    type="number"
                                    class="tc-input"
                                    :disabled="inspectorConfig.height === null"
                                    :value="inspectorConfig.height ?? ''"
                                    @input="
                                        updateInspectorField(
                                            'height',
                                            Number(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).value,
                                            ),
                                        )
                                    "
                                />
                                <label
                                    class="mt-1 flex items-center gap-1.5 text-xs text-gray-500"
                                >
                                    <input
                                        type="checkbox"
                                        :checked="
                                            inspectorConfig.height === null
                                        "
                                        @change="
                                            toggleAutoHeight(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).checked,
                                            )
                                        "
                                    />
                                    Automático (proporcional)
                                </label>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="centerHorizontally"
                            >
                                ↔ Centrar horizontal
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="centerVertically"
                            >
                                ↕ Centrar vertical
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="bringToFront"
                            >
                                Traer al frente
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="sendToBack"
                            >
                                Enviar al fondo
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :class="{
                                    'tc-badge-pink': inspectorConfig.locked,
                                }"
                                @click="toggleLock"
                            >
                                {{
                                    inspectorConfig.locked
                                        ? '🔒 Desbloquear'
                                        : '🔓 Bloquear'
                                }}
                            </button>
                        </div>

                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :disabled="!selectedHasOwnConfig"
                                @click="restoreBreakpoint"
                            >
                                Restaurar este breakpoint
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="restoreAllBreakpoints"
                            >
                                Restaurar todos
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="copyToNextBreakpoint"
                            >
                                Copiar → siguiente
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="copyToAllBreakpoints"
                            >
                                Copiar a todos
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="selectedKind === 'text'"
                        class="mb-4 space-y-2.5 border-t border-gray-100 pt-3 dark:border-white/10"
                    >
                        <p
                            class="text-xs font-semibold tracking-wide text-gray-400 uppercase"
                        >
                            Texto
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcInput
                                label="Tamaño de fuente"
                                type="number"
                                :model-value="inspectorConfig.font_size ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'font_size',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Interlineado"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.line_height ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'line_height',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Espaciado (px)"
                                type="number"
                                step="0.1"
                                :model-value="
                                    inspectorConfig.letter_spacing ?? ''
                                "
                                @update:model-value="
                                    updateInspectorField(
                                        'letter_spacing',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Ancho máx. (px)"
                                type="number"
                                :model-value="inspectorConfig.max_width ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'max_width',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcSelect
                                label="Alineación"
                                :options="[
                                    { value: 'left', label: 'Izquierda' },
                                    { value: 'center', label: 'Centro' },
                                    { value: 'right', label: 'Derecha' },
                                ]"
                                :model-value="inspectorConfig.align ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'align',
                                        ($event || null) as any,
                                    )
                                "
                            />
                            <TcInput
                                label="Color"
                                :model-value="inspectorConfig.color ?? ''"
                                placeholder="#144e8f"
                                @update:model-value="
                                    updateInspectorField(
                                        'color',
                                        ($event || null) as any,
                                    )
                                "
                            />
                        </div>
                    </div>

                    <div
                        v-if="selectedKind === 'image'"
                        class="mb-4 space-y-2.5 border-t border-gray-100 pt-3 dark:border-white/10"
                    >
                        <p
                            class="text-xs font-semibold tracking-wide text-gray-400 uppercase"
                        >
                            Imagen
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcSelect
                                label="Ajuste"
                                :options="[
                                    { value: 'contain', label: 'Contain' },
                                    { value: 'cover', label: 'Cover' },
                                ]"
                                :model-value="inspectorConfig.fit ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'fit',
                                        ($event || null) as any,
                                    )
                                "
                            />
                            <TcInput
                                label="Zoom interno"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.inner_scale ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'inner_scale',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Posición X (%)"
                                type="number"
                                :model-value="inspectorConfig.object_x ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'object_x',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Posición Y (%)"
                                type="number"
                                :model-value="inspectorConfig.object_y ?? ''"
                                @update:model-value="
                                    updateInspectorField(
                                        'object_y',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                        </div>
                    </div>

                    <template v-if="selectedItem">
                        <div
                            class="space-y-3 border-t border-gray-100 pt-3 dark:border-white/10"
                        >
                            <p
                                class="text-xs font-semibold tracking-wide text-gray-400 uppercase"
                            >
                                Contenido
                            </p>
                            <TcInput
                                label="Nombre"
                                :model-value="selectedItem.name"
                                @update:model-value="
                                    updateQuickField('name', $event)
                                "
                            />
                            <div class="grid grid-cols-2 gap-2">
                                <TcInput
                                    label="Precio"
                                    type="number"
                                    step="0.01"
                                    :model-value="selectedItem.price"
                                    @update:model-value="
                                        updateQuickField('price', $event)
                                    "
                                />
                                <TcInput
                                    label="Precio secundario"
                                    type="number"
                                    step="0.01"
                                    :model-value="
                                        selectedItem.price_secondary ?? ''
                                    "
                                    @update:model-value="
                                        updateQuickField(
                                            'price_secondary',
                                            $event,
                                        )
                                    "
                                />
                            </div>
                            <TcInput
                                label="Descripción"
                                :model-value="selectedItem.description ?? ''"
                                @update:model-value="
                                    updateQuickField('description', $event)
                                "
                            />
                            <TcSelect
                                v-if="zoneOptions.length"
                                label="Zona"
                                :options="zoneOptions"
                                :model-value="selectedItem.zone ?? ''"
                                @update:model-value="
                                    updateQuickField('zone', $event)
                                "
                            />
                            <TcSwitch
                                label="Activo"
                                description="Visible en el menú"
                                :model-value="selectedItem.is_active"
                                @update:model-value="
                                    updateQuickField('is_active', $event)
                                "
                            />
                        </div>
                    </template>
                </template>
            </aside>
        </div>
    </div>
</template>

<style scoped>
.tc-editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
}

.tc-editor-grid {
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr) 300px;
    gap: 16px;
    align-items: start;
}

@media (max-width: 1279px) {
    .tc-editor-grid {
        grid-template-columns: 1fr;
    }
}

.tc-editor-sidebar,
.tc-editor-inspector {
    padding: 14px;
    max-height: calc(100vh - 230px);
    overflow-y: auto;
}

.tc-editor-canvas-wrap {
    padding: 14px;
}

.tc-editor-canvas-viewport {
    position: relative;
    overflow: auto;
    border-radius: 12px;
    border: 1px solid #e5decf;
    background: #efe9da;
    max-height: calc(100vh - 260px);
    padding: 16px;
}

.tc-editor-canvas-scaled {
    transform-origin: top left;
}
</style>
