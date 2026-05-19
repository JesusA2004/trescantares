<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ref } from 'vue';

defineProps<{ users: any[] }>();
const confirmDelete = ref<number | null>(null);

function deleteUser(id: number) {
    router.delete(`/admin/users/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Usuarios" />

    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold">Usuarios</h1>
            <Link href="/admin/users/create"
                class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                + Nuevo Usuario
            </Link>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                    <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50">
                        <td class="px-6 py-3 font-medium text-gray-900">{{ user.name }}</td>
                        <td class="px-6 py-3 text-gray-600">{{ user.email }}</td>
                        <td class="px-6 py-3">
                            <div class="flex flex-wrap gap-1">
                                <span v-for="role in user.roles" :key="role"
                                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                                    :class="{
                                        'bg-purple-100 text-purple-700': role === 'super-admin',
                                        'bg-blue-100 text-blue-700': role === 'admin',
                                        'bg-green-100 text-green-700': role === 'editor',
                                        'bg-gray-100 text-gray-700': role === 'viewer',
                                    }">
                                    {{ role }}
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <Link :href="`/admin/users/${user.id}/edit`"
                                    class="text-blue-600 hover:text-blue-800 text-xs font-medium">
                                    Editar
                                </Link>
                                <button @click="confirmDelete = user.id"
                                    class="text-red-600 hover:text-red-800 text-xs font-medium">
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr v-if="users.length === 0">
                        <td colspan="4" class="px-6 py-12 text-center text-gray-400">No hay usuarios.</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <Transition name="fade">
        <div v-if="confirmDelete !== null" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div class="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
                <h3 class="font-semibold text-gray-900 text-lg mb-2">¿Eliminar usuario?</h3>
                <p class="text-gray-600 text-sm mb-6">Esta acción no se puede deshacer.</p>
                <div class="flex gap-3 justify-end">
                    <button @click="confirmDelete = null" class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
                    <button @click="deleteUser(confirmDelete!)" class="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Eliminar</button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
