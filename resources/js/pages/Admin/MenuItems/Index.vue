<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Pencil, Search, Star, Trash2, UtensilsCrossed } from 'lucide-vue-next';
import { ref } from 'vue';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';
import StatusBadge from '@/components/admin/StatusBadge.vue';

const props = defineProps<{
    items: {
        id: number;
        name: string;
        slug: string;
        price: string;
        image_url: string | null;
        badge: string | null;
        is_active: boolean;
        is_featured: boolean;
        sort_order: number;
        category: { name: string } | null;
    }[];
    categories: { id: number; name: string }[];
}>();

const confirmDelete = ref<number | null>(null);
const filterCategory = ref('');
const filterSearch = ref('');

let debounceTimer: ReturnType<typeof setTimeout>;

function applyFilters() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        router.get(
            '/admin/menu-items',
            {
                category: filterCategory.value || undefined,
                search: filterSearch.value || undefined,
            },
            { preserveState: true, replace: true },
        );
    }, 300);
}

function deleteItem(id: number) {
    router.delete(`/admin/menu-items/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Platillos" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Platillos del Menú" description="Gestiona los platillos del restaurante">
            <template #label>Menú</template>
            <template #actions>
                <Can permission="menu.create">
                    <Link href="/admin/menu-items/create" class="tc-btn-primary">
                        <span class="text-base leading-none font-bold">+</span>
                        Nuevo platillo
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Toolbar -->
        <div class="tc-toolbar">
            <div class="tc-toolbar-search flex-1">
                <Search class="w-3.5 h-3.5 flex-shrink-0" />
                <input v-model="filterSearch" placeholder="Buscar platillo…" @input="applyFilters" />
            </div>
            <select v-model="filterCategory" class="tc-toolbar-select" @change="applyFilters">
                <option value="">Todas las categorías</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <span class="text-xs text-gray-400 tabular-nums">{{ items.length }} platillo{{ items.length !== 1 ? 's' : '' }}</span>
        </div>

        <!-- Tabla -->
        <div class="tc-admin-table-wrap">
            <table class="tc-admin-table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Platillo</th>
                        <th class="hidden sm:table-cell">Categoría</th>
                        <th>Precio</th>
                        <th>Estado</th>
                        <th class="hidden md:table-cell">Especial</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="items.length > 0">
                        <tr v-for="item in items" :key="item.id">
                            <td>
                                <div class="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 border border-[#f0e8d8] flex-shrink-0">
                                    <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                                        class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                    <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                        <UtensilsCrossed class="w-4 h-4" />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <p class="font-semibold text-gray-900">{{ item.name }}</p>
                                <div class="flex items-center gap-1 mt-0.5">
                                    <span v-if="item.badge" class="tc-badge tc-badge-yellow text-[10px]">{{ item.badge }}</span>
                                    <span class="text-xs text-gray-400">{{ item.slug }}</span>
                                </div>
                            </td>
                            <td class="hidden sm:table-cell text-gray-600 text-sm">
                                {{ item.category?.name ?? '—' }}
                            </td>
                            <td class="font-bold text-gray-800 tabular-nums">${{ Number(item.price).toFixed(2) }}</td>
                            <td><StatusBadge :active="item.is_active" /></td>
                            <td class="hidden md:table-cell">
                                <span v-if="item.is_featured" class="tc-badge tc-badge-yellow flex items-center gap-1 w-fit">
                                    <Star class="w-3 h-3" /> Especial
                                </span>
                            </td>
                            <td class="text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <Can permission="menu.update">
                                        <Link :href="`/admin/menu-items/${item.id}/edit`" class="tc-btn-edit-sm">
                                            <Pencil class="w-3 h-3" /> Editar
                                        </Link>
                                    </Can>
                                    <Can permission="menu.delete">
                                        <button class="tc-btn-danger-sm" @click="confirmDelete = item.id">
                                            <Trash2 class="w-3 h-3" /> Eliminar
                                        </button>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="7" class="p-0">
                            <AdminEmptyState
                                title="Sin platillos"
                                description="Agrega el primer platillo al menú."
                            >
                                <template #action>
                                    <Can permission="menu.create">
                                        <Link href="/admin/menu-items/create" class="tc-btn-primary">+ Nuevo platillo</Link>
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
        title="¿Eliminar platillo?"
        description="Esta acción no se puede deshacer."
        confirm-label="Eliminar"
        @confirm="deleteItem(confirmDelete!)"
        @cancel="confirmDelete = null"
    />
</template>
