<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { Briefcase, MessageCircle, Phone } from 'lucide-vue-next';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';
import { useNotify } from '@/composables/useNotify';

const props = defineProps<{
    settings: {
        jobs_enabled: boolean;
        jobs_whatsapp: string;
        jobs_intro_text: string;
        jobs_positions: string;
    };
}>();

const { confirm, success } = useNotify();

const form = useForm({
    jobs_enabled: props.settings.jobs_enabled,
    jobs_whatsapp: props.settings.jobs_whatsapp,
    jobs_intro_text: props.settings.jobs_intro_text,
    jobs_positions: props.settings.jobs_positions,
});

async function toggleJobsEnabled(value: boolean | undefined) {
    if (value === undefined) return;
    if (!value) {
        const ok = await confirm(
            '¿Desactivar bolsa de trabajo pública?',
            'Los visitantes ya no podrán ver la página /bolsa-de-trabajo.',
            { icon: 'warning', confirmText: 'Sí, desactivar', cancelText: 'Cancelar' }
        );
        if (!ok) return;
    }
    form.jobs_enabled = value;
}

function submit() {
    form.post('/admin/jobs');
}
</script>

<template>
    <Head title="Bolsa de Trabajo — Admin" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Bolsa de Trabajo" description="Configura la sección de bolsa de trabajo del sitio">
            <template #label>Sistema</template>
            <template #actions>
                <a href="/bolsa-de-trabajo" target="_blank" class="tc-btn-secondary text-sm">
                    Ver pública →
                </a>
            </template>
        </AdminPageHeader>

        <!-- Status card -->
        <div
            class="tc-admin-card p-5 flex items-center gap-4 border-l-4 transition-colors duration-300"
            :class="form.jobs_enabled ? 'border-green-400' : 'border-gray-300'"
        >
            <div
                class="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                :class="form.jobs_enabled ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'"
            >
                <Briefcase class="w-6 h-6" />
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-900">Bolsa de trabajo pública</p>
                <p class="text-sm text-gray-500">
                    {{ form.jobs_enabled ? 'Visible para visitantes en /bolsa-de-trabajo' : 'Oculta — los visitantes no pueden verla' }}
                </p>
            </div>
            <TcSwitch
                :model-value="form.jobs_enabled"
                label=""
                @update:model-value="toggleJobsEnabled"
            />
        </div>

        <form @submit.prevent="submit" class="space-y-4">

            <AdminFormSection title="Configuración de contacto">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <!-- WhatsApp field — clean layout -->
                    <div class="tc-field">
                        <label class="tc-label flex items-center gap-1.5">
                            <Phone class="w-3.5 h-3.5 text-gray-400" />
                            WhatsApp de bolsa de trabajo
                        </label>
                        <div class="tc-input-icon-wrap">
                            <span class="tc-input-prefix">+52</span>
                            <input
                                v-model="form.jobs_whatsapp"
                                type="text"
                                class="tc-input tc-input-with-prefix"
                                placeholder="7771234567"
                                maxlength="25"
                            />
                        </div>
                        <p class="tc-help-text">Número sin espacios ni símbolos. Ej: 7771234567</p>
                        <p v-if="form.errors.jobs_whatsapp" class="tc-field-error">{{ form.errors.jobs_whatsapp }}</p>
                    </div>
                </div>
            </AdminFormSection>

            <AdminFormSection title="Texto introductorio" description="Texto que aparece en la parte superior de la página pública">
                <TcTextarea
                    id="jobs_intro_text"
                    v-model="form.jobs_intro_text"
                    label="Mensaje de bienvenida"
                    placeholder="Ej: Únete a nuestro equipo. En Tres Cantares buscamos personas apasionadas por la gastronomía mexicana…"
                    :rows="4"
                />
            </AdminFormSection>

            <AdminFormSection title="Vacantes sugeridas" description="Un puesto por línea. Se mostrarán como lista en el sitio público.">
                <TcTextarea
                    id="jobs_positions"
                    v-model="form.jobs_positions"
                    label="Puestos disponibles"
                    placeholder="Mesero&#10;Cocinero&#10;Bartender&#10;Cajero&#10;Lavaplatos"
                    :rows="6"
                />
            </AdminFormSection>

            <div class="flex gap-3">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Guardar configuración' }}
                </button>
            </div>

        </form>

        <!-- Info note -->
        <div class="tc-admin-card p-4 bg-blue-50/60 border border-blue-100">
            <div class="flex items-start gap-3">
                <MessageCircle class="w-4 h-4 text-[var(--tc-blue)] mt-0.5 flex-shrink-0" />
                <div>
                    <p class="text-sm font-medium text-gray-700">¿Cómo funciona la bolsa?</p>
                    <p class="text-xs text-gray-500 mt-1">
                        La bolsa de trabajo no almacena CVs. Los interesados hacen click en "Aplicar" y son redirigidos
                        al WhatsApp configurado. Ideal para restaurantes sin sistema de RRHH complejo.
                    </p>
                </div>
            </div>
        </div>

    </div>
</template>
