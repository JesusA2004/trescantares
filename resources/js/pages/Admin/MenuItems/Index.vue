<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import {
    GripVertical,
    Pencil,
    Search,
    Star,
    Trash2,
    UtensilsCrossed,
} from 'lucide-vue-next';
import { computed, reactive, ref } from 'vue';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';
import StatusBadge from '@/components/admin/StatusBadge.vue';
import { useDragSort } from '@/composables/useDragSort';

interface ItemRow {
    id: number;
    name: string;
    slug: string;
    price: string;
    image_url: string | null;
    badge: string | null;
    zone: string | null;
    is_active: boolean;
    is_featured: boolean;
    sort_order: number;
    menu_category_id: number;
    category: { name: string } | null;
}

const props = defineProps<{
    items: ItemRow[];
    categories: { id: number; name: string }[];
}>();

const confirmDelete = ref<number | null>(null);
const filterCategory = ref('');
const filterSearch = ref('');

const groups = reactive<Record<string, ItemRow[]>>({});
props.categories.forEach((c) => {
    groups[String(c.id)] = props.items.filter(
        (i) => i.menu_category_id === c.id,
    );
});

const isFiltering = computed(
    () => filterCategory.value !== '' || filterSearch.value.trim() !== '',
);

const visibleCategories = computed(() => {
    if (!filterCategory.value) {
        return props.categories;
    }

    return props.categories.filter(
        (c) => String(c.id) === filterCategory.value,
    );
});

function visibleItems(categoryId: number): ItemRow[] {
    const list = groups[String(categoryId)] ?? [];
    const q = filterSearch.value.trim().toLowerCase();

    if (!q) {
        return list;
    }

    return list.filter((i) => i.name.toLowerCase().includes(q));
}

const totalCount = computed(() =>
    Object.values(groups).reduce((n, l) => n + l.length, 0),
);

const { registerZone, start, dragging, saving } = useDragSort<ItemRow>(
    (zones) => {
        Object.entries(zones).forEach(([key, items]) => {
            groups[key] = items;
        });

        const payload = Object.entries(zones).flatMap(([categoryId, items]) =>
            items.map((item, idx) => ({
                id: item.id,
                menu_category_id: Number(categoryId),
                sort_order: idx + 1,
            })),
        );

        return new Promise((resolve, reject) => {
            router.post(
                '/admin/menu-items/reorder',
                { items: payload },
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

function bindZone(categoryId: number, el: HTMLElement | null) {
    if (el) {
        registerZone(String(categoryId), groups[String(categoryId)], el);
    }
}

function onHandleDown(item: ItemRow, categoryId: number, e: PointerEvent) {
    if (isFiltering.value) {
        return;
    }

    start(item, String(categoryId), e);
}

function deleteItem(id: number) {
    router.delete(`/admin/menu-items/${id}`, {
        onSuccess: () => {
            confirmDelete.value = null;
            Object.keys(groups).forEach((k) => {
                groups[k] = groups[k].filter((i) => i.id !== id);
            });
        },
    });
}
</script>

<template>
    <Head title="Platillos" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            title="Platillos del Menú"
            description="Gestiona los platillos del restaurante"
        >
            <template #label>Menú</template>
            <template #actions>
                <Can permission="menu.create">
                    <Link
                        href="/admin/menu-items/create"
                        class="tc-btn-primary"
                    >
                        <span class="text-base leading-none font-bold">+</span>
                        Nuevo platillo
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Toolbar -->
        <div class="tc-toolbar">
            <div class="tc-toolbar-search flex-1">
                <Search class="h-3.5 w-3.5 flex-shrink-0" />
                <input v-model="filterSearch" placeholder="Buscar platillo…" />
            </div>
            <select v-model="filterCategory" class="tc-toolbar-select">
                <option value="">Todas las categorías</option>
                <option
                    v-for="cat in categories"
                    :key="cat.id"
                    :value="String(cat.id)"
                >
                    {{ cat.name }}
                </option>
            </select>
            <span v-if="saving" class="text-xs text-[var(--tc-blue)]"
                >Guardando orden…</span
            >
            <span v-else class="text-xs text-gray-400 tabular-nums"
                >{{ totalCount }} platillo{{
                    totalCount !== 1 ? 's' : ''
                }}</span
            >
        </div>

        <p v-if="isFiltering" class="-mt-3 text-xs text-amber-600">
            Quita los filtros para poder arrastrar platillos y moverlos entre
            categorías.
        </p>

        <AdminEmptyState
            v-if="totalCount === 0"
            title="Sin platillos"
            description="Agrega el primer platillo al menú."
        >
            <template #action>
                <Can permission="menu.create">
                    <Link href="/admin/menu-items/create" class="tc-btn-primary"
                        >+ Nuevo platillo</Link
                    >
                </Can>
            </template>
        </AdminEmptyState>

        <div v-for="cat in visibleCategories" :key="cat.id" class="space-y-2">
            <h3 class="flex items-center gap-2 text-sm font-bold text-gray-700">
                {{ cat.name }}
                <span class="tc-badge tc-badge-gray text-[10px]">{{
                    visibleItems(cat.id).length
                }}</span>
            </h3>

            <div class="tc-admin-table-wrap">
                <table class="tc-admin-table">
                    <thead>
                        <tr>
                            <th class="w-8"></th>
                            <th>Imagen</th>
                            <th>Platillo</th>
                            <th class="hidden sm:table-cell">Zona</th>
                            <th>Precio</th>
                            <th>Estado</th>
                            <th class="hidden md:table-cell">Especial</th>
                            <th class="text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody :ref="(el) => bindZone(cat.id, el as HTMLElement)">
                        <template v-if="visibleItems(cat.id).length > 0">
                            <tr
                                v-for="item in visibleItems(cat.id)"
                                :key="item.id"
                                data-drag-row
                                :class="{
                                    'opacity-40': dragging?.item.id === item.id,
                                }"
                            >
                                <td>
                                    <button
                                        v-if="!isFiltering"
                                        type="button"
                                        class="cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
                                        aria-label="Arrastrar para reordenar o mover de categoría"
                                        @pointerdown="
                                            onHandleDown(item, cat.id, $event)
                                        "
                                    >
                                        <GripVertical class="h-4 w-4" />
                                    </button>
                                </td>
                                <td>
                                    <div
                                        class="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg border border-[#f0e8d8] bg-gray-100"
                                    >
                                        <img
                                            v-if="item.image_url"
                                            :src="item.image_url"
                                            :alt="item.name"
                                            class="h-full w-full object-cover"
                                        />
                                        <div
                                            v-else
                                            class="flex h-full w-full items-center justify-center text-gray-300"
                                        >
                                            <UtensilsCrossed class="h-4 w-4" />
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <p class="font-semibold text-gray-900">
                                        {{ item.name }}
                                    </p>
                                    <div class="mt-0.5 flex items-center gap-1">
                                        <span
                                            v-if="item.badge"
                                            class="tc-badge tc-badge-yellow text-[10px]"
                                            >{{ item.badge }}</span
                                        >
                                        <span class="text-xs text-gray-400">{{
                                            item.slug
                                        }}</span>
                                    </div>
                                </td>
                                <td
                                    class="hidden text-xs text-gray-500 sm:table-cell"
                                >
                                    {{ item.zone ?? '—' }}
                                </td>
                                <td
                                    class="font-bold text-gray-800 tabular-nums"
                                >
                                    ${{ Number(item.price).toFixed(2) }}
                                </td>
                                <td>
                                    <StatusBadge :active="item.is_active" />
                                </td>
                                <td class="hidden md:table-cell">
                                    <span
                                        v-if="item.is_featured"
                                        class="tc-badge tc-badge-yellow flex w-fit items-center gap-1"
                                    >
                                        <Star class="h-3 w-3" /> Especial
                                    </span>
                                </td>
                                <td class="text-right">
                                    <div
                                        class="flex items-center justify-end gap-1"
                                    >
                                        <Can permission="menu.update">
                                            <Link
                                                :href="`/admin/menu-items/${item.id}/edit`"
                                                class="tc-btn-edit-sm"
                                            >
                                                <Pencil class="h-3 w-3" />
                                                Editar
                                            </Link>
                                        </Can>
                                        <Can permission="menu.delete">
                                            <button
                                                class="tc-btn-danger-sm"
                                                @click="confirmDelete = item.id"
                                            >
                                                <Trash2 class="h-3 w-3" />
                                                Eliminar
                                            </button>
                                        </Can>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <tr v-else>
                            <td
                                colspan="8"
                                class="py-6 text-center text-xs text-gray-400"
                            >
                                Arrastra un platillo aquí para moverlo a esta
                                categoría.
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <ConfirmDialog
        v-if="confirmDelete !== null"
        title="¿Eliminar platillo?"
        description="Esta acción no se puede deshacer."
        confirm-label="Eliminar"
        @confirm="deleteItem(confirmDelete!)"
        @cancel="confirmDelete = null"
    />
</template>
