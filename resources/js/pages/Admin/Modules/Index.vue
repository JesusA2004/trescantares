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

async function toggleModule(module: typeof props.modules[0]) {
    if (module.is_core) {
        warning(`"${module.name}" es un módulo esencial y no puede desactivarse.`);
        return;
    }

    const action = module.is_enabled ? 'desactivar' : 'activar';
    const confirmed = await confirm(
        `¿${action.charAt(0).toUpperCase() + action.slice(1)} "${module.name}"?`,
        module.is_enabled
            ? 'Este módulo quedará oculto en el sidebar y sus rutas quedarán bloqueadas.'
            : 'Este módulo volverá a ser visible y sus rutas estarán disponibles.',
        { icon: module.is_enabled ? 'warning' : 'question' }
    );

    if (!confirmed) return;

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

        <AdminPageHeader title="Módulos" description="Activa o desactiva funcionalidades del sistema">
            <template #label>Sistema</template>
        </AdminPageHeader>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
                v-for="mod in modules"
                :key="mod.id"
                class="tc-admin-card p-4 flex items-start gap-4 transition-opacity duration-200"
                :class="{ 'opacity-55': !mod.is_enabled && !mod.is_core }"
            >
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    :class="mod.is_enabled ? 'bg-blue-50 text-[var(--tc-blue)] dark:bg-blue-500/15 dark:text-blue-300' : 'bg-gray-100 text-gray-400 dark:bg-white/8 dark:text-white/50'"
                >
                    <Boxes class="w-5 h-5" />
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <p class="font-semibold text-gray-900 text-sm">{{ mod.name }}</p>
                        <span v-if="mod.is_core" class="tc-badge tc-badge-blue text-[10px] flex items-center gap-1">
                            <Lock class="w-2.5 h-2.5" /> Core
                        </span>
                    </div>
                    <p v-if="mod.description" class="text-xs text-gray-500 mt-0.5">{{ mod.description }}</p>
                    <p class="text-xs mt-1" :class="mod.is_enabled ? 'text-[var(--tc-green)]' : 'text-gray-400'">
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
