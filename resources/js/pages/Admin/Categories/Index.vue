<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Pencil, Search, Tag, Trash2 } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';
import StatusBadge from '@/components/admin/StatusBadge.vue';

const props = defineProps<{
    categories: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        image_url: string | null;
        icon: string | null;
        color: string | null;
        sort_order: number;
        is_active: boolean;
        items_count: number;
    }[];
}>();

const confirmDelete = ref<number | null>(null);
const search = ref('');
const filterActive = ref<'all' | 'active' | 'inactive'>('all');

const filtered = computed(() => {
    let list = props.categories;
    const q = search.value.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || c.slug.includes(q));
    if (filterActive.value === 'active') list = list.filter((c) => c.is_active);
    if (filterActive.value === 'inactive') list = list.filter((c) => !c.is_active);
    return list;
});

function deleteCategory(id: number) {
    router.delete(`/admin/categories/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Categorías" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Categorías" description="Organiza el menú por secciones">
            <template #label>Menú</template>
            <template #actions>
                <Can permission="categories.create">
                    <Link href="/admin/categories/create" class="tc-btn-primary">
                        <span class="text-base leading-none font-bold">+</span>
                        Nueva categoría
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Toolbar -->
        <div class="tc-toolbar">
            <div class="tc-toolbar-search flex-1">
                <Search class="w-3.5 h-3.5 flex-shrink-0" />
                <input v-model="search" placeholder="Buscar categoría…" />
            </div>
            <select v-model="filterActive" class="tc-toolbar-select">
                <option value="all">Todos los estados</option>
                <option value="active">Solo activas</option>
                <option value="inactive">Solo inactivas</option>
            </select>
            <span v-if="filtered.length !== categories.length" class="text-xs text-gray-400">
                {{ filtered.length }} de {{ categories.length }}
            </span>
        </div>

        <!-- Table -->
        <div class="tc-admin-table-wrap">
            <table class="tc-admin-table">
                <thead>
                    <tr>
                        <th>Imagen</th>
                        <th>Nombre</th>
                        <th>Platillos</th>
                        <th class="hidden md:table-cell">Orden</th>
                        <th>Estado</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="filtered.length > 0">
                        <tr v-for="cat in filtered" :key="cat.id">
                            <td>
                                <div class="w-11 h-11 rounded-lg overflow-hidden bg-gray-100 border border-[#f0e8d8] flex-shrink-0">
                                    <img v-if="cat.image_url" :src="cat.image_url" :alt="cat.name"
                                        class="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                                    <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                        <Tag class="w-5 h-5" />
                                    </div>
                                </div>
                            </td>
                            <td>
                                <p class="font-semibold text-gray-900">{{ cat.name }}</p>
                                <p class="text-xs text-gray-400">{{ cat.slug }}</p>
                            </td>
                            <td>
                                <span class="tc-badge" :class="cat.items_count > 0 ? 'tc-badge-blue' : 'tc-badge-gray'">
                                    {{ cat.items_count }} platillo{{ cat.items_count !== 1 ? 's' : '' }}
                                </span>
                            </td>
                            <td class="hidden md:table-cell text-gray-500 text-sm tabular-nums">{{ cat.sort_order }}</td>
                            <td><StatusBadge :active="cat.is_active" /></td>
                            <td class="text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <Can permission="categories.update">
                                        <Link :href="`/admin/categories/${cat.id}/edit`" class="tc-btn-edit-sm">
                                            <Pencil class="w-3 h-3" /> Editar
                                        </Link>
                                    </Can>
                                    <Can permission="categories.delete">
                                        <button class="tc-btn-danger-sm" @click="confirmDelete = cat.id">
                                            <Trash2 class="w-3 h-3" /> Eliminar
                                        </button>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="6" class="p-0">
                            <AdminEmptyState
                                :title="search ? 'Sin resultados' : 'Sin categorías'"
                                :description="search ? `No hay categorías que coincidan con '${search}'.` : 'Crea la primera categoría para organizar el menú.'"
                            >
                                <template #action>
                                    <Can permission="categories.create">
                                        <Link href="/admin/categories/create" class="tc-btn-primary">
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
