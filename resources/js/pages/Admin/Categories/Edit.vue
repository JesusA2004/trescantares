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

const props = defineProps<{
    category: MenuCategoryData & {
        id: number;
        description: string | null;
        icon: string | null;
        is_active: boolean;
    };
    layouts: string[];
}>();

const form = useForm({
    name: props.category.name,
    description: props.category.description ?? '',
    subtitle: props.category.subtitle ?? '',
    tagline: props.category.tagline ?? '',
    tagline_sub: props.category.tagline_sub ?? '',
    icon: props.category.icon ?? '',
    color: props.category.color ?? '#144e8f',
    color_secondary: props.category.color_secondary ?? '#DB3465',
    layout: props.category.layout,
    background_position: props.category.background_position ?? '',
    image: null as File | null,
    image_mobile: null as File | null,
    title_image: null as File | null,
    subtitle_image: null as File | null,
    tagline_image: null as File | null,
    remove_image: false,
    remove_image_mobile: false,
    is_active: props.category.is_active,
    show_in_nav: props.category.show_in_nav ?? true,
    _method: 'PUT',
});

/** TcImageUpload solo avisa "el usuario dejó este campo en blanco" — si
 * originalmente había una imagen guardada, eso significa que la quiere
 * quitar (no solo "sin cambios"); elegir un archivo nuevo cancela esa
 * intención. El backend solo borra cuando `remove_*` viaja explícito y no
 * llegó un archivo nuevo (ver CategoryController::handleUploads). */
function onImageChange(file: File | null) {
    form.image = file;
    form.remove_image = file === null && !!props.category.image_url;
}

function onImageMobileChange(file: File | null) {
    form.image_mobile = file;
    form.remove_image_mobile =
        file === null && !!props.category.image_mobile_url;
}

// La vista previa refleja los cambios del formulario en vivo (colores,
// plantilla, encuadre de portada) usando los mismos componentes del menú
// público, con los platillos reales ya guardados en esta categoría.
const previewCategory = computed<MenuCategoryData>(() => ({
    ...props.category,
    name: form.name,
    subtitle: form.subtitle,
    tagline: form.tagline,
    tagline_sub: form.tagline_sub,
    color: form.color,
    color_secondary: form.color_secondary,
    layout: form.layout,
    background_position: form.background_position,
}));

function submit() {
    form.post(`/admin/categories/${props.category.id}`, {
        forceFormData: true,
    });
}
</script>

<template>
    <Head :title="`Editar: ${category.name}`" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            :title="`Editar: ${category.name}`"
            description="Modifica los datos de la categoría"
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
                            :error="form.errors.name"
                        />
                        <TcTextarea
                            id="description"
                            v-model="form.description"
                            label="Descripción"
                            :rows="2"
                        />
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="subtitle"
                                v-model="form.subtitle"
                                label="Subtítulo"
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
                            :label="
                                form.layout === 'portada'
                                    ? 'Imagen de portada (Tablet y Escritorio, ≥768px)'
                                    : 'Imagen de sección'
                            "
                            hint="Dejar sin cambios para conservar la actual. JPG, PNG, WEBP · Máx. 4MB"
                            :current-url="category.image_url"
                            :max-mb="4"
                            :error="form.errors.image"
                            @change="onImageChange"
                        />
                        <TcImageUpload
                            v-if="form.layout === 'portada'"
                            label="Imagen de portada (Móvil, hasta 767px)"
                            hint="Opcional — si se deja vacía, se usa la imagen de arriba también en móvil. JPG, PNG, WEBP · Máx. 4MB"
                            :current-url="category.image_mobile_url"
                            :max-mb="4"
                            :error="form.errors.image_mobile"
                            @change="onImageMobileChange"
                        />
                        <TcInput
                            id="background_position"
                            v-model="form.background_position"
                            label="Encuadre de la imagen (background-position)"
                            placeholder="Ej: center, center 30%, top"
                            hint="Solo aplica a la portada: controla qué parte de la foto se muestra en pantallas anchas"
                        />
                        <TcImageUpload
                            label="Imagen de título (rótulo principal)"
                            hint="Dejar sin cambios para conservar la actual"
                            :current-url="category.title_image_url"
                            :max-mb="4"
                            :error="form.errors.title_image"
                            @change="(f) => (form.title_image = f)"
                        />
                        <TcImageUpload
                            label="Imagen de subtítulo"
                            :current-url="category.subtitle_image_url"
                            :max-mb="4"
                            :error="form.errors.subtitle_image"
                            @change="(f) => (form.subtitle_image = f)"
                        />
                        <TcImageUpload
                            label="Imagen de frase decorativa"
                            :current-url="category.tagline_image_url"
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
                        <TcSwitch
                            v-model="form.show_in_nav"
                            label="Mostrar en navegación"
                            description="Aparece en el menú lateral de secciones. Desactívalo para páginas como la portada o una promoción de temporada."
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
                                    : 'Actualizar categoría'
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
