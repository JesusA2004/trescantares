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
    Copy,
    Eye,
    EyeOff,
    ExternalLink,
    GripVertical,
    Image as ImageIcon,
    LoaderCircle,
    Lock,
    LockOpen,
    Monitor,
    Plus,
    Redo2,
    RotateCcw,
    Search,
    Settings2,
    Smartphone,
    Sparkles,
    Tablet,
    Tag,
    Trash2,
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
    categoryElementKeysFor,
    decorationElementFor,
    hasOwnElementConfig,
    isV2Config,
    itemElementFor,
    toAnchorCoordinates,
} from '@/components/Public/Menu/types';
import type {
    CategoryElementKey,
    ElementConfig,
    ElementConfigV2,
    ItemElementKey,
    MenuCategoryData,
    MenuDecorationData,
    MenuDevice,
    MenuItemData,
    StoredElementConfig,
} from '@/components/Public/Menu/types';
import TcInput from '@/components/tc/TcInput.vue';
import TcMediaLibraryModal from '@/components/tc/TcMediaLibraryModal.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import { useAutosave } from '@/composables/useAutosave';
import { useDragSort } from '@/composables/useDragSort';
import { useMenuPreviewParent } from '@/composables/useMenuPreviewBridge';
import { useNotify } from '@/composables/useNotify';
import { deleteJson, patchJson, postJson } from '@/lib/jsonApi';
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
    {
        key: 'mobile',
        label: 'Móvil',
        width: MENU_DEVICE_WIDTH.mobile,
        height: 844,
        icon: Smartphone,
    },
    {
        key: 'tablet',
        label: 'Tablet',
        width: MENU_DEVICE_WIDTH.tablet,
        height: 1024,
        icon: Tablet,
    },
    {
        key: 'desktop',
        label: 'Escritorio',
        width: MENU_DEVICE_WIDTH.desktop,
        height: 900,
        icon: Monitor,
    },
];

// Escritorio deja de ser un ancho fijo de 1440px: el documento interno del
// iframe (y la resolución de configs para ESTA misma vista) usa el ancho
// REAL de la ventana del navegador del administrador — así lo que se edita
// a, p. ej., 1909px (o 1366px, más angosto que el ancla) es pixel-exacto
// con lo que ve un visitante real en un monitor de ese ancho, en vez de
// comparar siempre contra un iframe fijo de 1440px. El ancla de 1440 sigue
// siendo la única representación que se PERSISTE (ver toAnchorCoordinates/
// fromAnchorCoordinates en types.ts, que ahora escalan en CUALQUIER
// dirección) — esto solo cambia a qué ancho real se edita/previsualiza esa
// misma configuración Escritorio. El piso de 320 es solo una salvaguarda
// contra valores degenerados (ventana ~0px), no un ancla de diseño.
const desktopRealWidth = ref(MENU_DEVICE_WIDTH.desktop);

function updateDesktopRealWidth() {
    if (typeof window === 'undefined') {
        return;
    }

    desktopRealWidth.value = Math.max(320, window.innerWidth);
}

onMounted(() => {
    updateDesktopRealWidth();
    window.addEventListener('resize', updateDesktopRealWidth);
});
onUnmounted(() => window.removeEventListener('resize', updateDesktopRealWidth));

/** Ancho real efectivo de cada vista — mobile/tablet siempre sus anclas fijas
 * (390/768), desktop el ancho real de la ventana (ver desktopRealWidth). Se
 * usa tanto para dimensionar el iframe como para resolver/guardar configs
 * (ver resolveConfig/resolveAnchorConfig), así el número que muestra el
 * inspector SIEMPRE coincide con lo que se ve en el lienzo. */
const effectiveDeviceWidth = computed<Record<MenuDevice, number>>(() => ({
    mobile: MENU_DEVICE_WIDTH.mobile,
    tablet: MENU_DEVICE_WIDTH.tablet,
    desktop: desktopRealWidth.value,
}));

const selectedDevice = ref<MenuDevice>('mobile');
const activeDevice = computed(() => {
    const preset =
        DEVICES.find((d) => d.key === selectedDevice.value) ?? DEVICES[0];

    return { ...preset, width: effectiveDeviceWidth.value[preset.key] };
});

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

    return Math.min(
        100,
        Math.max(30, Math.round((available / device.width) * 100)),
    );
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

/** Alto mínimo forzado de la SECCIÓN completa (no de un elemento) para la
 * vista actualmente seleccionada en la barra de herramientas — null =
 * automático (crece con el contenido, el comportamiento de siempre). Campo
 * discreto por vista, sin interpolar (mismo criterio que sectionHeightFor()
 * en types.ts, que es lo que consume el iframe/menú público). */
const sectionHeightForCurrentDevice = computed<number | null>(
    () => activeCategory.value?.section_height?.[selectedDevice.value] ?? null,
);

async function updateSectionHeight(height: number | null) {
    if (!activeCategory.value) {
        return;
    }

    const category = activeCategory.value;
    const breakpoint = selectedDevice.value;
    const heights = { ...(category.section_height ?? {}) };

    if (height === null) {
        delete heights[breakpoint];
    } else {
        heights[breakpoint] = height;
    }

    category.section_height = Object.keys(heights).length ? heights : null;

    try {
        await patchJson(
            `/admin/menu-editor/categories/${category.id}/section-height`,
            { breakpoint, height },
        );
        scheduleIframeReload();
    } catch {
        notify.error('No se pudo guardar el alto de la sección.');
    }
}

const searchQuery = ref('');

function normalize(text: string): string {
    return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
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
    } else if (parsed.kind === 'decoration') {
        const owner = categories.find((c) =>
            (c.decorations ?? []).some((d) => d.id === parsed.id),
        );

        if (owner) {
            activeCategoryId.value = owner.id;
        }
    } else {
        activeCategoryId.value = parsed.id;
    }
}

/* ------------------------------------------------------------------ */
/* Claves de elemento: item-{id}:{el} / category-{id}:{el} /            */
/* decoration-{id}:image                                                */
/* ------------------------------------------------------------------ */

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

function findDecorationGlobal(id: number): MenuDecorationData | null {
    for (const cat of categories) {
        const decoration = (cat.decorations ?? []).find((d) => d.id === id);

        if (decoration) {
            return decoration;
        }
    }

    return null;
}

function resolveConfigAtWidth(key: string, width: number): StoredElementConfig {
    const parsed = parseKey(key);

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

    if (parsed.kind === 'decoration') {
        const decoration = findDecorationGlobal(parsed.id);

        return decorationElementFor(
            { visual_settings: decoration?.visual_settings },
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

/** Config tal como se VE/EDITA en el lienzo — para 'desktop' esto usa el
 * ancho REAL de la ventana (ver effectiveDeviceWidth), así los valores que
 * muestra el inspector siempre coinciden con lo que hay en pantalla. */
function resolveConfig(key: string, device: MenuDevice): StoredElementConfig {
    return resolveConfigAtWidth(key, effectiveDeviceWidth.value[device]);
}

/** Config CRUDA tal como se PERSISTE (siempre en el ancla 1440, nunca en el
 * ancho real de edición) — se usa como línea base de deshacer/rehacer para
 * que undo/redo nunca mezcle valores ya escalados con valores ancla. Ver
 * toAnchorCoordinates/fromAnchorCoordinates. */
function resolveAnchorConfig(key: string, device: MenuDevice): StoredElementConfig {
    return resolveConfigAtWidth(key, MENU_DEVICE_WIDTH[device]);
}

/** Convierte una config REAL (tal como se ve/edita, ver resolveConfig) a la
 * representación ancla que se persiste — chokepoint único que deben cruzar
 * TODAS las escrituras del inspector (updateInspectorField/commitFieldNow)
 * antes de tocar el mirror local o enviar el cambio al iframe. Para V2 esto
 * es la IDENTIDAD: % ya es resolución-independiente (no depende del ancho
 * real de edición como sí le pasaba a px), así que no hay nada que
 * reescalar — solo el camino V1 histórico necesita la conversión real. */
function toAnchor(
    config: StoredElementConfig,
    device: MenuDevice,
): StoredElementConfig {
    if (isV2Config(config)) {
        return config;
    }

    return toAnchorCoordinates(
        config,
        effectiveDeviceWidth.value[device],
        MENU_DEVICE_WIDTH[device],
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

    if (parsed.kind === 'decoration') {
        const decoration = findDecorationGlobal(parsed.id);

        return hasOwnElementConfig(decoration?.visual_settings, device);
    }

    const category = findCategoryGlobal(parsed.id);

    return hasOwnElementConfig(
        category?.visual_settings?.[parsed.element as CategoryElementKey],
        device,
    );
}

function applyMirror(
    key: string,
    config: StoredElementConfig | null,
    device: MenuDevice,
) {
    const parsed = parseKey(key);

    if (!parsed) {
        return;
    }

    if (parsed.kind === 'decoration') {
        const decoration = findDecorationGlobal(parsed.id);

        if (!decoration) {
            return;
        }

        const settings = { ...(decoration.visual_settings ?? {}) };

        if (config) {
            settings[device] = config;
        } else {
            delete settings[device];
        }

        decoration.visual_settings = Object.keys(settings).length
            ? settings
            : null;

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
    config: StoredElementConfig | null,
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

const selectedDecoration = computed<MenuDecorationData | null>(() => {
    const parsed = selectedKey.value ? parseKey(selectedKey.value) : null;

    return parsed?.kind === 'decoration'
        ? findDecorationGlobal(parsed.id)
        : null;
});

async function renameSelectedDecoration(name: string) {
    if (!selectedDecoration.value) {
        return;
    }

    selectedDecoration.value.name = name;

    try {
        await patchJson(
            `/admin/menu-decorations/${selectedDecoration.value.id}`,
            { name },
        );
    } catch {
        notify.error('No se pudo renombrar el adorno.');
    }
}

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

    if (parsed.kind === 'decoration') {
        const decoration = findDecorationGlobal(parsed.id);

        return decoration ? `Adorno — ${decoration.name}` : 'Adorno';
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

const inspectorConfig = computed<StoredElementConfig | null>(() =>
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
    prev: StoredElementConfig | null;
    next: StoredElementConfig | null;
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
function onIframeCommit(key: string, config: StoredElementConfig) {
    const device = selectedDevice.value;
    const prev = hasOwnConfig(key, device)
        ? resolveAnchorConfig(key, device)
        : null;
    // config ya llega en espacio-ancla: el iframe (Menu.vue) convierte el
    // arrastre/resize real (medido en su propio ancho, que para Escritorio
    // puede ser cualquier ancho real de pantalla) antes de emitir 'commit'.
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
let inspectorBurstPrev: StoredElementConfig | null | undefined;

/** Unión de las claves de ambas versiones — un campo geométrico (x/width…)
 * solo tiene sentido pedirlo en la forma que YA tiene el elemento
 * seleccionado (ver isSelectedV2/setX/setY/setWidth/setHeight más abajo);
 * el resto de campos (rotation/z_index/opacity/locked/hidden/tipografía…)
 * existen con el mismo nombre y tipo en las dos formas. */
type AnyConfigField = keyof ElementConfig | keyof ElementConfigV2;

function updateInspectorField<K extends AnyConfigField>(
    field: K,
    value: (ElementConfig & ElementConfigV2)[K],
) {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const device = selectedDevice.value;

    if (inspectorBurstPrev === undefined) {
        inspectorBurstPrev = hasOwnConfig(key, device)
            ? resolveAnchorConfig(key, device)
            : null;
    }

    // nextReal está en el espacio REAL en que se ve/edita (coincide con lo
    // que muestra el inspector); se convierte UNA vez a espacio-ancla antes
    // de tocar el mirror local o enviarlo al iframe — ver toAnchor().
    const nextReal = {
        ...(resolveConfig(key, device) as unknown as Record<string, unknown>),
        [field]: value,
    } as unknown as StoredElementConfig;
    const next = toAnchor(nextReal, device);
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
function commitFieldNow<K extends AnyConfigField>(
    field: K,
    value: (ElementConfig & ElementConfigV2)[K],
) {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const device = selectedDevice.value;
    const prev = hasOwnConfig(key, device)
        ? resolveAnchorConfig(key, device)
        : null;
    const nextReal = {
        ...(resolveConfig(key, device) as unknown as Record<string, unknown>),
        [field]: value,
    } as unknown as StoredElementConfig;
    const next = toAnchor(nextReal, device);
    recordUndo({ key, device, prev, next });
    applyChange(key, device, next);
}

/** true cuando el elemento seleccionado YA está en formato V2 (%) — decide
 * qué nombre de campo/etiqueta usar para tamaño/posición (ver setX/setY/
 * setWidth/setHeight y las plantillas "Ancho/Alto/X/Y"). Un elemento aún V1
 * sigue mostrándose y editándose en px exactamente como hoy — la conversión
 * a V2 ocurre al arrastrar/redimensionar en el lienzo (ver
 * MenuEditableElement.vue), no todavía al escribir en el inspector. */
const isSelectedV2 = computed(() => isV2Config(inspectorConfig.value));
const sizeUnit = computed(() => (isSelectedV2.value ? '%' : 'px'));

const widthValue = computed<number | null>(() => {
    const c = inspectorConfig.value;

    if (!c) {
        return null;
    }

    return isV2Config(c) ? c.width_pct : c.width;
});
const heightValue = computed<number | null>(() => {
    const c = inspectorConfig.value;

    if (!c) {
        return null;
    }

    return isV2Config(c) ? c.height_pct : c.height;
});
const xValue = computed<number>(() => {
    const c = inspectorConfig.value;

    if (!c) {
        return 0;
    }

    return isV2Config(c) ? c.x_pct : c.x;
});
const yValue = computed<number>(() => {
    const c = inspectorConfig.value;

    if (!c) {
        return 0;
    }

    return isV2Config(c) ? c.y_pct : c.y;
});

function setWidth(value: number | null) {
    updateInspectorField(
        isSelectedV2.value ? 'width_pct' : 'width',
        value as never,
    );
}

function setHeight(value: number | null) {
    updateInspectorField(
        isSelectedV2.value ? 'height_pct' : 'height',
        value as never,
    );
}

function setX(value: number) {
    updateInspectorField(isSelectedV2.value ? 'x_pct' : 'x', value as never);
}

function setY(value: number) {
    updateInspectorField(isSelectedV2.value ? 'y_pct' : 'y', value as never);
}

function toggleAutoHeight(auto: boolean) {
    setHeight(auto ? null : Math.round(heightValue.value ?? 200));
}

function toggleAutoWidth(auto: boolean) {
    setWidth(auto ? null : Math.round(widthValue.value ?? 200));
}

/** Restaura solo los ajustes de "la imagen dentro del bloque" (encuadre) —
 * a propósito NO toca tamaño/posición/capa del bloque en sí, que tienen sus
 * propios botones "Restaurar {vista}"/"Restaurar las tres vistas". */
function restoreImageAdjustments() {
    if (!selectedKey.value) {
        return;
    }

    const key = selectedKey.value;
    const device = selectedDevice.value;
    const prev = hasOwnConfig(key, device)
        ? resolveAnchorConfig(key, device)
        : null;
    const nextReal: StoredElementConfig = {
        ...resolveConfig(key, device),
        fit: null,
        inner_scale: null,
        object_x: null,
        object_y: null,
    };
    const next = toAnchor(nextReal, device);
    recordUndo({ key, device, prev, next });
    applyChange(key, device, next);
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

    if (isV2Config(current)) {
        // % siempre contra el ANCHO del root (nunca window/iframe/zoom) —
        // rect.parent YA es ese mismo root medido en el documento real.
        const dxPct = (dx / rect.parent.width) * 100;
        setX(current.x_pct + dxPct);
    } else {
        setX(Math.round(current.x + dx));
    }
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

    if (isV2Config(current)) {
        // También contra el ANCHO del root (ver measuredRectToNormalized) —
        // NUNCA el alto, a propósito, conserva la escala uniforme.
        const dyPct = (dy / rect.parent.width) * 100;
        setY(current.y_pct + dyPct);
    } else {
        setY(Math.round(current.y + dy));
    }
}

/** Fuera del lienzo horizontalmente (mismo umbral que el badge de
 * MenuEditableElement.vue) — solo tiene sentido para un elemento YA
 * normalizado, cuyo x_pct/width_pct SON directamente su posición real, sin
 * necesidad de medir el DOM. */
const isSelectedOffCanvas = computed(() => {
    const c = inspectorConfig.value;

    if (!c || !isV2Config(c) || c.position_mode !== 'normalized') {
        return false;
    }

    const w = c.width_pct ?? 20;
    const visibleFraction = Math.min(c.x_pct + w, 100) - Math.max(c.x_pct, 0);

    return visibleFraction < w * 0.1;
});

/** Trae de vuelta un elemento normalizado que quedó fuera del lienzo —
 * clampa x_pct para que al menos una porción (20% de su propio ancho, o del
 * ancho por defecto si aún no tiene uno propio) quede dentro de 0-100%.
 * Calculado puramente desde el % ya guardado, sin ninguna medición del DOM:
 * para un elemento V2 el % ES la posición real. */
function bringIntoView() {
    const c = inspectorConfig.value;

    if (!c || !isV2Config(c)) {
        return;
    }

    const w = c.width_pct ?? 20;
    const margin = Math.min(20, w);
    const nextX = Math.min(Math.max(c.x_pct, margin - w), 100 - margin);
    setX(nextX);
}

function restoreCurrentView() {
    if (!selectedKey.value || !selectedHasOwnConfig.value) {
        return;
    }

    const key = selectedKey.value;
    const device = selectedDevice.value;
    const prev = resolveAnchorConfig(key, device);
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
            const prev = resolveAnchorConfig(key, device);
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

    // `item.ingredients`/`item.choice_label` llegan en null cuando su
    // *_hidden está activo (ver MenuItem::toPublicArray) — sin el OR aquí, en
    // cuanto se ocultara el bloque desaparecería de este árbol y ya no habría
    // forma de volver a seleccionarlo para reactivarlo (ver el switch
    // "Ingredientes visibles"/"Etiqueta visible" del inspector, más abajo).
    if (item.ingredients || item.ingredients_hidden) {
        keys.push('ingredients');
    }

    if (item.choice_label || item.choice_label_hidden) {
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
    const prev = hasOwnConfig(key, device)
        ? resolveAnchorConfig(key, device)
        : null;
    const next = toAnchor({ ...config, locked: !config.locked }, device);
    recordUndo({ key, device, prev, next });
    applyChange(key, device, next);
}

/* ------------------------------------------------------------------ */
/* Adornos de sección — flores/curvas/texturas que no pertenecen a      */
/* ningún platillo (ver MenuDecoration)                                 */
/* ------------------------------------------------------------------ */

const decorationsSaving = ref(false);
const addDecorationOpen = ref(false);
const replaceDecorationImageOpen = ref(false);

function selectDecoration(id: number) {
    onSelectFromSidebar(`decoration-${id}:image`);
}

async function toggleDecorationActive(decoration: MenuDecorationData) {
    const previous = decoration.is_active;
    decoration.is_active = !previous;
    decorationsSaving.value = true;

    try {
        await patchJson(`/admin/menu-decorations/${decoration.id}`, {
            is_active: decoration.is_active,
        });
        scheduleIframeReload();
    } catch {
        decoration.is_active = previous;
        notify.error('No se pudo actualizar el adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

async function duplicateDecorationAction(decoration: MenuDecorationData) {
    decorationsSaving.value = true;

    try {
        const res = await postJson<{ decoration: MenuDecorationData }>(
            `/admin/menu-decorations/${decoration.id}/duplicate`,
            {},
        );
        const owner = findCategoryGlobal(decoration.menu_category_id);

        if (owner) {
            owner.decorations = [...(owner.decorations ?? []), res.decoration];
        }

        scheduleIframeReload();
        notify.success('Adorno duplicado.');
    } catch {
        notify.error('No se pudo duplicar el adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

async function deleteDecorationAction(decoration: MenuDecorationData) {
    const confirmed = await notify.confirmDanger(
        '¿Eliminar este adorno?',
        'Esta acción no se puede deshacer. El archivo de imagen solo se borra si ningún otro platillo, título o adorno lo sigue usando.',
    );

    if (!confirmed) {
        return;
    }

    decorationsSaving.value = true;

    try {
        await deleteJson(`/admin/menu-decorations/${decoration.id}`);
        const owner = findCategoryGlobal(decoration.menu_category_id);

        if (owner) {
            owner.decorations = (owner.decorations ?? []).filter(
                (d) => d.id !== decoration.id,
            );
        }

        if (selectedKey.value === `decoration-${decoration.id}:image`) {
            selectedKey.value = null;
        }

        scheduleIframeReload();
        notify.success('Adorno eliminado.');
    } catch {
        notify.error('No se pudo eliminar el adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

async function onDecorationPicked({ path }: { path: string; url: string }) {
    if (!activeCategory.value) {
        return;
    }

    addDecorationOpen.value = false;
    decorationsSaving.value = true;

    try {
        const res = await postJson<{ decoration: MenuDecorationData }>(
            '/admin/menu-decorations',
            {
                menu_category_id: activeCategory.value.id,
                name: 'Nuevo adorno',
                image_library_path: path,
            },
        );
        activeCategory.value.decorations = [
            ...(activeCategory.value.decorations ?? []),
            res.decoration,
        ];
        scheduleIframeReload();
        selectDecoration(res.decoration.id);
        notify.success(
            'Adorno agregado — ya puedes moverlo/redimensionarlo en el lienzo.',
        );
    } catch {
        notify.error('No se pudo agregar el adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

async function onDecorationImageReplaced({
    path,
}: {
    path: string;
    url: string;
}) {
    if (!selectedDecoration.value) {
        return;
    }

    replaceDecorationImageOpen.value = false;
    decorationsSaving.value = true;

    try {
        const res = await patchJson<{ decoration: MenuDecorationData }>(
            `/admin/menu-decorations/${selectedDecoration.value.id}`,
            { image_library_path: path },
        );
        Object.assign(selectedDecoration.value, res.decoration);
        scheduleIframeReload();
        notify.success('Imagen del adorno reemplazada.');
    } catch {
        notify.error('No se pudo reemplazar la imagen del adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

async function moveDecorationToCategory(
    decoration: MenuDecorationData,
    categoryId: number,
) {
    if (categoryId === decoration.menu_category_id) {
        return;
    }

    decorationsSaving.value = true;

    try {
        await patchJson(`/admin/menu-decorations/${decoration.id}`, {
            menu_category_id: categoryId,
        });

        const from = findCategoryGlobal(decoration.menu_category_id);

        if (from) {
            from.decorations = (from.decorations ?? []).filter(
                (d) => d.id !== decoration.id,
            );
        }

        const to = findCategoryGlobal(categoryId);
        decoration.menu_category_id = categoryId;

        if (to) {
            to.decorations = [...(to.decorations ?? []), decoration];
        }

        scheduleIframeReload();
        notify.success('Adorno movido de sección.');
    } catch {
        notify.error('No se pudo mover el adorno.');
    } finally {
        decorationsSaving.value = false;
    }
}

const {
    registerZone: registerDecorationZone,
    start: startDecorationDrag,
    dragging: draggingDecoration,
} = useDragSort<MenuDecorationData>((zones) => {
    const [, items] = Object.entries(zones)[0] ?? [];

    if (!items || !activeCategory.value) {
        return Promise.resolve();
    }

    activeCategory.value.decorations = items;

    return postJson('/admin/menu-decorations/reorder', {
        items: items.map((d, idx) => ({ id: d.id, sort_order: idx })),
    });
});

const decorationZoneEl = ref<HTMLElement | null>(null);

function bindDecorationZone(el: HTMLElement | null) {
    decorationZoneEl.value = el;

    if (el && activeCategory.value) {
        registerDecorationZone(
            `decorations-${activeCategory.value.id}`,
            activeCategory.value.decorations ?? [],
            el,
        );
    }
}

watch(activeCategory, (cat) => {
    if (decorationZoneEl.value && cat) {
        registerDecorationZone(
            `decorations-${cat.id}`,
            cat.decorations ?? [],
            decorationZoneEl.value,
        );
    }
});

function onDecorationHandleDown(
    decoration: MenuDecorationData,
    e: PointerEvent,
) {
    if (!activeCategory.value) {
        return;
    }

    startDecorationDrag(
        decoration,
        `decorations-${activeCategory.value.id}`,
        e,
    );
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
                    :class="{
                        'tc-device-btn--active': selectedDevice === device.key,
                    }"
                    :title="`${device.label} (${effectiveDeviceWidth[device.key]}px)`"
                    @click="selectedDevice = device.key"
                >
                    <component :is="device.icon" class="h-4 w-4" />
                    {{ device.label }}
                </button>
            </div>

            <div
                class="tc-save-status"
                :class="`tc-save-status--${toolbarStatus}`"
            >
                <LoaderCircle
                    v-if="toolbarStatus === 'saving'"
                    class="h-3.5 w-3.5 animate-spin"
                />
                <CircleCheckBig
                    v-else-if="toolbarStatus === 'saved'"
                    class="h-3.5 w-3.5"
                />
                <CircleAlert
                    v-else-if="toolbarStatus === 'error'"
                    class="h-3.5 w-3.5"
                />
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
                            :class="{
                                'tc-section-btn--active':
                                    cat.id === activeCategoryId,
                            }"
                            @click="selectCategory(cat.id)"
                        >
                            {{ cat.name }}
                        </button>
                    </li>
                    <li
                        v-if="!visibleCategories.length"
                        class="px-2 py-3 text-xs text-gray-400"
                    >
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
                    <span
                        class="text-xs font-medium whitespace-nowrap text-gray-400"
                    >
                        {{ activeIndex + 1 }}/{{ categories.length }}
                    </span>
                    <button
                        type="button"
                        class="tc-btn-secondary flex-1 text-xs"
                        :disabled="activeIndex >= categories.length - 1"
                        @click="goToIndex(activeIndex + 1)"
                    >
                        Siguiente<ChevronRight
                            class="ml-1 inline h-3.5 w-3.5"
                        />
                    </button>
                </div>

                <template v-if="activeCategory">
                    <h3 class="tc-sidebar-heading">Elementos de la sección</h3>
                    <ul class="mb-4 space-y-0.5">
                        <li
                            v-for="el in categoryElementKeysFor(activeCategory)"
                            :key="el"
                            class="flex items-center gap-1"
                        >
                            <button
                                type="button"
                                class="tc-element-btn"
                                :class="{
                                    'tc-element-btn--active':
                                        selectedKey ===
                                        `category-${activeCategory.id}:${el}`,
                                }"
                                @click="
                                    onSelectFromSidebar(
                                        `category-${activeCategory.id}:${el}`,
                                    )
                                "
                            >
                                <component
                                    :is="iconForElement(el)"
                                    class="h-3.5 w-3.5 shrink-0 opacity-60"
                                />
                                <span class="truncate">{{
                                    CATEGORY_ELEMENT_LABELS[el]
                                }}</span>
                            </button>
                            <button
                                type="button"
                                class="tc-lock-btn"
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
                                <Lock
                                    v-if="
                                        isElementLocked(
                                            `category-${activeCategory.id}:${el}`,
                                        )
                                    "
                                    class="h-3 w-3"
                                />
                                <LockOpen v-else class="h-3 w-3" />
                            </button>
                        </li>
                    </ul>
                </template>

                <template v-if="activeCategory && visibleItems.length">
                    <h3 class="tc-sidebar-heading">
                        Platillos
                        <span
                            v-if="saving"
                            class="ml-1 font-normal text-[var(--tc-blue)] normal-case"
                        >
                            guardando…
                        </span>
                    </h3>
                    <ul
                        :ref="(el) => bindReorderZone(el as HTMLElement)"
                        class="space-y-0.5"
                    >
                        <li
                            v-for="item in visibleItems"
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
                                    <GripVertical class="h-3.5 w-3.5" />
                                </button>
                                <button
                                    type="button"
                                    class="flex-1 truncate text-left text-gray-700"
                                    @click="toggleExpanded(item.id)"
                                >
                                    <ChevronRight
                                        class="mr-0.5 inline h-3 w-3 transition-transform"
                                        :class="{
                                            'rotate-90': expandedItems.has(
                                                item.id,
                                            ),
                                        }"
                                    />
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
                                        class="tc-element-btn"
                                        :class="{
                                            'tc-element-btn--active':
                                                selectedKey ===
                                                `item-${item.id}:${el}`,
                                        }"
                                        @click="
                                            onSelectFromSidebar(
                                                `item-${item.id}:${el}`,
                                            )
                                        "
                                    >
                                        <component
                                            :is="iconForElement(el)"
                                            class="h-3.5 w-3.5 shrink-0 opacity-60"
                                        />
                                        <span class="truncate">{{
                                            ITEM_ELEMENT_LABELS[el]
                                        }}</span>
                                    </button>
                                    <button
                                        type="button"
                                        class="tc-lock-btn"
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
                                        <Lock
                                            v-if="
                                                isElementLocked(
                                                    `item-${item.id}:${el}`,
                                                )
                                            "
                                            class="h-3 w-3"
                                        />
                                        <LockOpen v-else class="h-3 w-3" />
                                    </button>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </template>

                <template v-if="activeCategory">
                    <h3 class="tc-sidebar-heading">
                        <Sparkles class="mr-1 inline h-3 w-3" />Adornos
                        <span
                            v-if="decorationsSaving"
                            class="ml-1 font-normal text-[var(--tc-blue)] normal-case"
                            >guardando…</span
                        >
                    </h3>
                    <ul
                        :ref="(el) => bindDecorationZone(el as HTMLElement)"
                        class="mb-2 space-y-0.5"
                    >
                        <li
                            v-for="decoration in activeCategory.decorations ??
                            []"
                            :key="decoration.id"
                            data-drag-row
                            class="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs"
                            :class="{
                                'opacity-40':
                                    draggingDecoration?.item.id ===
                                    decoration.id,
                                'opacity-50': !decoration.is_active,
                            }"
                        >
                            <button
                                type="button"
                                class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                aria-label="Arrastrar para reordenar"
                                @pointerdown="
                                    onDecorationHandleDown(decoration, $event)
                                "
                            >
                                <GripVertical class="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                class="tc-element-btn flex-1"
                                :class="{
                                    'tc-element-btn--active':
                                        selectedKey ===
                                        `decoration-${decoration.id}:image`,
                                }"
                                @click="selectDecoration(decoration.id)"
                            >
                                <ImageIcon
                                    class="h-3.5 w-3.5 shrink-0 opacity-60"
                                />
                                <span class="truncate">{{
                                    decoration.name
                                }}</span>
                            </button>
                            <button
                                type="button"
                                class="tc-lock-btn"
                                :aria-label="
                                    decoration.is_active
                                        ? 'Ocultar adorno'
                                        : 'Mostrar adorno'
                                "
                                title="Mostrar/ocultar"
                                @click="toggleDecorationActive(decoration)"
                            >
                                <Eye
                                    v-if="decoration.is_active"
                                    class="h-3 w-3"
                                />
                                <EyeOff v-else class="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                class="tc-lock-btn"
                                aria-label="Duplicar adorno"
                                title="Duplicar"
                                @click="duplicateDecorationAction(decoration)"
                            >
                                <Copy class="h-3 w-3" />
                            </button>
                            <button
                                type="button"
                                class="tc-lock-btn"
                                aria-label="Eliminar adorno"
                                title="Eliminar"
                                @click="deleteDecorationAction(decoration)"
                            >
                                <Trash2 class="h-3 w-3" />
                            </button>
                        </li>
                        <li
                            v-if="!(activeCategory.decorations ?? []).length"
                            class="px-2 py-1 text-xs text-gray-400"
                        >
                            Esta sección todavía no tiene adornos.
                        </li>
                    </ul>
                    <button
                        type="button"
                        class="tc-btn-secondary w-full text-xs"
                        @click="addDecorationOpen = true"
                    >
                        <Plus class="mr-1 inline h-3.5 w-3.5" />Agregar adorno
                    </button>
                </template>
            </aside>

            <!-- Centro: iframe con el MISMO Public/Menu.vue, a tamaño real de dispositivo -->
            <div class="tc-admin-card tc-editor-canvas-wrap">
                <div class="tc-editor-canvas-viewport">
                    <div
                        v-if="!previewReady"
                        class="tc-editor-skeleton"
                        :style="{
                            width: activeDevice.width * scale + 'px',
                            height: activeDevice.height * scale + 'px',
                        }"
                    >
                        <LoaderCircle
                            class="h-6 w-6 animate-spin text-gray-300"
                        />
                    </div>
                    <div
                        class="tc-editor-canvas-box"
                        :style="{
                            width: activeDevice.width * scale + 'px',
                            height: activeDevice.height * scale + 'px',
                            visibility: previewReady ? 'visible' : 'hidden',
                        }"
                    >
                        <div
                            class="tc-editor-canvas-scaled"
                            :style="{
                                width: activeDevice.width + 'px',
                                height: activeDevice.height + 'px',
                                transform: `scale(${scale})`,
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
                </div>
                <p class="mt-2 text-xs text-gray-400">
                    Estás editando la vista
                    <strong>{{ activeDevice.label }}</strong
                    ><span v-if="selectedDevice === 'desktop'">
                        — {{ activeDevice.width }} px (ancho real de tu
                        ventana)</span
                    >. Haz clic en cualquier elemento del menú para
                    seleccionarlo, arrástralo para moverlo, usa la manija
                    inferior derecha para redimensionar y las flechas del
                    teclado para ajustes finos (Shift = 10px). Si un adorno
                    tapa otro elemento, mantén presionado
                    <strong>Alt</strong> y haz clic para elegir el elemento de
                    abajo. Esta vista previa es el menú público real — lo que
                    ves aquí es exactamente lo que verá el visitante.
                </p>
            </div>

            <!-- Derecha: inspector -->
            <aside class="tc-admin-card tc-editor-inspector">
                <template v-if="!selectedKey || !inspectorConfig">
                    <div class="tc-inspector-empty">
                        <Settings2 class="h-8 w-8 text-gray-200" />
                        <p class="text-sm text-gray-400">
                            Selecciona un elemento en el lienzo o en la lista de
                            la izquierda para editarlo.
                        </p>
                    </div>

                    <div
                        v-if="activeCategory"
                        class="mt-2 space-y-2 border-t border-gray-100 pt-3"
                    >
                        <p class="tc-inspector-label">
                            Alto de la sección — {{ activeDevice.label }}
                        </p>
                        <div class="tc-field">
                            <label class="tc-field-label">Alto (px)</label>
                            <input
                                type="number"
                                class="tc-input"
                                :disabled="sectionHeightForCurrentDevice === null"
                                :value="sectionHeightForCurrentDevice ?? ''"
                                @change="
                                    updateSectionHeight(
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
                                    :checked="sectionHeightForCurrentDevice === null"
                                    @change="
                                        updateSectionHeight(
                                            (
                                                $event.target as HTMLInputElement
                                            ).checked
                                                ? null
                                                : Math.round(
                                                      sectionHeightForCurrentDevice ??
                                                          800,
                                                  ),
                                        )
                                    "
                                />
                                Automático (crece con el contenido)
                            </label>
                        </div>
                    </div>
                </template>

                <template v-else>
                    <h3 class="mb-3 text-sm font-bold text-gray-800">
                        {{ selectedLabel }}
                    </h3>

                    <div class="mb-4 space-y-2.5">
                        <p class="tc-inspector-label">Tamaño del bloque</p>
                        <div class="grid grid-cols-2 gap-2">
                            <div class="tc-field">
                                <label class="tc-field-label"
                                    >Ancho ({{ sizeUnit }})</label
                                >
                                <input
                                    type="number"
                                    class="tc-input"
                                    data-field="width"
                                    :disabled="widthValue === null"
                                    :value="widthValue ?? ''"
                                    @input="
                                        setWidth(
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
                                        :checked="widthValue === null"
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
                                <label class="tc-field-label"
                                    >Alto ({{ sizeUnit }})</label
                                >
                                <input
                                    type="number"
                                    class="tc-input"
                                    data-field="height"
                                    :disabled="heightValue === null"
                                    :value="heightValue ?? ''"
                                    @input="
                                        setHeight(
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
                                        :checked="heightValue === null"
                                        @change="
                                            toggleAutoHeight(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).checked,
                                            )
                                        "
                                    />
                                    Proporcional
                                </label>
                            </div>
                        </div>

                        <p class="tc-inspector-label pt-1">Posición y capa</p>
                        <div class="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="centerHorizontally"
                            >
                                <AlignHorizontalJustifyCenter
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Centrar H
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="centerVertically"
                            >
                                <AlignVerticalJustifyCenter
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Centrar V
                            </button>
                            <button
                                v-if="isSelectedOffCanvas"
                                type="button"
                                class="tc-btn-secondary text-xs tc-badge-pink"
                                @click="bringIntoView"
                            >
                                <ArrowUpToLine
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Traer a la vista
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="bringToFront"
                            >
                                <ArrowUpToLine
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Al frente
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="sendToBack"
                            >
                                <ArrowDownToLine
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Al fondo
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :class="{
                                    'tc-badge-pink': inspectorConfig.locked,
                                }"
                                @click="toggleLock"
                            >
                                <Lock
                                    v-if="inspectorConfig.locked"
                                    class="mr-1 inline h-3.5 w-3.5"
                                />
                                <LockOpen
                                    v-else
                                    class="mr-1 inline h-3.5 w-3.5"
                                />
                                {{
                                    inspectorConfig.locked
                                        ? 'Bloqueado'
                                        : 'Bloquear'
                                }}
                            </button>
                        </div>

                        <label
                            class="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500"
                        >
                            <input
                                type="checkbox"
                                :checked="!!inspectorConfig.hidden"
                                @change="
                                    updateInspectorField(
                                        'hidden',
                                        ($event.target as HTMLInputElement)
                                            .checked,
                                    )
                                "
                            />
                            Ocultar solo en
                            {{ activeDevice.label.toLowerCase() }}
                        </label>

                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :disabled="!selectedHasOwnConfig"
                                @click="restoreCurrentView"
                            >
                                <RotateCcw
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Restaurar
                                {{ activeDevice.label.toLowerCase() }}
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="restoreAllViews"
                            >
                                <RotateCcw
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Restaurar las tres vistas
                            </button>
                        </div>
                    </div>

                    <div
                        v-if="selectedKind === 'text'"
                        class="mb-4 space-y-2.5 border-t border-gray-100 pt-3"
                    >
                        <p class="tc-inspector-label">Texto</p>
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
                        class="mb-4 space-y-2.5 border-t border-gray-100 pt-3"
                    >
                        <p class="tc-inspector-label">
                            Imagen dentro del bloque
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
                                label="Escala interna"
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
                        <button
                            type="button"
                            class="tc-btn-secondary text-xs"
                            @click="restoreImageAdjustments"
                        >
                            <RotateCcw
                                class="mr-1 inline h-3.5 w-3.5"
                            />Restaurar imagen
                        </button>
                    </div>

                    <div
                        v-if="selectedDecoration"
                        class="mb-4 space-y-2.5 border-t border-gray-100 pt-3"
                    >
                        <p class="tc-inspector-label">Adorno</p>
                        <TcInput
                            label="Nombre descriptivo"
                            :model-value="selectedDecoration.name"
                            @update:model-value="
                                renameSelectedDecoration($event as string)
                            "
                        />
                        <button
                            type="button"
                            class="tc-btn-secondary w-full text-xs"
                            @click="replaceDecorationImageOpen = true"
                        >
                            <ImageIcon
                                class="mr-1 inline h-3.5 w-3.5"
                            />Reemplazar imagen
                        </button>
                        <div class="grid grid-cols-2 gap-2">
                            <TcInput
                                label="Opacidad (0-1)"
                                type="number"
                                min="0"
                                max="1"
                                step="0.05"
                                :model-value="inspectorConfig.opacity ?? 1"
                                @update:model-value="
                                    updateInspectorField(
                                        'opacity',
                                        $event === '' ? null : Number($event),
                                    )
                                "
                            />
                            <TcSelect
                                label="Mover a sección"
                                :options="
                                    categories.map((c) => ({
                                        value: c.id,
                                        label: c.name,
                                    }))
                                "
                                :model-value="
                                    selectedDecoration.menu_category_id
                                "
                                @update:model-value="
                                    moveDecorationToCategory(
                                        selectedDecoration!,
                                        Number($event),
                                    )
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
                                :label="`X (${sizeUnit})`"
                                type="number"
                                data-field="x"
                                :model-value="Math.round(xValue)"
                                @update:model-value="setX(Number($event))"
                            />
                            <TcInput
                                :label="`Y (${sizeUnit})`"
                                type="number"
                                data-field="y"
                                :model-value="Math.round(yValue)"
                                @update:model-value="setY(Number($event))"
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
                            <TcInput
                                v-if="selectedKind === 'text'"
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
                                v-if="selectedKind === 'text'"
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
                        </div>
                    </details>

                    <template v-if="selectedItem">
                        <div class="space-y-3 border-t border-gray-100 pt-3">
                            <p class="tc-inspector-label">Contenido</p>
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
                            <TcSwitch
                                v-if="
                                    selectedItem.ingredients ||
                                    selectedItem.ingredients_hidden
                                "
                                label="Ingredientes visibles"
                                description="Ocultarlos no borra el texto"
                                :model-value="!selectedItem.ingredients_hidden"
                                @update:model-value="
                                    updateQuickField(
                                        'ingredients_hidden',
                                        !$event,
                                    )
                                "
                            />
                            <TcSwitch
                                v-if="
                                    selectedItem.choice_label ||
                                    selectedItem.choice_label_hidden
                                "
                                label="Etiqueta visible"
                                description="Ocultarla no borra el texto"
                                :model-value="!selectedItem.choice_label_hidden"
                                @update:model-value="
                                    updateQuickField(
                                        'choice_label_hidden',
                                        !$event,
                                    )
                                "
                            />
                        </div>
                    </template>
                </template>
            </aside>
        </div>
    </div>

    <TcMediaLibraryModal
        :open="addDecorationOpen"
        title="Agregar adorno — elige o sube una imagen"
        @close="addDecorationOpen = false"
        @picked="onDecorationPicked"
    />

    <TcMediaLibraryModal
        :open="replaceDecorationImageOpen"
        title="Reemplazar imagen del adorno — elige o sube una imagen"
        @close="replaceDecorationImageOpen = false"
        @picked="onDecorationImageReplaced"
    />
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

.tc-editor-canvas-box {
    flex-shrink: 0;
    overflow: hidden;
}

.tc-editor-canvas-scaled {
    transform-origin: top left;
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
