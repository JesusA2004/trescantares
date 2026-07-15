<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import { Boxes, Lock } from 'lucide-vue-next';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import { useNotify } from '@/composables/useNotify';

const { confirm, warning } = useNotify();

const props = defineProps<{
    modules: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        icon: string | null;
        is_enabled: boolean;
        is_core: boolean;
        sort_order: number;
    }[];
}>();

async function toggleModule(module: (typeof props.modules)[0]) {
    if (module.is_core) {
        warning(
            `"${module.name}" es un módulo esencial y no puede desactivarse.`,
        );

        return;
    }

    const action = module.is_enabled ? 'desactivar' : 'activar';
    const confirmed = await confirm(
        `¿${action.charAt(0).toUpperCase() + action.slice(1)} "${module.name}"?`,
        module.is_enabled
            ? 'Este módulo quedará oculto en el sidebar y sus rutas quedarán bloqueadas.'
            : 'Este módulo volverá a ser visible y sus rutas estarán disponibles.',
        { icon: module.is_enabled ? 'warning' : 'question' },
    );

    if (!confirmed) {
return;
}

    router.patch(
        `/admin/modules/${module.id}`,
        { is_enabled: !module.is_enabled },
        { preserveState: true, preserveScroll: true },
    );
}
</script>

<template>
    <Head title="Módulos del sistema" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            title="Módulos"
            description="Activa o desactiva funcionalidades del sistema"
        >
            <template #label>Sistema</template>
        </AdminPageHeader>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
                v-for="mod in modules"
                :key="mod.id"
                class="tc-admin-card flex items-start gap-4 p-4 transition-opacity duration-200"
                :class="{ 'opacity-55': !mod.is_enabled && !mod.is_core }"
            >
                <div
                    class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                    :class="
                        mod.is_enabled
                            ? 'bg-blue-50 text-[var(--tc-blue)]'
                            : 'bg-gray-100 text-gray-400'
                    "
                >
                    <Boxes class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <p class="text-sm font-semibold text-gray-900">
                            {{ mod.name }}
                        </p>
                        <span
                            v-if="mod.is_core"
                            class="tc-badge tc-badge-blue flex items-center gap-1 text-[10px]"
                        >
                            <Lock class="h-2.5 w-2.5" /> Core
                        </span>
                    </div>
                    <p
                        v-if="mod.description"
                        class="mt-0.5 text-xs text-gray-500"
                    >
                        {{ mod.description }}
                    </p>
                    <p
                        class="mt-1 text-xs"
                        :class="
                            mod.is_enabled
                                ? 'text-[var(--tc-green)]'
                                : 'text-gray-400'
                        "
                    >
                        {{ mod.is_enabled ? '● Activo' : '○ Inactivo' }}
                    </p>
                </div>
                <div class="flex-shrink-0">
                    <TcSwitch
                        :model-value="mod.is_enabled"
                        :disabled="mod.is_core"
                        @update:model-value="toggleModule(mod)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>
