<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcImageUpload from '@/components/tc/TcImageUpload.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';
import { layoutOptions } from './layouts';

defineProps<{
    layouts: string[];
}>();

const form = useForm({
    name: '',
    description: '',
    subtitle: '',
    tagline: '',
    tagline_sub: '',
    icon: '',
    color: '#144e8f',
    color_secondary: '#DB3465',
    layout: 'grid',
    image: null as File | null,
    title_image: null as File | null,
    subtitle_image: null as File | null,
    tagline_image: null as File | null,
    is_active: true,
});

function submit() {
    form.post('/admin/categories', { forceFormData: true });
}
</script>

<template>
    <Head title="Nueva Categoría" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Nueva Categoría" description="Agrega una sección al menú">
            <template #label>Categorías</template>
            <template #actions>
                <Link href="/admin/categories" class="tc-btn-secondary">← Volver</Link>
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit" class="space-y-4">

            <AdminFormSection title="Información básica">
                <TcInput
                    id="name"
                    v-model="form.name"
                    label="Nombre"
                    required
                    placeholder="Ej: Pozole, Pancita, Postres…"
                    :error="form.errors.name"
                />
                <TcTextarea
                    id="description"
                    v-model="form.description"
                    label="Descripción"
                    placeholder="Descripción breve de la categoría (opcional)"
                    :rows="2"
                    :error="form.errors.description"
                />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput id="subtitle" v-model="form.subtitle" label="Subtítulo" placeholder="Ej: Para cerrar con broche de oro" />
                    <TcSelect
                        id="layout"
                        v-model="form.layout"
                        label="Plantilla visual"
                        :options="layoutOptions(layouts)"
                        hint="Define cómo se compone la página en el menú público"
                    />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput id="tagline" v-model="form.tagline" label="Frase decorativa" placeholder="Ej: CALDO ILIMITADO" />
                    <TcInput id="tagline_sub" v-model="form.tagline_sub" label="Frase decorativa (línea secundaria)" />
                </div>
            </AdminFormSection>

            <AdminFormSection title="Colores">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="tc-field">
                        <label for="color">Color principal</label>
                        <div class="flex items-center gap-3">
                            <input id="color" v-model="form.color" type="color" class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                            <span class="tc-input flex-1 text-gray-500 text-sm">{{ form.color }}</span>
                        </div>
                    </div>
                    <div class="tc-field">
                        <label for="color_secondary">Color secundario</label>
                        <div class="flex items-center gap-3">
                            <input
                                id="color_secondary"
                                v-model="form.color_secondary"
                                type="color"
                                class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                            />
                            <span class="tc-input flex-1 text-gray-500 text-sm">{{ form.color_secondary }}</span>
                        </div>
                    </div>
                </div>
            </AdminFormSection>

            <AdminFormSection title="Imágenes">
                <TcImageUpload
                    label="Imagen de sección (miniatura / foto de fondo)"
                    hint="JPG, PNG, WEBP · Máx. 4MB"
                    :max-mb="4"
                    :error="form.errors.image"
                    @change="(f) => (form.image = f)"
                />
                <TcImageUpload
                    label="Imagen de título (rótulo principal, PNG transparente)"
                    hint="Sustituye el título de texto por un rótulo diseñado"
                    :max-mb="4"
                    :error="form.errors.title_image"
                    @change="(f) => (form.title_image = f)"
                />
                <TcImageUpload
                    label="Imagen de subtítulo (banda decorativa secundaria)"
                    :max-mb="4"
                    :error="form.errors.subtitle_image"
                    @change="(f) => (form.subtitle_image = f)"
                />
                <TcImageUpload
                    label="Imagen de frase decorativa (cierre de página)"
                    :max-mb="4"
                    :error="form.errors.tagline_image"
                    @change="(f) => (form.tagline_image = f)"
                />
            </AdminFormSection>

            <AdminFormSection title="Configuración">
                <TcSwitch v-model="form.is_active" label="Categoría activa" description="Visible en el menú público" />
                <p class="text-xs text-gray-400">
                    El orden de aparición se controla arrastrando las categorías en el listado.
                </p>
            </AdminFormSection>

            <div class="flex gap-3">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Crear categoría' }}
                </button>
                <Link href="/admin/categories" class="tc-btn-secondary">Cancelar</Link>
            </div>

        </form>
    </div>
</template>
