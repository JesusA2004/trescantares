<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';

defineProps<{ roles: any[] }>();

const form = useForm({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    roles: [] as string[],
});

function toggleRole(name: string) {
    const idx = form.roles.indexOf(name);
    if (idx === -1) form.roles.push(name);
    else form.roles.splice(idx, 1);
}

function submit() {
    form.post('/admin/users');
}
</script>

<template>
    <Head title="Nuevo Usuario" />

    <div class="max-w-2xl space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold">Nuevo Usuario</h1>
            <Link href="/admin/users" class="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        </div>

        <form @submit.prevent="submit" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input v-model="form.name" type="text" required
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p v-if="form.errors.name" class="mt-1 text-xs text-red-600">{{ form.errors.name }}</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input v-model="form.email" type="email" required
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p v-if="form.errors.email" class="mt-1 text-xs text-red-600">{{ form.errors.email }}</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                <input v-model="form.password" type="password" required
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p v-if="form.errors.password" class="mt-1 text-xs text-red-600">{{ form.errors.password }}</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Confirmar Contraseña *</label>
                <input v-model="form.password_confirmation" type="password" required
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="role in roles" :key="role.id" type="button"
                        @click="toggleRole(role.name)"
                        class="px-3 py-1 rounded-full text-sm border-2 transition-all"
                        :class="form.roles.includes(role.name)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300 text-gray-600 hover:border-blue-400'">
                        {{ role.name }}
                    </button>
                </div>
            </div>

            <div class="flex gap-3 pt-2">
                <button type="submit" :disabled="form.processing"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {{ form.processing ? 'Creando...' : 'Crear Usuario' }}
                </button>
                <Link href="/admin/users"
                    class="px-6 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                    Cancelar
                </Link>
            </div>
        </form>
    </div>
</template>
