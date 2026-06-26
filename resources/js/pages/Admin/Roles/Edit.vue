<script setup lang="ts">
import { computed, ref } from 'vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { CheckSquare, Search, ShieldCheck, Square } from 'lucide-vue-next';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcInput from '@/components/tc/TcInput.vue';
import { permissionGroupLabel, permissionLabel } from '@/composables/usePermissionLabels';

const props = defineProps<{
    role: { id: number; name: string; permissions: string[] };
    permissions: { id: number; name: string }[];
    groupedPermissions: Record<string, { id: number; name: string }[]>;
}>();

const form = useForm({
    name: props.role.name,
    permissions: [...props.role.permissions],
    _method: 'PUT',
});

const searchQuery = ref('');

const filteredGroups = computed(() => {
    const q = searchQuery.value.trim().toLowerCase();
    if (!q) return props.groupedPermissions;
    const result: Record<string, typeof props.permissions> = {};
    for (const [group, perms] of Object.entries(props.groupedPermissions)) {
        const matched = perms.filter(
            (p) => permissionLabel(p.name).toLowerCase().includes(q) ||
                   permissionGroupLabel(group).toLowerCase().includes(q),
        );
        if (matched.length) result[group] = matched;
    }
    return result;
});

const totalSelected = computed(() => form.permissions.length);
const totalPermissions = computed(() => props.permissions.length);
const isProtected = computed(() => props.role.name === 'super-admin');

function togglePermission(name: string) {
    if (isProtected.value) return;
    const idx = form.permissions.indexOf(name);
    if (idx === -1) form.permissions.push(name);
    else form.permissions.splice(idx, 1);
}

function toggleGroup(group: string, perms: { id: number; name: string }[]) {
    if (isProtected.value) return;
    const names = perms.map((p) => p.name);
    const allSelected = names.every((n) => form.permissions.includes(n));
    if (allSelected) {
        form.permissions = form.permissions.filter((p) => !names.includes(p));
    } else {
        names.forEach((n) => {
            if (!form.permissions.includes(n)) form.permissions.push(n);
        });
    }
}

function selectAll() {
    if (isProtected.value) return;
    form.permissions = props.permissions.map((p) => p.name);
}

function clearAll() {
    if (isProtected.value) return;
    form.permissions = [];
}

function groupAllSelected(perms: { id: number; name: string }[]) {
    return perms.every((p) => form.permissions.includes(p.name));
}

function groupSomeSelected(perms: { id: number; name: string }[]) {
    return perms.some((p) => form.permissions.includes(p.name)) && !groupAllSelected(perms);
}

function submit() {
    form.post(`/admin/roles/${props.role.id}`);
}
</script>

<template>
    <Head :title="`Editar rol: ${role.name}`" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader :title="`Editar: ${role.name}`" description="Modifica el nombre y permisos del rol">
            <template #label>Roles</template>
            <template #actions>
                <Link href="/admin/roles" class="tc-btn-secondary">← Volver</Link>
            </template>
        </AdminPageHeader>

        <div
            v-if="isProtected"
            class="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm"
        >
            <ShieldCheck class="w-4 h-4 flex-shrink-0" />
            El rol <strong>super-admin</strong> tiene todos los permisos del sistema y no puede modificarse.
        </div>

        <form @submit.prevent="submit">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">

                <!-- Left: name + summary -->
                <div class="xl:col-span-1 space-y-4">
                    <div class="tc-admin-card p-5">
                        <h3 class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <ShieldCheck class="w-4 h-4 text-[var(--tc-blue)]" />
                            Nombre del rol
                        </h3>
                        <TcInput
                            id="name"
                            v-model="form.name"
                            label="Nombre"
                            required
                            :disabled="isProtected"
                            :error="form.errors.name"
                        />
                    </div>

                    <div class="tc-admin-card p-5">
                        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Permisos activos</p>
                        <div class="flex items-end gap-1">
                            <span class="text-3xl font-extrabold text-[var(--tc-blue)]">{{ totalSelected }}</span>
                            <span class="text-sm text-gray-400 pb-1">/ {{ totalPermissions }}</span>
                        </div>
                        <div class="mt-3 h-2 bg-amber-100 rounded-full overflow-hidden">
                            <div
                                class="h-full rounded-full bg-gradient-to-r from-[var(--tc-blue)] to-[var(--tc-pink)] transition-all duration-300"
                                :style="{ width: totalPermissions ? `${(totalSelected / totalPermissions) * 100}%` : '0%' }"
                            />
                        </div>
                        <div v-if="!isProtected" class="flex gap-2 mt-4">
                            <button type="button" class="tc-btn-ghost text-xs flex-1 py-1.5 justify-center" @click="selectAll">
                                Seleccionar todo
                            </button>
                            <button type="button" class="tc-btn-ghost text-xs flex-1 py-1.5 justify-center text-[var(--tc-pink)]" @click="clearAll">
                                Quitar todo
                            </button>
                        </div>
                    </div>

                    <div v-if="!isProtected" class="flex gap-3">
                        <button type="submit" class="tc-btn-primary flex-1 justify-center" :disabled="form.processing">
                            {{ form.processing ? 'Guardando…' : 'Guardar cambios' }}
                        </button>
                        <Link href="/admin/roles" class="tc-btn-secondary">Cancelar</Link>
                    </div>
                    <Link v-else href="/admin/roles" class="tc-btn-secondary w-full justify-center">← Volver</Link>
                </div>

                <!-- Right: permission groups -->
                <div class="xl:col-span-2 space-y-4">
                    <div class="tc-admin-card p-4">
                        <div class="relative">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                v-model="searchQuery"
                                type="text"
                                placeholder="Buscar permiso…"
                                class="tc-input pl-9 text-sm"
                            />
                        </div>
                    </div>

                    <p v-if="Object.keys(filteredGroups).length === 0" class="text-sm text-gray-400 text-center py-8">
                        Sin resultados para "{{ searchQuery }}"
                    </p>

                    <div
                        v-for="(perms, group) in filteredGroups"
                        :key="group"
                        class="tc-admin-card overflow-hidden"
                    >
                        <div
                            class="px-5 py-3 border-b border-amber-100/60 flex items-center justify-between bg-gradient-to-r from-amber-50/60 to-transparent"
                            :class="{ 'cursor-pointer': !isProtected }"
                            @click="!isProtected && toggleGroup(String(group), perms)"
                        >
                            <div class="flex items-center gap-2.5">
                                <component
                                    :is="groupAllSelected(perms) ? CheckSquare : Square"
                                    class="w-4 h-4 flex-shrink-0 transition-colors"
                                    :class="groupAllSelected(perms) ? 'text-[var(--tc-blue)]' : groupSomeSelected(perms) ? 'text-amber-500' : 'text-gray-300'"
                                />
                                <span class="font-semibold text-sm text-gray-800">
                                    {{ permissionGroupLabel(String(group)) }}
                                </span>
                                <span class="tc-badge tc-badge-blue text-[10px]">
                                    {{ perms.filter((p) => form.permissions.includes(p.name)).length }} / {{ perms.length }}
                                </span>
                            </div>
                            <span
                                v-if="!isProtected"
                                class="text-xs text-[var(--tc-blue)] font-medium hover:underline"
                                @click.stop="toggleGroup(String(group), perms)"
                            >
                                {{ groupAllSelected(perms) ? 'Quitar todos' : 'Seleccionar todos' }}
                            </span>
                        </div>

                        <div class="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <label
                                v-for="perm in perms"
                                :key="perm.id"
                                class="tc-perm-item"
                                :class="[
                                    form.permissions.includes(perm.name) ? 'tc-perm-item--active' : '',
                                    isProtected ? 'cursor-default' : 'cursor-pointer',
                                ]"
                            >
                                <div
                                    class="tc-perm-checkbox"
                                    :class="{ 'tc-perm-checkbox--checked': form.permissions.includes(perm.name) }"
                                >
                                    <svg v-if="form.permissions.includes(perm.name)" viewBox="0 0 12 12" fill="none" class="w-3 h-3">
                                        <path d="M2 6l3 3 5-5" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </div>
                                <input
                                    type="checkbox"
                                    :checked="form.permissions.includes(perm.name)"
                                    :disabled="isProtected"
                                    class="sr-only"
                                    @change="togglePermission(perm.name)"
                                />
                                <span class="text-sm text-gray-700">{{ permissionLabel(perm.name) }}</span>
                            </label>
                        </div>
                    </div>
                </div>

            </div>
        </form>
    </div>
</template>
