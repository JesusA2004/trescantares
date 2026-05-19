<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps<{
    categories: any[]
}>();

const confirmDelete = ref<number | null>(null);

function deleteCategory(id: number) {
    router.delete(`/admin/categories/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Categorías" />

    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold">Categorías del Menú</h1>
            <Link href="/admin/categories/create"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Nueva Categoría
            </Link>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imagen</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platillos</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orden</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr v-for="cat in categories" :key="cat.id" class="hover:bg-gray-50 transition-colors">
                        <td class="px-6 py-3">
                            <div class="w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                                <img v-if="cat.image_url" :src="cat.image_url" :alt="cat.name"
                                    class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                    </svg>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-3">
                            <div>
                                <p class="font-medium text-gray-900">{{ cat.name }}</p>
                                <p class="text-xs text-gray-400">{{ cat.slug }}</p>
                            </div>
                        </td>
                        <td class="px-6 py-3 text-gray-600">{{ cat.items_count ?? 0 }}</td>
                        <td class="px-6 py-3 text-gray-600">{{ cat.sort_order }}</td>
                        <td class="px-6 py-3">
                            <span :class="cat.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
                                class="px-2 py-1 rounded-full text-xs font-medium">
                                {{ cat.is_active ? 'Activo' : 'Inactivo' }}
                            </span>
                        </td>
                        <td class="px-6 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <Link :href="`/admin/categories/${cat.id}/edit`"
                                    class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    Editar
                                </Link>
                                <button @click="confirmDelete = cat.id"
                                    class="text-red-600 hover:text-red-800 text-xs font-medium">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="categories.length === 0">
                        <td colspan="6" class="px-6 py-12 text-center text-gray-400">
                            No hay categorías creadas. <Link href="/admin/categories/create" class="text-blue-600 hover:underline">Crear la primera</Link>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Confirm delete dialog -->
    <Transition name="fade">
        <div v-if="confirmDelete !== null" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <h3 class="font-semibold text-gray-900 text-lg mb-2">¿Eliminar categoría?</h3>
                <p class="text-gray-600 text-sm mb-6">Esta acción también eliminará todos los platillos de esta categoría. No se puede deshacer.</p>
                <div class="flex gap-3 justify-end">
                    <button @click="confirmDelete = null"
                        class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                        Cancelar
                    </button>
                    <button @click="deleteCategory(confirmDelete!)"
                        class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
                        Eliminar
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
