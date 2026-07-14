<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { GripVertical, Pencil, Search, Tag, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';
import StatusBadge from '@/components/admin/StatusBadge.vue';
import { useDragSort } from '@/composables/useDragSort';

interface CategoryRow {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    icon: string | null;
    color: string | null;
    layout: string;
    sort_order: number;
    is_active: boolean;
    items_count: number;
}

const props = defineProps<{
    categories: CategoryRow[];
}>();

const confirmDelete = ref<number | null>(null);
const search = ref('');
const filterActive = ref<'all' | 'active' | 'inactive'>('all');
const list = ref<CategoryRow[]>([...props.categories]);
const listEl = ref<HTMLElement>();

const filtered = computed(() => {
    let items = list.value;
    const q = search.value.trim().toLowerCase();

    if (q) {
        items = items.filter(
            (c) => c.name.toLowerCase().includes(q) || c.slug.includes(q),
        );
    }

    if (filterActive.value === 'active') {
        items = items.filter((c) => c.is_active);
    }

    if (filterActive.value === 'inactive') {
        items = items.filter((c) => !c.is_active);
    }

    return items;
});

const isFiltering = computed(
    () => search.value.trim() !== '' || filterActive.value !== 'all',
);

const { registerZone, start, dragging, saving } = useDragSort<CategoryRow>(
    (zones) => {
        const ordered = zones.main ?? list.value;
        list.value = ordered;

        return new Promise((resolve, reject) => {
            router.post(
                '/admin/categories/reorder',
                {
                    categories: ordered.map((c, idx) => ({
                        id: c.id,
                        sort_order: idx + 1,
                    })),
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => resolve(undefined),
                    onError: (errors) => reject(errors),
                },
            );
        });
    },
);

function bindZone(el: HTMLElement | null) {
    if (el) {
        listEl.value = el;
        registerZone('main', list.value, el);
    }
}

function onHandleDown(cat: CategoryRow, e: PointerEvent) {
    if (isFiltering.value) {
        return;
    }

    start(cat, 'main', e);
}

function deleteCategory(id: number) {
    router.delete(`/admin/categories/${id}`, {
        onSuccess: () => {
            confirmDelete.value = null;
            list.value = list.value.filter((c) => c.id !== id);
        },
    });
}
</script>

<template>
    <Head title="Categorías" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            title="Categorías"
            description="Organiza el menú por secciones"
        >
            <template #label>Menú</template>
            <template #actions>
                <Can permission="menu.update">
                    <Link href="/admin/menu-editor" class="tc-btn-secondary">
                        Editor visual del menú
                    </Link>
                </Can>
                <Can permission="categories.create">
                    <Link
                        href="/admin/categories/create"
                        class="tc-btn-primary"
                    >
                        <span class="text-base leading-none font-bold">+</span>
                        Nueva categoría
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Toolbar -->
        <div class="tc-toolbar">
            <div class="tc-toolbar-search flex-1">
                <Search class="h-3.5 w-3.5 flex-shrink-0" />
                <input v-model="search" placeholder="Buscar categoría…" />
            </div>
            <select v-model="filterActive" class="tc-toolbar-select">
                <option value="all">Todos los estados</option>
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
            </select>
            <span
                v-if="saving"
                class="flex items-center gap-1 text-xs text-[var(--tc-blue)]"
                >Guardando orden…</span
            >
            <span
                v-else-if="isFiltering && filtered.length !== list.length"
                class="text-xs text-gray-400"
            >
                {{ filtered.length }} de {{ list.length }}
            </span>
        </div>

        <p v-if="isFiltering" class="-mt-3 text-xs text-amber-600">
            Quita los filtros de búsqueda para poder reordenar las categorías
            arrastrándolas.
        </p>

        <!-- Table -->
        <div class="tc-admin-table-wrap">
            <table class="tc-admin-table">
                <thead>
                    <tr>
                        <th class="w-8"></th>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th class="hidden sm:table-cell">Plantilla</th>
                        <th>Platillos</th>
                        <th>Estado</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody :ref="(el) => bindZone(el as HTMLElement)">
                    <template v-if="filtered.length > 0">
                        <tr
                            v-for="cat in filtered"
                            :key="cat.id"
                            data-drag-row
                            :class="{
                                'opacity-40': dragging?.item.id === cat.id,
                            }"
                        >
                            <td>
                                <button
                                    v-if="!isFiltering"
                                    type="button"
                                    class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                    aria-label="Arrastrar para reordenar"
                                    @pointerdown="onHandleDown(cat, $event)"
                                >
                                    <GripVertical class="h-4 w-4" />
                                </button>
                            </td>
                            <td>
                                <div
                                    class="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-[#f0e8d8] bg-gray-100"
                                >
                                    <img
                                        v-if="cat.image_url"
                                        :src="cat.image_url"
                                        :alt="cat.name"
                                        class="h-full w-full object-cover"
                                    />
                                    <div
                                        v-else
                                        class="flex h-full w-full items-center justify-center text-gray-300"
                                    >
                                        <Tag class="h-5 w-5" />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <p class="font-semibold text-gray-900">
                                    {{ cat.name }}
                                </p>
                                <p class="text-xs text-gray-400">
                                    {{ cat.slug }}
                                </p>
                            </td>
                            <td class="hidden sm:table-cell">
                                <span
                                    class="tc-badge tc-badge-blue text-[10px]"
                                    >{{ cat.layout }}</span
                                >
                            </td>
                            <td>
                                <span
                                    class="tc-badge"
                                    :class="
                                        cat.items_count > 0
                                            ? 'tc-badge-blue'
                                            : 'tc-badge-gray'
                                    "
                                >
                                    {{ cat.items_count }} platillo{{
                                        cat.items_count !== 1 ? 's' : ''
                                    }}
                                </span>
                            </td>
                            <td><StatusBadge :active="cat.is_active" /></td>
                            <td class="text-right">
                                <div
                                    class="flex items-center justify-end gap-1"
                                >
                                    <Can permission="categories.update">
                                        <Link
                                            :href="`/admin/categories/${cat.id}/edit`"
                                            class="tc-btn-edit-sm"
                                        >
                                            <Pencil class="h-3 w-3" /> Editar
                                        </Link>
                                    </Can>
                                    <Can permission="categories.delete">
                                        <button
                                            class="tc-btn-danger-sm"
                                            @click="confirmDelete = cat.id"
                                        >
                                            <Trash2 class="h-3 w-3" /> Eliminar
                                        </button>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="7" class="p-0">
                            <AdminEmptyState
                                :title="
                                    search ? 'Sin resultados' : 'Sin categorías'
                                "
                                :description="
                                    search
                                        ? `No hay categorías que coincidan con '${search}'.`
                                        : 'Crea la primera categoría para organizar el menú.'
                                "
                            >
                                <template #action>
                                    <Can permission="categories.create">
                                        <Link
                                            href="/admin/categories/create"
                                            class="tc-btn-primary"
                                        >
                                            + Crear categoría
                                        </Link>
                                    </Can>
                                </template>
                            </AdminEmptyState>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <ConfirmDialog
        v-if="confirmDelete !== null"
        title="¿Eliminar categoría?"
        description="Esta acción eliminará la categoría permanentemente. No se puede deshacer."
        confirm-label="Eliminar"
        @confirm="deleteCategory(confirmDelete!)"
        @cancel="confirmDelete = null"
    />
</template>
