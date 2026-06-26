<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3';
import { Pencil, Search, Trash2, UserCircle, Users } from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AdminEmptyState from '@/components/admin/AdminEmptyState.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';
import ConfirmDialog from '@/components/admin/ConfirmDialog.vue';

const props = defineProps<{
    users: {
        id: number;
        name: string;
        email: string;
        roles: string[];
        created_at: string;
    }[];
}>();

const confirmDelete = ref<number | null>(null);
const search = ref('');
const filterRole = ref('all');

const allRoles = computed(() => {
    const set = new Set<string>();
    props.users.forEach((u) => u.roles.forEach((r) => set.add(r)));
    return Array.from(set).sort();
});

const filtered = computed(() => {
    let list = props.users;
    const q = search.value.trim().toLowerCase();
    if (q) list = list.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    if (filterRole.value !== 'all') list = list.filter((u) => u.roles.includes(filterRole.value));
    return list;
});

const roleColors: Record<string, string> = {
    'super-admin': 'tc-badge-purple',
    admin: 'tc-badge-blue',
    editor: 'tc-badge-green',
    rrhh: 'tc-badge-yellow',
    viewer: 'tc-badge-gray',
};
function roleClass(role: string) { return roleColors[role] ?? 'tc-badge-gray'; }

function deleteUser(id: number) {
    router.delete(`/admin/users/${id}`, {
        onSuccess: () => { confirmDelete.value = null; },
    });
}
</script>

<template>
    <Head title="Usuarios" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Usuarios" description="Administra los usuarios del sistema">
            <template #label>Personas</template>
            <template #actions>
                <Can permission="users.create">
                    <Link href="/admin/users/create" class="tc-btn-primary">
                        <span class="text-base leading-none font-bold">+</span>
                        Nuevo usuario
                    </Link>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Toolbar -->
        <div class="tc-toolbar">
            <div class="tc-toolbar-search flex-1">
                <Search class="w-3.5 h-3.5 flex-shrink-0" />
                <input v-model="search" placeholder="Buscar por nombre o correo…" />
            </div>
            <select v-model="filterRole" class="tc-toolbar-select">
                <option value="all">Todos los roles</option>
                <option v-for="r in allRoles" :key="r" :value="r">{{ r }}</option>
            </select>
            <span v-if="filtered.length !== users.length" class="text-xs text-gray-400">
                {{ filtered.length }} de {{ users.length }}
            </span>
        </div>

        <div class="tc-admin-table-wrap">
            <table class="tc-admin-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th class="hidden sm:table-cell">Correo</th>
                        <th>Roles</th>
                        <th class="hidden md:table-cell">Registro</th>
                        <th class="text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-if="filtered.length > 0">
                        <tr v-for="user in filtered" :key="user.id">
                            <td>
                                <div class="flex items-center gap-3">
                                    <div class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                                        style="background: linear-gradient(135deg, var(--tc-blue), var(--tc-pink))">
                                        {{ user.name.charAt(0).toUpperCase() }}
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900 text-sm">{{ user.name }}</p>
                                        <p class="text-xs text-gray-400 sm:hidden">{{ user.email }}</p>
                                    </div>
                                </div>
                            </td>
                            <td class="hidden sm:table-cell text-gray-600 text-sm">{{ user.email }}</td>
                            <td>
                                <div class="flex flex-wrap gap-1">
                                    <span v-for="role in user.roles" :key="role"
                                        class="tc-badge" :class="roleClass(role)">
                                        {{ role }}
                                    </span>
                                    <span v-if="user.roles.length === 0" class="tc-badge tc-badge-gray">Sin rol</span>
                                </div>
                            </td>
                            <td class="hidden md:table-cell text-gray-400 text-xs tabular-nums">{{ user.created_at }}</td>
                            <td class="text-right">
                                <div class="flex items-center justify-end gap-1">
                                    <Can permission="users.update">
                                        <Link :href="`/admin/users/${user.id}/edit`" class="tc-btn-edit-sm">
                                            <Pencil class="w-3 h-3" /> Editar
                                        </Link>
                                    </Can>
                                    <Can permission="users.delete">
                                        <button class="tc-btn-danger-sm" @click="confirmDelete = user.id">
                                            <Trash2 class="w-3 h-3" /> Eliminar
                                        </button>
                                    </Can>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="5" class="p-0">
                            <AdminEmptyState
                                :icon="search ? UserCircle : Users"
                                :title="search ? 'Sin resultados' : 'Sin usuarios'"
                                :description="search ? `No hay usuarios que coincidan con '${search}'.` : 'No hay usuarios registrados.'"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

    </div>

    <ConfirmDialog
        v-if="confirmDelete !== null"
        title="¿Eliminar usuario?"
        description="Esta acción no se puede deshacer."
        confirm-label="Eliminar"
        @confirm="deleteUser(confirmDelete!)"
        @cancel="confirmDelete = null"
    />
</template>
