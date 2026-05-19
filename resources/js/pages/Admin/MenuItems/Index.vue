<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps<{
    items: any[]
    categories: any[]
}>();

const confirmDelete = ref<number | null>(null);
const filterCategory = ref('');
const filterSearch = ref('');

function applyFilters() {
    router.get('/admin/menu-items', {
        category: filterCategory.value || undefined,
        search: filterSearch.value || undefined,
    }, { preserveState: true, replace: true });
}

function deleteItem(id: number) {
    router.delete(`/admin/menu-items/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Platillos" />

    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold">Platillos del Menú</h1>
            <Link href="/admin/menu-items/create"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Nuevo Platillo
            </Link>
        </div>

        <!-- Filtros -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap gap-3">
            <select v-model="filterCategory" @change="applyFilters"
                class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Todas las categorías</option>
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
            <input v-model="filterSearch" @input="applyFilters" type="text" placeholder="Buscar platillo..."
                class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none flex-1 min-w-40" />
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Imagen</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destacado</th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr v-for="item in items" :key="item.id" class="hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-3">
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                                    class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                            </div>
                        </td>
                        <td class="px-4 py-3">
                            <p class="font-medium text-gray-900">{{ item.name }}</p>
                            <p class="text-xs text-gray-400">{{ item.slug }}</p>
                        </td>
                        <td class="px-4 py-3 text-gray-600">{{ item.category?.name ?? '—' }}</td>
                        <td class="px-4 py-3 font-semibold text-gray-900">${{ Number(item.price).toFixed(2) }}</td>
                        <td class="px-4 py-3">
                            <span :class="item.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                                class="px-2 py-1 rounded-full text-xs font-medium">
                                {{ item.is_active ? 'Activo' : 'Inactivo' }}
                            </span>
                        </td>
                        <td class="px-4 py-3">
                            <span v-if="item.is_featured" class="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                Especial
                            </span>
                        </td>
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <Link :href="`/admin/menu-items/${item.id}/edit`"
                                    class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    Editar
                                </Link>
                                <button @click="confirmDelete = item.id"
                                    class="text-red-600 hover:text-red-800 text-xs font-medium">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="items.length === 0">
                        <td colspan="7" class="px-6 py-12 text-center text-gray-400">
                            No hay platillos. <Link href="/admin/menu-items/create" class="text-blue-600 hover:underline">Crear el primero</Link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Transition name="fade">
        <div v-if="confirmDelete !== null" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <h3 class="font-semibold text-gray-900 text-lg mb-2">¿Eliminar platillo?</h3>
                <p class="text-gray-600 text-sm mb-6">Esta acción no se puede deshacer.</p>
                <div class="flex gap-3 justify-end">
                    <button @click="confirmDelete = null" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button @click="deleteItem(confirmDelete!)" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
