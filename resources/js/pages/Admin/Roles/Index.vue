<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { ShieldCheck } from 'lucide-vue-next';
import { ref } from 'vue';
import { permissionLabel } from '@/composables/usePermissionLabels';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';

defineProps<{
    roles: {
        id: number;
        name: string;
        users_count: number;
        permissions: string[];
    }[];
}>();

const confirmDelete = ref<number | null>(null);

const protectedRoles = ['super-admin'];

function deleteRole(id: number) {
    router.delete(`/admin/roles/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}

const roleLabels: Record<string, { label: string; cls: string }> = {
    'super-admin': { label: 'Super Admin', cls: 'tc-badge-purple' },
    admin: { label: 'Admin', cls: 'tc-badge-blue' },
    editor: { label: 'Editor', cls: 'tc-badge-green' },
    rrhh: { label: 'RRHH', cls: 'tc-badge-yellow' },
    viewer: { label: 'Consulta', cls: 'tc-badge-gray' },
};
</script>

<template>
    <Head title="Roles" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Roles" description="Gestiona los roles y sus permisos">
            <template #label>Personas</template>
            <template #actions>
                <Can permission="roles.create">
                    <Link href="/admin/roles/create" class="tc-btn-primary">
                        <span class="text-lg leading-none">+</span>
                        Nuevo rol
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <div class="tc-admin-table-wrap">
            <table class="tc-admin-table">
                <thead>
                    <tr>
                        <th>Rol</th>
                        <th class="hidden sm:table-cell">Usuarios</th>
                        <th class="hidden md:table-cell">Permisos</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="roles.length > 0">
                        <tr v-for="role in roles" :key="role.id">
                            <td>
                                <div class="flex items-center gap-2">
                                    <ShieldCheck class="w-4 h-4 text-[var(--tc-blue)] flex-shrink-0" />
                                    <div>
                                        <p class="font-semibold text-gray-900">{{ role.name }}</p>
                                        <span
                                            class="tc-badge text-[10px]"
                                            :class="roleLabels[role.name]?.cls ?? 'tc-badge-gray'"
                                        >
                                            {{ roleLabels[role.name]?.label ?? role.name }}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            <td class="hidden sm:table-cell">
                                <span class="tc-badge tc-badge-blue">{{ role.users_count }} usuario{{ role.users_count !== 1 ? 's' : '' }}</span>
                            </td>
                            <td class="hidden md:table-cell">
                                <div class="flex flex-wrap gap-1 max-w-xs">
                                    <span
                                        v-for="perm in role.permissions.slice(0, 3)"
                                        :key="perm"
                                        class="tc-badge tc-badge-gray text-[10px]"
                                    >
                                        {{ permissionLabel(perm) }}
                                    </span>
                                    <span v-if="role.permissions.length > 3" class="tc-badge tc-badge-blue text-[10px]">
                                        +{{ role.permissions.length - 3 }} más
                                    </span>
                                </div>
                            </td>
                            <td class="text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <Can permission="roles.update">
                                        <Link
                                            v-if="!protectedRoles.includes(role.name)"
                                            :href="`/admin/roles/${role.id}/edit`"
                                            class="tc-btn-ghost text-[var(--tc-blue)]"
                                        >
                                            Editar
                                        </Link>
                                    </Can>
                                    <Can permission="roles.delete">
                                        <button
                                            v-if="!protectedRoles.includes(role.name) && role.users_count === 0"
                                            class="tc-btn-ghost text-[var(--tc-pink)]"
                                            @click="confirmDelete = role.id"
                                        >
                                            Eliminar
                                        </button>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="4" class="p-0">
                            <AdminEmptyState :icon="ShieldCheck" title="Sin roles" />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>

    <ConfirmDialog
        v-if="confirmDelete !== null"
        title="¿Eliminar rol?"
        description="Esta acción no se puede deshacer. Solo se pueden eliminar roles sin usuarios asignados."
        confirm-label="Eliminar"
        @confirm="deleteRole(confirmDelete!)"
        @cancel="confirmDelete = null"
    />
</template>
