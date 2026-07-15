<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import {
    AlignHorizontalJustifyCenter,
    AlignLeft,
    AlignVerticalJustifyCenter,
    ArrowDownToLine,
    ArrowUpToLine,
    ChevronLeft,
    ChevronRight,
    CircleAlert,
    CircleCheckBig,
    ExternalLink,
    GripVertical,
    Image as ImageIcon,
    LoaderCircle,
    Lock,
    LockOpen,
    Monitor,
    Redo2,
    RotateCcw,
    Search,
    Settings2,
    Smartphone,
    Tablet,
    Tag,
    Type as TypeIcon,
    Undo2,
    ZoomIn,
} from 'lucide-vue-next';
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
    CATEGORY_ELEMENT_LABELS,
    ITEM_ELEMENT_LABELS,
    MENU_DEVICE_ORDER,
    MENU_DEVICE_WIDTH,
    categoryElementFor,
    hasOwnElementConfig,
    itemElementFor,
} from '@/components/Public/Menu/types';
import type {
    CategoryElementKey,
    ElementConfig,
    ItemElementKey,
    MenuCategoryData,
    MenuDevice,
    MenuItemData,
} from '@/components/Public/Menu/types';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import { useAutosave } from '@/composables/useAutosave';
import { useDragSort } from '@/composables/useDragSort';
import { useMenuPreviewParent } from '@/composables/useMenuPreviewBridge';
import { useNotify } from '@/composables/useNotify';
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
const notify = useNotify();

/* ------------------------------------------------------------------ */
/* Las tres vistas configurables — nada de sm/md/lg/xl/2xl visible      */
/* ------------------------------------------------------------------ */

interface DevicePreset {
    key: MenuDevice;
    label: string;
    width: number;
    height: number;
    icon: typeof Smartphone;
}

const DEVICES: DevicePreset[] = [
    { key: 'mobile', label: 'Móvil', width: MENU_DEVICE_WIDTH.mobile, height: 844, icon: Smartphone },
    { key: 'tablet', label: 'Tablet', width: MENU_DEVICE_WIDTH.tablet, height: 1024, icon: Tablet },
    { key: 'desktop', label: 'Escritorio', width: MENU_DEVICE_WIDTH.desktop, height: 900, icon: Monitor },
];

const selectedDevice = ref<MenuDevice>('mobile');
const activeDevice = computed(
    () => DEVICES.find((d) => d.key === selectedDevice.value) ?? DEVICES[0],
);

// El zoom es puramente visual (transform:scale sobre un envoltorio), nunca
// se aplica al iframe mismo — así las coordenadas guardadas nunca dependen
// del zoom. Al cambiar de vista se elige un zoom inicial razonable según el
// espacio disponible en pantalla (cálculo puntual, no un observador
// reactivo — nunca se vuelve a tocar el tamaño del iframe a partir de esto).
const zoom = ref(100);

function pickInitialZoom(device: DevicePreset): number {
    if (typeof window === 'undefined') {
        return 100;
    }

    const reserved = 240 + 300 + 96; // sidebar + inspector + paddings/gaps
    const available = Math.max(280, window.innerWidth - reserved);

    return Math.min(100, Math.max(30, Math.round((available / device.width) * 100)));
}

watch(
    selectedDevice,
    () => {
        zoom.value = pickInitialZoom(activeDevice.value);
    },
    { immediate: true },
);

const scale = computed(() => zoom.value / 100);

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
/* Secciones (categorías) — navegación + búsqueda                       */
/* ------------------------------------------------------------------ */

const activeCategoryId = ref<number | null>(categories[0]?.id ?? null);
const activeCategory = computed(
    () => categories.find((c) => c.id === activeCategoryId.value) ?? null,
);
const activeIndex = computed(() =>
    categories.findIndex((c) => c.id === activeCategoryId.value),
);

const searchQuery = ref('');

function normalize(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '');
}

const visibleCategories = computed(() => {
    const q = normalize(searchQuery.value.trim());

    if (!q) {
        return categories;
    }

    return categories.filter(
        (cat) =>
            normalize(cat.name).includes(q) ||
            cat.items.some((item) => normalize(item.name).includes(q)),
    );
});

const visibleItems = computed(() => {
    if (!activeCategory.value) {
        return [];
    }

    const q = normalize(searchQuery.value.trim());

    if (!q) {
        return activeCategory.value.items;
    }

    return activeCategory.value.items.filter((item) =>
        normalize(item.name).includes(q),
    );
});

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

function resolveConfig(key: string, device: MenuDevice): ElementConfig {
    const parsed = parseKey(key);
    const width = MENU_DEVICE_WIDTH[device];

    if (!parsed) {
        return itemElementFor({ layout_settings: null }, 'container', width);
    }

    if (parsed.kind === 'item') {
        const item = findItemGlobal(parsed.id);

        return itemElementFor(
            { layout_settings: item?.layout_settings },
            parsed.element as ItemElementKey,
            width,
        );
    }

    const category = findCategoryGlobal(parsed.id);

    return categoryElementFor(
        { visual_settings: category?.visual_settings },
        parsed.element as CategoryElementKey,
        width,
    );
}

function hasOwnConfig(key: string, device: MenuDevice): boolean {
    const parsed = parseKey(key);

    if (!parsed) {
        return false;
    }

    if (parsed.kind === 'item') {
        const item = findItemGlobal(parsed.id);

        return hasOwnElementConfig(
            item?.layout_settings?.[parsed.element as ItemElementKey],
            device,
        );
    }

    const category = findCategoryGlobal(parsed.id);

    return hasOwnElementConfig(
        category?.visual_settings?.[parsed.element as CategoryElementKey],
        device,
    );
}

function applyMirror(
    key: string,
    config: ElementConfig | null,
    device: MenuDevice,
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
        elementSettings[device] = config;
    } else {
        delete elementSettings[device];
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
    device: MenuDevice,
    config: ElementConfig | null,
) {
    applyMirror(key, config, device);
    pulseSaving();

    if (config) {
        bridge.updateConfig(key, config, device);
    } else {
        bridge.clearElement(key, device);
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

function iconForElement(key: string) {
    if (IMAGE_ELEMENTS.has(key)) {
        return ImageIcon;
    }

    if (key === 'price' || key === 'price_secondary') {
        return Tag;
    }

    if (key === 'description' || key === 'ingredients') {
        return AlignLeft;
    }

    return TypeIcon;
}

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
        ? resolveConfig(selectedKey.value, selectedDevice.value)
        : null,
);
const selectedHasOwnConfig = computed(() =>
    selectedKey.value
        ? hasOwnConfig(selectedKey.value, selectedDevice.value)
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
    device: MenuDevice;
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
    applyChange(action.key, action.device, action.prev);
}

function redo() {
    const action = redoStack.value.pop();

    if (!action) {
        return;
    }

    undoStack.value.push(action);
    applyChange(action.key, action.device, action.next);
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
    const device = selectedDevice.value;
    const prev = hasOwnConfig(key, device) ? resolveConfig(key, device) : null;
    applyMirror(key, config, device);
    recordUndo({ key, device, prev, next: config });
    pulseSaving();
}

/* ------------------------------------------------------------------ */
/* Estado de guardado visible en la barra superior                      */
/* ------------------------------------------------------------------ */

const positionSaveStatus = ref<'idle' | 'saving' | 'saved'>('idle');
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function pulseSaving() {
    positionSaveStatus.value = 'saving';

    if (saveTimer) {
        clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
        positionSaveStatus.value = 'saved';
    }, 500);
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
    const device = selectedDevice.value;

    if (inspectorBurstPrev === undefined) {
        inspectorBurstPrev = hasOwnConfig(key, device)
            ? resolveConfig(key, device)
            : null;
    }

    const next = { ...resolveConfig(key, device), [field]: value };
    applyMirror(key, next, device);
    pulseSaving();

    if (inspectorDebounce) {
        clearTimeout(inspectorDebounce);
    }

    inspectorDebounce = setTimeout(() => {
        inspectorDebounce = null;
        const prev = inspectorBurstPrev ?? null;
        inspectorBurstPrev = undefined;
        recordUndo({ key, device, prev, next });
        bridge.updateConfig(key, next, device);
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
    const device = selectedDevice.value;
    const prev = hasOwnConfig(key, device) ? resolveConfig(key, device) : null;
    const next = { ...resolveConfig(key, device), [field]: value };
    recordUndo({ key, device, prev, next });
    applyChange(key, device, next);
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

    const current = resolveConfig(selectedKey.value, selectedDevice.value);
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

    const current = resolveConfig(selectedKey.value, selectedDevice.value);
    const dy =
        rect.parent.top +
        rect.parent.height / 2 -
        (rect.element.top + rect.element.height / 2);
    commitFieldNow('y', Math.round(current.y + dy));
}

function restoreCurrentView() {
    if (!selectedKey.value || !selectedHasOwnConfig.value) {
        return;
    }

    const key = selectedKey.value;
    const device = selectedDevice.value;
    const prev = resolveConfig(key, device);
    recordUndo({ key, device, prev, next: null });
    applyChange(key, device, null);
}

async function restoreAllViews() {
    if (!selectedKey.value) {
        return;
    }

    const confirmed = await notify.confirmDanger(
        '¿Restaurar las tres vistas?',
        'Se perderán los ajustes de Móvil, Tablet y Escritorio para este elemento — no se puede deshacer con un solo clic.',
    );

    if (!confirmed) {
        return;
    }

    const key = selectedKey.value;

    for (const device of MENU_DEVICE_ORDER) {
        if (hasOwnConfig(key, device)) {
            const prev = resolveConfig(key, device);
            recordUndo({ key, device, prev, next: null });
            applyChange(key, device, null);
        }
    }

    notify.success('Se restauraron las tres vistas.');
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

const toolbarStatus = computed<'idle' | 'saving' | 'saved' | 'error'>(() => {
    if (quickAutosave.status.value === 'error') {
        return 'error';
    }

    if (
        quickAutosave.status.value === 'saving' ||
        quickAutosave.status.value === 'pending' ||
        positionSaveStatus.value === 'saving'
    ) {
        return 'saving';
    }

    if (
        quickAutosave.status.value === 'saved' ||
        positionSaveStatus.value === 'saved'
    ) {
        return 'saved';
    }

    return 'idle';
});

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
    return !!resolveConfig(key, selectedDevice.value).locked;
}

function toggleElementLock(key: string) {
    const device = selectedDevice.value;
    const config = resolveConfig(key, device);
    const prev = hasOwnConfig(key, device) ? config : null;
    const next = { ...config, locked: !config.locked };
    recordUndo({ key, device, prev, next });
    applyChange(key, device, next);
}
</script>

<template>
    <Head title="Editor visual del menú" />

    <div class="tc-admin-page tc-menu-editor">
        <AdminPageHeader
            title="Editor visual del menú"
            description="Configura las vistas Móvil, Tablet y Escritorio. Los tamaños intermedios se adaptan automáticamente."
        >
            <template #label>Menú</template>
            <template #actions>
                <Link href="/admin/menu-items" class="tc-btn-secondary"
                    >← Volver</Link
                >
            </template>
        </AdminPageHeader>

        <div class="tc-editor-toolbar tc-admin-card">
            <div class="tc-device-switch">
                <button
                    v-for="device in DEVICES"
                    :key="device.key"
                    type="button"
                    class="tc-device-btn"
                    :class="{ 'tc-device-btn--active': selectedDevice === device.key }"
                    :title="`${device.label} (${device.width}px)`"
                    @click="selectedDevice = device.key"
                >
                    <component :is="device.icon" class="h-4 w-4" />
                    {{ device.label }}
                </button>
            </div>

            <div class="tc-save-status" :class="`tc-save-status--${toolbarStatus}`">
                <LoaderCircle v-if="toolbarStatus === 'saving'" class="h-3.5 w-3.5 animate-spin" />
                <CircleCheckBig v-else-if="toolbarStatus === 'saved'" class="h-3.5 w-3.5" />
                <CircleAlert v-else-if="toolbarStatus === 'error'" class="h-3.5 w-3.5" />
                <span>{{
                    toolbarStatus === 'saving'
                        ? 'Guardando…'
                        : toolbarStatus === 'error'
                          ? 'Error al guardar'
                          : toolbarStatus === 'saved'
                            ? 'Guardado'
                            : 'Sin cambios'
                }}</span>
            </div>

            <div class="tc-toolbar-group">
                <button
                    type="button"
                    class="tc-icon-btn"
                    title="Deshacer (Ctrl+Z)"
                    :disabled="!undoStack.length"
                    @click="undo"
                >
                    <Undo2 class="h-4 w-4" />
                </button>
                <button
                    type="button"
                    class="tc-icon-btn"
                    title="Rehacer (Ctrl+Shift+Z)"
                    :disabled="!redoStack.length"
                    @click="redo"
                >
                    <Redo2 class="h-4 w-4" />
                </button>
            </div>

            <div class="tc-toolbar-group">
                <ZoomIn class="h-4 w-4 text-gray-400" />
                <input
                    v-model.number="zoom"
                    type="range"
                    min="25"
                    max="150"
                    step="5"
                    class="w-24"
                    aria-label="Zoom de la vista previa"
                />
                <span class="w-10 text-right text-xs text-gray-500 tabular-nums"
                    >{{ zoom }}%</span
                >
            </div>

            <a
                href="/menu"
                target="_blank"
                rel="noopener"
                class="tc-btn-secondary tc-toolbar-group"
            >
                <ExternalLink class="h-4 w-4" /> Abrir menú público
            </a>
        </div>

        <div class="tc-editor-grid">
            <!-- Izquierda: secciones + árbol de elementos + orden -->
            <aside class="tc-admin-card tc-editor-sidebar">
                <div class="tc-search-box">
                    <Search class="h-4 w-4 text-gray-400" />
                    <input
                        v-model="searchQuery"
                        type="search"
                        placeholder="Buscar sección o platillo…"
                        class="tc-search-input"
                    />
                </div>

                <h3 class="tc-sidebar-heading">Secciones</h3>
                <ul class="mb-4 space-y-0.5">
                    <li v-for="cat in visibleCategories" :key="cat.id">
                        <button
                            type="button"
                            class="tc-section-btn"
                            :class="{ 'tc-section-btn--active': cat.id === activeCategoryId }"
                            @click="selectCategory(cat.id)"
                        >
                            {{ cat.name }}
                        </button>
                    </li>
                    <li v-if="!visibleCategories.length" class="px-2 py-3 text-xs text-gray-400">
                        Sin resultados para «{{ searchQuery }}».
                    </li>
                </ul>

                <div class="mb-4 flex items-center gap-2">
                    <button
                        type="button"
                        class="tc-btn-secondary flex-1 text-xs"
                        :disabled="activeIndex <= 0"
                        @click="goToIndex(activeIndex - 1)"
                    >
                        <ChevronLeft class="mr-1 inline h-3.5 w-3.5" />Anterior
                    </button>
                    <span class="text-xs font-medium whitespace-nowrap text-gray-400">
                        {{ activeIndex + 1 }}/{{ categories.length }}
                    </span>
                    <button
                        type="button"
                        class="tc-btn-secondary flex-1 text-xs"
                        :disabled="activeIndex >= categories.length - 1"
                        @click="goToIndex(activeIndex + 1)"
                    >
                        Siguiente<ChevronRight class="ml-1 inline h-3.5 w-3.5" />
                    </button>
                </div>

                <template v-if="activeCategory">
                    <h3 class="tc-sidebar-heading">Elementos de la sección</h3>
                    <ul class="mb-4 space-y-0.5">
                        <li
                            v-for="el in categoryElementKeys(activeCategory)"
                            :key="el"
                            class="flex items-center gap-1"
                        >
                            <button
                                type="button"
                                class="tc-element-btn"
                                :class="{
                                    'tc-element-btn--active':
                                        selectedKey === `category-${activeCategory.id}:${el}`,
                                }"
                                @click="
                                    onSelectFromSidebar(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                "
                            >
                                <component :is="iconForElement(el)" class="h-3.5 w-3.5 shrink-0 opacity-60" />
                                <span class="truncate">{{ CATEGORY_ELEMENT_LABELS[el] }}</span>
                            </button>
                            <button
                                type="button"
                                class="tc-lock-btn"
                                :aria-label="
                                    isElementLocked(`category-${activeCategory.id}:${el}`)
                                        ? 'Desbloquear elemento'
                                        : 'Bloquear elemento'
                                "
                                @click="
                                    toggleElementLock(`category-${activeCategory.id}:${el}`)
                                "
                            >
                                <Lock v-if="isElementLocked(`category-${activeCategory.id}:${el}`)" class="h-3 w-3" />
                                <LockOpen v-else class="h-3 w-3" />
                            </button>
                        </li>
                    </ul>
                </template>

                <template v-if="activeCategory && visibleItems.length">
                    <h3 class="tc-sidebar-heading">
                        Platillos
                        <span v-if="saving" class="ml-1 font-normal text-[var(--tc-blue)] normal-case">
                            guardando…
                        </span>
                    </h3>
                    <ul :ref="(el) => bindReorderZone(el as HTMLElement)" class="space-y-0.5">
                        <li
                            v-for="item in visibleItems"
                            :key="item.id"
                            data-drag-row
                            class="rounded-lg text-xs"
                            :class="{ 'opacity-40': dragging?.item.id === item.id }"
                        >
                            <div class="flex items-center gap-1.5 px-1.5 py-1">
                                <button
                                    type="button"
                                    class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                    aria-label="Arrastrar para reordenar"
                                    @pointerdown="onReorderHandleDown(item, $event)"
                                >
                                    <GripVertical class="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 truncate text-left text-gray-700"
                                    @click="toggleExpanded(item.id)"
                                >
                                    <ChevronRight
                                        class="mr-0.5 inline h-3 w-3 transition-transform"
                                        :class="{ 'rotate-90': expandedItems.has(item.id) }"
                                    />
                                    {{ item.name }}
                                </button>
                            </div>
                            <ul v-if="expandedItems.has(item.id)" class="mb-1 ml-6 space-y-0.5">
                                <li
                                    v-for="el in itemElementKeys(item)"
                                    :key="el"
                                    class="flex items-center gap-1"
                                >
                                    <button
                                        type="button"
                                        class="tc-element-btn"
                                        :class="{
                                            'tc-element-btn--active':
                                                selectedKey === `item-${item.id}:${el}`,
                                        }"
                                        @click="onSelectFromSidebar(`item-${item.id}:${el}`)"
                                    >
                                        <component :is="iconForElement(el)" class="h-3.5 w-3.5 shrink-0 opacity-60" />
                                        <span class="truncate">{{ ITEM_ELEMENT_LABELS[el] }}</span>
                                    </button>
                                    <button
                                        type="button"
                                        class="tc-lock-btn"
                                        :aria-label="
                                            isElementLocked(`item-${item.id}:${el}`)
                                                ? 'Desbloquear elemento'
                                                : 'Bloquear elemento'
                                        "
                                        @click="toggleElementLock(`item-${item.id}:${el}`)"
                                    >
                                        <Lock v-if="isElementLocked(`item-${item.id}:${el}`)" class="h-3 w-3" />
                                        <LockOpen v-else class="h-3 w-3" />
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </template>
            </aside>

            <!-- Centro: iframe con el MISMO Public/Menu.vue, a tamaño real de dispositivo -->
            <div class="tc-admin-card tc-editor-canvas-wrap">
                <div class="tc-editor-canvas-viewport">
                    <div
                        v-if="!previewReady"
                        class="tc-editor-skeleton"
                        :style="{ width: activeDevice.width * scale + 'px', height: activeDevice.height * scale + 'px' }"
                    >
                        <LoaderCircle class="h-6 w-6 animate-spin text-gray-300" />
                    </div>
                    <div
                        class="tc-editor-canvas-scaled"
                        :style="{
                            width: activeDevice.width + 'px',
                            height: activeDevice.height + 'px',
                            transform: `scale(${scale})`,
                            visibility: previewReady ? 'visible' : 'hidden',
                        }"
                    >
                        <iframe
                            ref="iframeEl"
                            :src="previewUrl"
                            :style="{
                                width: activeDevice.width + 'px',
                                height: activeDevice.height + 'px',
                                border: 'none',
                                display: 'block',
                            }"
                            title="Vista previa editable del menú"
                        />
                    </div>
                </div>
                <p class="mt-2 text-xs text-gray-400">
                    Estás editando la vista <strong>{{ activeDevice.label }}</strong>.
                    Haz clic en cualquier elemento del menú para seleccionarlo,
                    arrástralo para moverlo, usa la manija inferior derecha para
                    redimensionar y las flechas del teclado para ajustes finos
                    (Shift = 10px). Esta vista previa es el menú público real —
                    lo que ves aquí es exactamente lo que verá el visitante.
                </p>
            </div>

            <!-- Derecha: inspector -->
            <aside class="tc-admin-card tc-editor-inspector">
                <template v-if="!selectedKey || !inspectorConfig">
                    <div class="tc-inspector-empty">
                        <Settings2 class="h-8 w-8 text-gray-200" />
                        <p class="text-sm text-gray-400">
                            Selecciona un elemento en el lienzo o en la lista de la
                            izquierda para editarlo.
                        </p>
                    </div>
                </template>

                <template v-else>
                    <h3 class="mb-3 text-sm font-bold text-gray-800">
                        {{ selectedLabel }}
                    </h3>

                    <div class="mb-4 space-y-2.5">
                        <p class="tc-inspector-label">Tamaño</p>
                        <div class="grid grid-cols-2 gap-2">
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
                                            Number((($event.target) as HTMLInputElement).value),
                                        )
                                    "
                                />
                                <label class="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                    <input
                                        type="checkbox"
                                        :checked="inspectorConfig.width === null"
                                        @change="
                                            toggleAutoWidth((($event.target) as HTMLInputElement).checked)
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
                                            Number((($event.target) as HTMLInputElement).value),
                                        )
                                    "
                                />
                                <label class="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                    <input
                                        type="checkbox"
                                        :checked="inspectorConfig.height === null"
                                        @change="
                                            toggleAutoHeight((($event.target) as HTMLInputElement).checked)
                                        "
                                    />
                                    Proporcional
                                </label>
                            </div>
                        </div>

                        <p class="tc-inspector-label pt-1">Posición y capa</p>
                        <div class="flex flex-wrap gap-1.5">
                            <button type="button" class="tc-btn-secondary text-xs" @click="centerHorizontally">
                                <AlignHorizontalJustifyCenter class="mr-1 inline h-3.5 w-3.5" />Centrar H
                            </button>
                            <button type="button" class="tc-btn-secondary text-xs" @click="centerVertically">
                                <AlignVerticalJustifyCenter class="mr-1 inline h-3.5 w-3.5" />Centrar V
                            </button>
                            <button type="button" class="tc-btn-secondary text-xs" @click="bringToFront">
                                <ArrowUpToLine class="mr-1 inline h-3.5 w-3.5" />Al frente
                            </button>
                            <button type="button" class="tc-btn-secondary text-xs" @click="sendToBack">
                                <ArrowDownToLine class="mr-1 inline h-3.5 w-3.5" />Al fondo
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :class="{ 'tc-badge-pink': inspectorConfig.locked }"
                                @click="toggleLock"
                            >
                                <Lock v-if="inspectorConfig.locked" class="mr-1 inline h-3.5 w-3.5" />
                                <LockOpen v-else class="mr-1 inline h-3.5 w-3.5" />
                                {{ inspectorConfig.locked ? 'Bloqueado' : 'Bloquear' }}
                            </button>
                        </div>

                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :disabled="!selectedHasOwnConfig"
                                @click="restoreCurrentView"
                            >
                                <RotateCcw class="mr-1 inline h-3.5 w-3.5" />Restaurar {{ activeDevice.label.toLowerCase() }}
                            </button>
                            <button type="button" class="tc-btn-secondary text-xs" @click="restoreAllViews">
                                <RotateCcw class="mr-1 inline h-3.5 w-3.5" />Restaurar las tres vistas
                            </button>
                        </div>
                    </div>

                    <div v-if="selectedKind === 'text'" class="mb-4 space-y-2.5 border-t border-gray-100 pt-3">
                        <p class="tc-inspector-label">Texto</p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcInput
                                label="Tamaño de fuente"
                                type="number"
                                :model-value="inspectorConfig.font_size ?? ''"
                                @update:model-value="
                                    updateInspectorField('font_size', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                label="Ancho máx. (px)"
                                type="number"
                                :model-value="inspectorConfig.max_width ?? ''"
                                @update:model-value="
                                    updateInspectorField('max_width', $event === '' ? null : Number($event))
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
                                    updateInspectorField('align', ($event || null) as any)
                                "
                            />
                            <TcInput
                                label="Color"
                                :model-value="inspectorConfig.color ?? ''"
                                placeholder="#144e8f"
                                @update:model-value="
                                    updateInspectorField('color', ($event || null) as any)
                                "
                            />
                        </div>
                    </div>

                    <div v-if="selectedKind === 'image'" class="mb-4 space-y-2.5 border-t border-gray-100 pt-3">
                        <p class="tc-inspector-label">Imagen</p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcSelect
                                label="Ajuste"
                                :options="[
                                    { value: 'contain', label: 'Contain' },
                                    { value: 'cover', label: 'Cover' },
                                ]"
                                :model-value="inspectorConfig.fit ?? ''"
                                @update:model-value="
                                    updateInspectorField('fit', ($event || null) as any)
                                "
                            />
                        </div>
                    </div>

                    <details class="tc-advanced">
                        <summary class="tc-advanced-summary">
                            <Settings2 class="h-3.5 w-3.5" /> Ajustes avanzados
                        </summary>
                        <div class="grid grid-cols-2 gap-2 pt-2.5">
                            <TcInput
                                label="X (px)"
                                type="number"
                                :model-value="Math.round(inspectorConfig.x)"
                                @update:model-value="updateInspectorField('x', Number($event))"
                            />
                            <TcInput
                                label="Y (px)"
                                type="number"
                                :model-value="Math.round(inspectorConfig.y)"
                                @update:model-value="updateInspectorField('y', Number($event))"
                            />
                            <TcInput
                                label="Rotación (°)"
                                type="number"
                                :model-value="inspectorConfig.rotation"
                                @update:model-value="updateInspectorField('rotation', Number($event))"
                            />
                            <TcInput
                                label="Nivel (z-index)"
                                type="number"
                                :model-value="inspectorConfig.z_index"
                                @update:model-value="updateInspectorField('z_index', Number($event))"
                            />
                            <TcInput
                                v-if="selectedKind === 'text'"
                                label="Interlineado"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.line_height ?? ''"
                                @update:model-value="
                                    updateInspectorField('line_height', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                v-if="selectedKind === 'text'"
                                label="Espaciado (px)"
                                type="number"
                                step="0.1"
                                :model-value="inspectorConfig.letter_spacing ?? ''"
                                @update:model-value="
                                    updateInspectorField('letter_spacing', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                v-if="selectedKind === 'image'"
                                label="Zoom interno"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.inner_scale ?? ''"
                                @update:model-value="
                                    updateInspectorField('inner_scale', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                v-if="selectedKind === 'image'"
                                label="Posición X (%)"
                                type="number"
                                :model-value="inspectorConfig.object_x ?? ''"
                                @update:model-value="
                                    updateInspectorField('object_x', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                v-if="selectedKind === 'image'"
                                label="Posición Y (%)"
                                type="number"
                                :model-value="inspectorConfig.object_y ?? ''"
                                @update:model-value="
                                    updateInspectorField('object_y', $event === '' ? null : Number($event))
                                "
                            />
                            <TcInput
                                label="Escala"
                                type="number"
                                step="0.05"
                                :model-value="inspectorConfig.scale"
                                @update:model-value="updateInspectorField('scale', Number($event))"
                            />
                        </div>
                    </details>

                    <template v-if="selectedItem">
                        <div class="space-y-3 border-t border-gray-100 pt-3">
                            <p class="tc-inspector-label">Contenido</p>
                            <TcInput
                                label="Nombre"
                                :model-value="selectedItem.name"
                                @update:model-value="updateQuickField('name', $event)"
                            />
                            <div class="grid grid-cols-2 gap-2">
                                <TcInput
                                    label="Precio"
                                    type="number"
                                    step="0.01"
                                    :model-value="selectedItem.price"
                                    @update:model-value="updateQuickField('price', $event)"
                                />
                                <TcInput
                                    label="Precio secundario"
                                    type="number"
                                    step="0.01"
                                    :model-value="selectedItem.price_secondary ?? ''"
                                    @update:model-value="updateQuickField('price_secondary', $event)"
                                />
                            </div>
                            <TcInput
                                label="Descripción"
                                :model-value="selectedItem.description ?? ''"
                                @update:model-value="updateQuickField('description', $event)"
                            />
                            <TcSelect
                                v-if="zoneOptions.length"
                                label="Zona"
                                :options="zoneOptions"
                                :model-value="selectedItem.zone ?? ''"
                                @update:model-value="updateQuickField('zone', $event)"
                            />
                            <TcSwitch
                                label="Activo"
                                description="Visible en el menú"
                                :model-value="selectedItem.is_active"
                                @update:model-value="updateQuickField('is_active', $event)"
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
    gap: 14px;
    padding: 10px 14px;
    position: sticky;
    top: 8px;
    z-index: 30;
}

.tc-device-switch {
    display: flex;
    gap: 2px;
    background: #f4f1e9;
    border-radius: 10px;
    padding: 3px;
}

.tc-device-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12.5px;
    font-weight: 600;
    color: #8a8272;
    transition:
        background-color 0.15s ease,
        color 0.15s ease;
}

.tc-device-btn:hover {
    color: var(--tc-blue);
}

.tc-device-btn--active {
    background: #fff;
    color: var(--tc-blue);
    box-shadow: 0 1px 3px rgba(20, 78, 143, 0.18);
}

.tc-save-status {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
}

.tc-save-status--saving {
    color: var(--tc-blue);
}

.tc-save-status--saved {
    color: var(--tc-green, #079a4a);
}

.tc-save-status--error {
    color: var(--tc-pink);
}

.tc-toolbar-group {
    display: flex;
    align-items: center;
    gap: 6px;
}

.tc-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
    color: #6b7280;
    transition: background-color 0.15s ease;
}

.tc-icon-btn:hover:not(:disabled) {
    background: #f4f1e9;
    color: var(--tc-blue);
}

.tc-icon-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
}

.tc-editor-grid {
    display: grid;
    grid-template-columns: 250px minmax(0, 1fr) 310px;
    gap: 16px;
    align-items: start;
    margin-top: 12px;
}

.tc-editor-sidebar,
.tc-editor-inspector {
    padding: 14px;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
    position: sticky;
    top: 78px;
}

@media (max-width: 1279px) {
    .tc-editor-grid {
        grid-template-columns: 1fr;
    }

    /* Sticky solo tiene sentido junto al canvas en la rejilla de 3
       columnas: en la pila de una sola columna, un panel "pegado" se monta
       encima del panel siguiente al hacer scroll y bloquea los clics. Esta
       regla debe ir DESPUÉS de la base (misma especificidad) para ganar la
       cascada en este rango de ancho. */
    .tc-editor-sidebar,
    .tc-editor-inspector {
        position: static;
        max-height: none;
    }
}

.tc-search-box {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    margin-bottom: 14px;
    border-radius: 9px;
    border: 1px solid #e5decf;
    background: #fbf9f3;
}

.tc-search-input {
    flex: 1;
    min-width: 0;
    border: none;
    background: none;
    font-size: 12.5px;
    outline: none;
}

.tc-sidebar-heading {
    margin-bottom: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #9ca3af;
    text-transform: uppercase;
}

.tc-section-btn {
    width: 100%;
    border-radius: 10px;
    padding: 7px 10px;
    text-align: left;
    font-size: 13px;
    color: #57534e;
    transition: background-color 0.15s ease;
}

.tc-section-btn:hover {
    background: #f4f1e9;
}

.tc-section-btn--active {
    background: var(--tc-blue);
    color: #fff;
}

.tc-element-btn {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 6px;
    min-width: 0;
    border-radius: 8px;
    padding: 5px 8px;
    text-align: left;
    font-size: 12px;
    color: #78716c;
    transition: background-color 0.15s ease;
}

.tc-element-btn:hover {
    background: #f9fafb;
}

.tc-element-btn--active {
    background: #eef4fb;
    color: var(--tc-blue);
}

.tc-lock-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    color: #a8a29e;
    opacity: 0.7;
    transition: opacity 0.15s ease;
}

.tc-lock-btn:hover {
    opacity: 1;
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
    display: flex;
}

.tc-editor-canvas-scaled {
    transform-origin: top left;
    flex-shrink: 0;
}

.tc-editor-skeleton {
    position: absolute;
    top: 16px;
    left: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f4f1e9;
    border-radius: 8px;
}

.tc-inspector-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 40px 12px;
    text-align: center;
}

.tc-inspector-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #9ca3af;
    text-transform: uppercase;
}

.tc-advanced {
    margin-top: 10px;
    border-top: 1px solid #f3f4f6;
    padding-top: 8px;
}

.tc-advanced-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    list-style: none;
}

.tc-advanced-summary::-webkit-details-marker {
    display: none;
}

.tc-advanced-summary:hover {
    color: var(--tc-blue);
}
</style>
