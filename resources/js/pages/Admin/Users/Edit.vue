<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcInput from '@/components/tc/TcInput.vue';

const props = defineProps<{
    editUser: { id: number; name: string; email: string; roles: string[] };
    roles: { id: number; name: string }[];
}>();

const form = useForm({
    name: props.editUser.name,
    email: props.editUser.email,
    password: '',
    password_confirmation: '',
    roles: [...(props.editUser.roles ?? [])] as string[],
    _method: 'PUT',
});

function toggleRole(name: string) {
    const idx = form.roles.indexOf(name);
    if (idx === -1) form.roles.push(name);
    else form.roles.splice(idx, 1);
}

function submit() {
    form.post(`/admin/users/${props.editUser.id}`);
}

const roleColors: Record<string, string> = {
    'super-admin': 'border-purple-400 bg-purple-50',
    admin: 'border-blue-400 bg-blue-50',
    editor: 'border-green-400 bg-green-50',
    rrhh: 'border-yellow-400 bg-yellow-50',
    viewer: 'border-gray-300 bg-gray-50',
};
const roleActiveColors: Record<string, string> = {
    'super-admin': 'bg-purple-600 border-purple-600 text-white',
    admin: 'bg-[var(--tc-blue)] border-[var(--tc-blue)] text-white',
    editor: 'bg-green-600 border-green-600 text-white',
    rrhh: 'bg-yellow-500 border-yellow-500 text-white',
    viewer: 'bg-gray-500 border-gray-500 text-white',
};
</script>

<template>
    <Head :title="`Editar: ${editUser.name}`" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader :title="`Editar: ${editUser.name}`" description="Modifica los datos del usuario">
            <template #label>Usuarios</template>
            <template #actions>
                <Link href="/admin/users" class="tc-btn-secondary">← Volver</Link>
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit" class="space-y-4">

            <AdminFormSection title="Datos personales">
                <TcInput id="name" v-model="form.name" label="Nombre completo" required :error="form.errors.name" />
                <TcInput id="email" v-model="form.email" type="email" label="Correo electrónico" required :error="form.errors.email" />
            </AdminFormSection>

            <AdminFormSection title="Cambiar contraseña" description="Dejar vacío para no modificarla">
                <TcInput id="password" v-model="form.password" type="password" label="Nueva contraseña" placeholder="Dejar vacío para no cambiar" :error="form.errors.password" />
                <TcInput id="password_confirmation" v-model="form.password_confirmation" type="password" label="Confirmar contraseña" />
            </AdminFormSection>

            <AdminFormSection title="Roles" description="Asigna uno o más roles">
                <div class="flex flex-wrap gap-2">
                    <button
                        v-for="role in roles"
                        :key="role.id"
                        type="button"
                        class="px-3.5 py-1.5 rounded-full text-sm border-2 font-medium transition-all"
                        :class="form.roles.includes(role.name)
                            ? (roleActiveColors[role.name] ?? 'bg-gray-500 border-gray-500 text-white')
                            : (roleColors[role.name] ?? 'border-gray-300 text-gray-600 hover:border-blue-300')"
                        @click="toggleRole(role.name)"
                    >
                        {{ role.name }}
                    </button>
                </div>
                <p v-if="form.errors.roles" class="text-xs text-[var(--tc-pink)]">{{ form.errors.roles }}</p>
            </AdminFormSection>

            <div class="flex gap-3">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Actualizar usuario' }}
                </button>
                <Link href="/admin/users" class="tc-btn-secondary">Cancelar</Link>
            </div>

        </form>
    </div>
</template>
