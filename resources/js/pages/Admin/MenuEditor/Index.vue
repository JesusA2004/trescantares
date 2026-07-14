<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { computed, reactive, ref, watch } from 'vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import { layoutFor } from '@/components/Public/Menu/layoutRegistry';
import {
    categoryVisualFor,
    itemLayoutFor,
} from '@/components/Public/Menu/types';
import type {
    BreakpointLayout,
    CategoryVisualElement,
    MenuBreakpoint,
    MenuCategoryData,
    MenuItemData,
} from '@/components/Public/Menu/types';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import { useAutosave } from '@/composables/useAutosave';
import { useDragSort } from '@/composables/useDragSort';
import { useNotify } from '@/composables/useNotify';
import { patchJson, postJson } from '@/lib/jsonApi';
import { zonesForLayout } from '@/pages/Admin/MenuItems/zones';

const props = defineProps<{
    categories: MenuCategoryData[];
}>();

// Copia local mutable — el editor optimiza la UI aplicando el cambio de
// inmediato y guarda en segundo plano; los datos originales de Inertia no se
// tocan directamente.
const categories = reactive<MenuCategoryData[]>(
    JSON.parse(JSON.stringify(props.categories)),
);

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
    selectedKey.value = null;
}

const viewport = ref<MenuBreakpoint>('mobile');
const zoom = ref(100);

const CANVAS_WIDTH: Record<MenuBreakpoint, number> = {
    mobile: 390,
    tablet: 834,
    desktop: 1440,
};
const PANEL_WIDTH = 880;
const baseScale = computed(() =>
    Math.min(1, PANEL_WIDTH / CANVAS_WIDTH[viewport.value]),
);
const scale = computed(() => baseScale.value * (zoom.value / 100));

/* ---------------------------------------------------------------- */
/* Selección + inspector                                             */
/* ---------------------------------------------------------------- */

const selectedKey = ref<string | null>(null);

const selectedItem = computed<MenuItemData | null>(() => {
    if (!selectedKey.value?.startsWith('item-') || !activeCategory.value) {
        return null;
    }

    const id = Number(selectedKey.value.slice(5));

    return activeCategory.value.items.find((i) => i.id === id) ?? null;
});

const CATEGORY_ELEMENT_LABELS: Record<CategoryVisualElement, string> = {
    title: 'Título',
    subtitle: 'Subtítulo',
    tagline: 'Tagline',
    tagline_image: 'Gráfico decorativo',
    image: 'Imagen de sección',
};

const selectedLabel = computed(() => {
    if (selectedItem.value) {
        return selectedItem.value.name;
    }

    if (selectedKey.value && selectedKey.value in CATEGORY_ELEMENT_LABELS) {
        return CATEGORY_ELEMENT_LABELS[
            selectedKey.value as CategoryVisualElement
        ];
    }

    return selectedKey.value ?? '';
});

function resolveLayout(
    categoryId: number,
    key: string,
    bp: MenuBreakpoint,
): BreakpointLayout {
    const cat = categories.find((c) => c.id === categoryId);

    if (!cat) {
        return { move_x: 0, move_y: 0, width: null, z_index: 1 };
    }

    if (key.startsWith('item-')) {
        const id = Number(key.slice(5));
        const item = cat.items.find((i) => i.id === id);

        return itemLayoutFor({ layout_settings: item?.layout_settings }, bp);
    }

    return categoryVisualFor(cat, key as CategoryVisualElement, bp);
}

function hasCustomLayout(
    categoryId: number,
    key: string,
    bp: MenuBreakpoint,
): boolean {
    const cat = categories.find((c) => c.id === categoryId);

    if (!cat) {
        return false;
    }

    if (key.startsWith('item-')) {
        const id = Number(key.slice(5));
        const item = cat.items.find((i) => i.id === id);

        return !!item?.layout_settings?.[bp];
    }

    return !!cat.visual_settings?.[key as CategoryVisualElement]?.[bp];
}

// Deriva del estado reactivo — se actualiza solo cuando applyLocal muta
// categories, sin necesidad de sincronizarlo a mano en cada handler.
const inspectorLayout = computed<BreakpointLayout | null>(() => {
    if (!selectedKey.value || !activeCategory.value) {
        return null;
    }

    return resolveLayout(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
    );
});

const selectedHasCustomLayout = computed(() => {
    if (!selectedKey.value || !activeCategory.value) {
        return false;
    }

    return hasCustomLayout(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
    );
});

function onSelect(key: string) {
    selectedKey.value = key;
}

/* ---------------------------------------------------------------- */
/* Guardado                                                          */
/* ---------------------------------------------------------------- */

const savingCount = ref(0);
const saveStatus = ref<'idle' | 'saved' | 'error'>('idle');
const lastFailed = ref<{
    categoryId: number;
    key: string;
    bp: MenuBreakpoint;
    layout: BreakpointLayout | null;
} | null>(null);

const statusLabel = computed(() => {
    if (savingCount.value > 0) {
        return 'Guardando…';
    }

    if (saveStatus.value === 'error') {
        return 'Error al guardar';
    }

    if (saveStatus.value === 'saved') {
        return 'Guardado';
    }

    return 'Sin cambios pendientes';
});

function applyLocal(
    categoryId: number,
    key: string,
    bp: MenuBreakpoint,
    layout: BreakpointLayout | null,
) {
    const cat = categories.find((c) => c.id === categoryId);

    if (!cat) {
        return;
    }

    if (key.startsWith('item-')) {
        const id = Number(key.slice(5));
        const item = cat.items.find((i) => i.id === id);

        if (!item) {
            return;
        }

        const settings = { ...(item.layout_settings ?? {}) };

        if (layout) {
            settings[bp] = layout;
        } else {
            delete settings[bp];
        }

        item.layout_settings = Object.keys(settings).length ? settings : null;

        return;
    }

    const vs = { ...(cat.visual_settings ?? {}) };
    const elementSettings = { ...(vs[key as CategoryVisualElement] ?? {}) };

    if (layout) {
        elementSettings[bp] = layout;
    } else {
        delete elementSettings[bp];
    }

    if (Object.keys(elementSettings).length) {
        vs[key as CategoryVisualElement] = elementSettings;
    } else {
        delete vs[key as CategoryVisualElement];
    }

    cat.visual_settings = Object.keys(vs).length ? vs : null;
}

async function persistChange(
    categoryId: number,
    key: string,
    bp: MenuBreakpoint,
    layout: BreakpointLayout | null,
) {
    savingCount.value++;

    try {
        if (key.startsWith('item-')) {
            const id = Number(key.slice(5));
            await patchJson(
                `/admin/menu-editor/items/${id}/layout`,
                layout
                    ? { breakpoint: bp, ...layout }
                    : { breakpoint: bp, clear: true },
            );
        } else {
            await patchJson(
                `/admin/menu-editor/categories/${categoryId}/visual-layout`,
                layout
                    ? { element: key, breakpoint: bp, ...layout }
                    : { element: key, breakpoint: bp, clear: true },
            );
        }

        saveStatus.value = 'saved';
        lastFailed.value = null;
    } catch {
        saveStatus.value = 'error';
        lastFailed.value = { categoryId, key, bp, layout };
        useNotify().error(
            'No se pudo guardar el cambio. Se conservó localmente — puedes reintentar.',
        );
    } finally {
        savingCount.value--;
    }
}

function retry() {
    if (!lastFailed.value) {
        return;
    }

    const { categoryId, key, bp, layout } = lastFailed.value;
    void persistChange(categoryId, key, bp, layout);
}

/* ---------------------------------------------------------------- */
/* Deshacer / rehacer (solo esta sesión)                              */
/* ---------------------------------------------------------------- */

interface UndoAction {
    categoryId: number;
    key: string;
    bp: MenuBreakpoint;
    prev: BreakpointLayout | null;
    next: BreakpointLayout | null;
}

const undoStack = ref<UndoAction[]>([]);
const redoStack = ref<UndoAction[]>([]);

function recordAction(action: UndoAction) {
    undoStack.value.push(action);

    if (undoStack.value.length > 50) {
        undoStack.value.shift();
    }

    redoStack.value = [];
}

function applyAndSync(action: UndoAction, layout: BreakpointLayout | null) {
    applyLocal(action.categoryId, action.key, action.bp, layout);
    void persistChange(action.categoryId, action.key, action.bp, layout);
}

function undo() {
    const action = undoStack.value.pop();

    if (!action) {
        return;
    }

    redoStack.value.push(action);
    applyAndSync(action, action.prev);
}

function redo() {
    const action = redoStack.value.pop();

    if (!action) {
        return;
    }

    undoStack.value.push(action);
    applyAndSync(action, action.next);
}

function onCommit(key: string, bp: MenuBreakpoint, layout: BreakpointLayout) {
    const cat = activeCategory.value;

    if (!cat) {
        return;
    }

    const prev = hasCustomLayout(cat.id, key, bp)
        ? resolveLayout(cat.id, key, bp)
        : null;
    applyLocal(cat.id, key, bp, layout);
    recordAction({ categoryId: cat.id, key, bp, prev, next: layout });
    void persistChange(cat.id, key, bp, layout);
}

/* ---------------------------------------------------------------- */
/* Inspector: X/Y/ancho/nivel numéricos (debounce)                   */
/* ---------------------------------------------------------------- */

const numericAutosave = useAutosave<{
    categoryId: number;
    key: string;
    bp: MenuBreakpoint;
    layout: BreakpointLayout;
}>(async (payload) => {
    void persistChange(
        payload.categoryId,
        payload.key,
        payload.bp,
        payload.layout,
    );
}, 500);

function updateInspectorField(
    field: keyof BreakpointLayout,
    value: number | null,
) {
    if (!selectedKey.value || !activeCategory.value || !inspectorLayout.value) {
        return;
    }

    const layout: BreakpointLayout = {
        ...inspectorLayout.value,
        [field]: value,
    };
    applyLocal(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
        layout,
    );
    numericAutosave.schedule({
        categoryId: activeCategory.value.id,
        key: selectedKey.value,
        bp: viewport.value,
        layout,
    });
}

function toggleAutoWidth(auto: boolean) {
    if (!inspectorLayout.value) {
        return;
    }

    updateInspectorField('width', auto ? null : 40);
}

function restoreBreakpoint() {
    if (!selectedKey.value || !activeCategory.value) {
        return;
    }

    if (
        !hasCustomLayout(
            activeCategory.value.id,
            selectedKey.value,
            viewport.value,
        )
    ) {
        return;
    }

    const prev = resolveLayout(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
    );

    recordAction({
        categoryId: activeCategory.value.id,
        key: selectedKey.value,
        bp: viewport.value,
        prev,
        next: null,
    });
    applyLocal(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
        null,
    );
    void persistChange(
        activeCategory.value.id,
        selectedKey.value,
        viewport.value,
        null,
    );
}

function copyBreakpoint(from: MenuBreakpoint, to: MenuBreakpoint) {
    if (!selectedKey.value || !activeCategory.value) {
        return;
    }

    const layout = {
        ...resolveLayout(activeCategory.value.id, selectedKey.value, from),
    };
    const prev = hasCustomLayout(activeCategory.value.id, selectedKey.value, to)
        ? resolveLayout(activeCategory.value.id, selectedKey.value, to)
        : null;

    recordAction({
        categoryId: activeCategory.value.id,
        key: selectedKey.value,
        bp: to,
        prev,
        next: layout,
    });
    applyLocal(activeCategory.value.id, selectedKey.value, to, layout);
    void persistChange(activeCategory.value.id, selectedKey.value, to, layout);
}

/* ---------------------------------------------------------------- */
/* Edición rápida de contenido del platillo seleccionado              */
/* ---------------------------------------------------------------- */

const quickAutosave = useAutosave<{
    id: number;
    data: Record<string, unknown>;
}>(async (payload) => {
    await patchJson(
        `/admin/menu-editor/items/${payload.id}/quick`,
        payload.data,
    );
}, 500);

const zoneOptions = computed(() =>
    zonesForLayout(activeCategory.value?.layout),
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

/* ---------------------------------------------------------------- */
/* Reordenar platillos de la sección activa                           */
/* ---------------------------------------------------------------- */

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
        });
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

// El <ul> es el mismo nodo DOM al cambiar de sección (solo cambia su
// contenido vía v-for), así que la ref función no se vuelve a disparar sola
// — hay que re-registrar la zona explícitamente con la categoría activa.
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
</script>

<template>
    <Head title="Editor visual del menú" />

    <div class="tc-admin-page tc-menu-editor space-y-4">
        <AdminPageHeader
            title="Editor visual del menú"
            description="Acomoda platillos, títulos y decorativos directamente sobre el menú real"
        >
            <template #label>Menú</template>
            <template #actions>
                <span
                    class="tc-badge text-[11px]"
                    :class="{
                        'tc-badge-blue':
                            saveStatus !== 'error' && savingCount === 0,
                        'tc-badge-yellow': savingCount > 0,
                        'tc-badge-pink':
                            saveStatus === 'error' && savingCount === 0,
                    }"
                    >{{ statusLabel }}</span
                >
                <button
                    v-if="saveStatus === 'error'"
                    type="button"
                    class="tc-btn-secondary"
                    @click="retry"
                >
                    Reintentar
                </button>
                <Link href="/admin/menu-items" class="tc-btn-secondary"
                    >← Volver</Link
                >
            </template>
        </AdminPageHeader>

        <div class="tc-editor-toolbar tc-admin-card">
            <div
                class="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 dark:bg-white/5"
            >
                <button
                    v-for="bp in [
                        'mobile',
                        'tablet',
                        'desktop',
                    ] as MenuBreakpoint[]"
                    :key="bp"
                    type="button"
                    class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                    :class="
                        viewport === bp
                            ? 'bg-white text-[var(--tc-blue)] shadow-sm dark:bg-[#262626]'
                            : 'text-gray-500'
                    "
                    @click="viewport = bp"
                >
                    {{
                        bp === 'mobile'
                            ? 'Móvil'
                            : bp === 'tablet'
                              ? 'Tablet'
                              : 'Escritorio'
                    }}
                </button>
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
                <label class="text-xs text-gray-500">Zoom</label>
                <input
                    v-model.number="zoom"
                    type="range"
                    min="50"
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
            <!-- Izquierda: secciones + orden -->
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
                            @click="goToIndex(idx)"
                        >
                            {{ cat.name }}
                        </button>
                    </li>
                </ul>

                <template v-if="activeCategory && activeCategory.items.length">
                    <h3
                        class="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase"
                    >
                        Orden de platillos
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
                            class="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs"
                            :class="{
                                'opacity-40': dragging?.item.id === item.id,
                                'bg-blue-50 dark:bg-white/5':
                                    selectedKey === `item-${item.id}`,
                            }"
                        >
                            <button
                                type="button"
                                class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                aria-label="Arrastrar para reordenar"
                                @pointerdown="onReorderHandleDown(item, $event)"
                            >
                                ⠿
                            </button>
                            <button
                                type="button"
                                class="flex-1 truncate text-left text-gray-700 dark:text-white/80"
                                @click="selectedKey = `item-${item.id}`"
                            >
                                {{ item.name }}
                            </button>
                        </li>
                    </ul>
                </template>
            </aside>

            <!-- Centro: lienzo -->
            <div class="tc-admin-card tc-editor-canvas-wrap">
                <div class="tc-editor-canvas-viewport">
                    <div
                        v-if="activeCategory"
                        class="tc-editor-canvas-scaled tc-mp tc-public-layout"
                        :style="{
                            width: CANVAS_WIDTH[viewport] + 'px',
                            transform: `scale(${scale})`,
                        }"
                    >
                        <section v-if="activeCategory.layout === 'portada'">
                            <component
                                :is="layoutFor(activeCategory)"
                                :category="activeCategory"
                                :breakpoint="viewport"
                                editable
                                :selected-key="selectedKey"
                                :scale-factor="scale"
                                @select="onSelect"
                                @commit="onCommit"
                            />
                        </section>
                        <section v-else class="tc-mp-page">
                            <component
                                :is="layoutFor(activeCategory)"
                                :category="activeCategory"
                                :breakpoint="viewport"
                                editable
                                :selected-key="selectedKey"
                                :scale-factor="scale"
                                @select="onSelect"
                                @commit="onCommit"
                            />
                        </section>
                    </div>
                </div>
                <p class="mt-2 text-xs text-gray-400">
                    Haz clic en un platillo o título para seleccionarlo,
                    arrástralo para moverlo, usa la manija inferior derecha para
                    cambiar su tamaño y las flechas del teclado para ajustes
                    finos (Shift = 10 unidades).
                </p>
            </div>

            <!-- Derecha: inspector -->
            <aside class="tc-admin-card tc-editor-inspector">
                <template v-if="!selectedKey">
                    <p class="text-sm text-gray-400">
                        Selecciona un platillo o título en el lienzo para
                        editarlo.
                    </p>
                </template>

                <template v-else-if="inspectorLayout">
                    <h3
                        class="mb-3 text-sm font-bold text-gray-800 dark:text-white"
                    >
                        {{ selectedLabel }}
                    </h3>

                    <div class="mb-4 space-y-2.5">
                        <p
                            class="text-xs font-semibold tracking-wide text-gray-400 uppercase"
                        >
                            Posición y tamaño ({{ viewport }})
                        </p>
                        <div class="grid grid-cols-2 gap-2">
                            <TcInput
                                label="Mover X (px)"
                                type="number"
                                :model-value="
                                    Math.round(inspectorLayout.move_x)
                                "
                                @update:model-value="
                                    updateInspectorField(
                                        'move_x',
                                        Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Mover Y (px)"
                                type="number"
                                :model-value="
                                    Math.round(inspectorLayout.move_y)
                                "
                                @update:model-value="
                                    updateInspectorField(
                                        'move_y',
                                        Number($event),
                                    )
                                "
                            />
                            <TcInput
                                label="Nivel (z-index)"
                                type="number"
                                :model-value="inspectorLayout.z_index"
                                @update:model-value="
                                    updateInspectorField(
                                        'z_index',
                                        Number($event),
                                    )
                                "
                            />
                            <div class="tc-field">
                                <label class="tc-field-label">Ancho (%)</label>
                                <input
                                    type="number"
                                    class="tc-input"
                                    :disabled="inspectorLayout.width === null"
                                    :value="inspectorLayout.width ?? ''"
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
                                            inspectorLayout.width === null
                                        "
                                        @change="
                                            toggleAutoWidth(
                                                (
                                                    $event.target as HTMLInputElement
                                                ).checked,
                                            )
                                        "
                                    />
                                    Automático (tamaño original)
                                </label>
                            </div>
                        </div>

                        <div class="flex flex-wrap gap-1.5 pt-1">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                :disabled="!selectedHasCustomLayout"
                                @click="restoreBreakpoint"
                            >
                                Restaurar breakpoint
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="copyBreakpoint('mobile', 'tablet')"
                            >
                                Copiar móvil → tablet
                            </button>
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="copyBreakpoint('tablet', 'desktop')"
                            >
                                Copiar tablet → escritorio
                            </button>
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
    grid-template-columns: 220px minmax(0, 1fr) 300px;
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
