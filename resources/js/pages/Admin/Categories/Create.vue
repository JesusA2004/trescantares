<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { computed } from 'vue';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import MenuLivePreview from '@/components/Public/Menu/MenuLivePreview.vue';
import type { MenuCategoryData } from '@/components/Public/Menu/types';
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
    background_position: '',
    image: null as File | null,
    title_image: null as File | null,
    subtitle_image: null as File | null,
    tagline_image: null as File | null,
    is_active: true,
});

// Una categoría nueva aún no tiene platillos: la vista previa solo puede
// mostrar título/colores/imágenes hasta que se guarde y se agreguen platillos.
const previewCategory = computed<MenuCategoryData>(() => ({
    id: 0,
    slug: '',
    name: form.name || 'Nombre de la categoría',
    subtitle: form.subtitle,
    tagline: form.tagline,
    tagline_sub: form.tagline_sub,
    color: form.color,
    color_secondary: form.color_secondary,
    layout: form.layout,
    background_position: form.background_position,
    items: [],
}));

function submit() {
    form.post('/admin/categories', { forceFormData: true });
}
</script>

<template>
    <Head title="Nueva Categoría" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            title="Nueva Categoría"
            description="Agrega una sección al menú"
        >
            <template #label>Categorías</template>
            <template #actions>
                <Link href="/admin/categories" class="tc-btn-secondary"
                    >← Volver</Link
                >
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <div class="space-y-4 xl:col-span-2">
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
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="subtitle"
                                v-model="form.subtitle"
                                label="Subtítulo"
                                placeholder="Ej: Para cerrar con broche de oro"
                            />
                            <TcSelect
                                id="layout"
                                v-model="form.layout"
                                label="Plantilla visual"
                                :options="layoutOptions(layouts)"
                                hint="Define cómo se compone la página en el menú público"
                            />
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="tagline"
                                v-model="form.tagline"
                                label="Frase decorativa"
                                placeholder="Ej: CALDO ILIMITADO"
                            />
                            <TcInput
                                id="tagline_sub"
                                v-model="form.tagline_sub"
                                label="Frase decorativa (línea secundaria)"
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Colores">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="tc-field">
                                <label for="color">Color principal</label>
                                <div class="flex items-center gap-3">
                                    <input
                                        id="color"
                                        v-model="form.color"
                                        type="color"
                                        class="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
                                    />
                                    <span
                                        class="tc-input flex-1 text-sm text-gray-500"
                                        >{{ form.color }}</span
                                    >
                                </div>
                            </div>
                            <div class="tc-field">
                                <label for="color_secondary"
                                    >Color secundario</label
                                >
                                <div class="flex items-center gap-3">
                                    <input
                                        id="color_secondary"
                                        v-model="form.color_secondary"
                                        type="color"
                                        class="h-10 w-10 cursor-pointer rounded-lg border border-gray-200"
                                    />
                                    <span
                                        class="tc-input flex-1 text-sm text-gray-500"
                                        >{{ form.color_secondary }}</span
                                    >
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
                        <TcInput
                            id="background_position"
                            v-model="form.background_position"
                            label="Encuadre de la imagen (background-position)"
                            placeholder="Ej: center, center 30%, top"
                            hint="Solo aplica a la portada: controla qué parte de la foto se muestra en pantallas anchas"
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
                        <TcSwitch
                            v-model="form.is_active"
                            label="Categoría activa"
                            description="Visible en el menú público"
                        />
                        <p class="text-xs text-gray-400">
                            El orden de aparición se controla arrastrando las
                            categorías en el listado.
                        </p>
                    </AdminFormSection>

                    <div class="flex gap-3">
                        <button
                            type="submit"
                            class="tc-btn-primary"
                            :disabled="form.processing"
                        >
                            {{
                                form.processing
                                    ? 'Guardando…'
                                    : 'Crear categoría'
                            }}
                        </button>
                        <Link href="/admin/categories" class="tc-btn-secondary"
                            >Cancelar</Link
                        >
                    </div>
                </div>

                <div class="xl:col-span-1">
                    <div class="tc-admin-card p-5 xl:sticky xl:top-5">
                        <MenuLivePreview :category="previewCategory" />
                    </div>
                </div>
            </div>
        </form>
    </div>
</template>
