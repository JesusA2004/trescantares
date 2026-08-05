<script setup lang="ts">
import { Head, Link, router, useForm } from '@inertiajs/vue3';
import { History, ImagePlus, Star, X } from 'lucide-vue-next';
import { ref, computed, watch } from 'vue';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import MenuLivePreview from '@/components/Public/Menu/MenuLivePreview.vue';
import type {
    MenuCategoryData,
    MenuItemData,
} from '@/components/Public/Menu/types';
import TcImagePositionEditor from '@/components/tc/TcImagePositionEditor.vue';
import TcImageUpload from '@/components/tc/TcImageUpload.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcMediaLibraryModal from '@/components/tc/TcMediaLibraryModal.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';
import { zonesForLayout } from './zones';

interface GalleryImage {
    id: number;
    image_url: string;
    alt_text: string | null;
    is_primary: boolean;
    sort_order: number;
}

const props = defineProps<{
    item: {
        id: number;
        name: string;
        menu_category_id: number;
        zone: string | null;
        description: string | null;
        badge: string | null;
        choice_label: string | null;
        choice_label_hidden: boolean;
        price: string | number;
        price_label: string | null;
        price_secondary: string | number | null;
        price_secondary_label: string | null;
        presentation: string | null;
        image_url: string | null;
        alt_text: string | null;
        image_position_x: number;
        image_position_y: number;
        image_scale: string | number;
        image_fit: string;
        image_align: string | null;
        visual_size: string | null;
        caption_image_url: string | null;
        ingredients: string | null;
        ingredients_hidden: boolean;
        is_featured: boolean;
        is_active: boolean;
        image_hidden: boolean;
        previous_image: string | null;
        gallery: GalleryImage[];
    };
    categories: MenuCategoryData[];
}>();

const categoryOptions = props.categories.map((c) => ({
    value: c.id,
    label: c.name,
}));

const form = useForm({
    menu_category_id: props.item.menu_category_id,
    zone: props.item.zone ?? '',
    name: props.item.name,
    description: props.item.description ?? '',
    badge: props.item.badge ?? '',
    choice_label: props.item.choice_label ?? '',
    choice_label_hidden: props.item.choice_label_hidden,
    price: props.item.price,
    price_label: props.item.price_label ?? '',
    price_secondary: props.item.price_secondary ?? '',
    price_secondary_label: props.item.price_secondary_label ?? '',
    presentation: props.item.presentation ?? '',
    ingredients: props.item.ingredients ?? '',
    ingredients_hidden: props.item.ingredients_hidden,
    alt_text: props.item.alt_text ?? '',
    image_position_x: props.item.image_position_x ?? 50,
    image_position_y: props.item.image_position_y ?? 50,
    image_scale: Number(props.item.image_scale ?? 1),
    image_fit: props.item.image_fit ?? 'contain',
    image_align: props.item.image_align ?? 'center',
    visual_size: props.item.visual_size ?? 'md',
    is_featured: props.item.is_featured,
    is_active: props.item.is_active,
    image_hidden: props.item.image_hidden,
    _method: 'PUT',
    delete_image_ids: [] as number[],
    primary_image_id: (props.item.gallery.find((g) => g.is_primary)?.id ??
        null) as number | null,
    new_images: [] as File[],
    caption_image: null as File | null,
    image_library_path: '',
});

const mediaLibraryOpen = ref(false);
const libraryPickedUrl = ref<string | null>(null);

function onLibraryPicked({ path, url }: { path: string; url: string }) {
    form.image_library_path = path;
    libraryPickedUrl.value = url;
    mediaLibraryOpen.value = false;
}

function restoreImage() {
    router.post(
        `/admin/menu-items/${props.item.id}/restore-image`,
        {},
        {
            preserveScroll: true,
        },
    );
}

const selectedCategory = computed(
    () =>
        props.categories.find((c) => c.id === Number(form.menu_category_id)) ??
        null,
);
const zoneOptions = computed(() =>
    zonesForLayout(selectedCategory.value?.layout),
);

// Solo se limpia la zona si el usuario cambia la categoría a una plantilla
// donde la zona actual ya no existe (al cargar la página, la del item guardado
// siempre es válida para su propia categoría).
watch(
    () => form.menu_category_id,
    (_, oldValue) => {
        if (oldValue === undefined) {
            return;
        }

        const valid = zonesForLayout(selectedCategory.value?.layout).some(
            (z) => z.value === form.zone,
        );

        if (!valid) {
            form.zone = '';
        }
    },
);

const gallery = ref<GalleryImage[]>(props.item.gallery.map((g) => ({ ...g })));

interface NewPreview {
    url: string;
    file: File;
}
const newPreviews = ref<NewPreview[]>([]);

const primaryPreviewUrl = computed(() => {
    const primary = gallery.value.find(
        (g) => g.is_primary && !form.delete_image_ids.includes(g.id),
    );

    return (
        primary?.image_url ??
        newPreviews.value[0]?.url ??
        libraryPickedUrl.value ??
        props.item.image_url ??
        null
    );
});

// Vista previa en vivo: la categoría seleccionada con sus platillos reales,
// sustituyendo este platillo por sus valores actuales del formulario.
const previewCategory = computed<MenuCategoryData | null>(() => {
    if (!selectedCategory.value) {
        return null;
    }

    const draftItem: MenuItemData = {
        id: props.item.id,
        name: form.name || 'Nombre del platillo',
        slug: '',
        zone: form.zone || null,
        price: form.price || 0,
        price_label: form.price_label || null,
        price_secondary: form.price_secondary || null,
        price_secondary_label: form.price_secondary_label || null,
        presentation: form.presentation || null,
        choice_label: form.choice_label_hidden ? null : form.choice_label || null,
        ingredients: form.ingredients_hidden ? null : form.ingredients || null,
        badge: form.badge || null,
        image_url: primaryPreviewUrl.value,
        alt_text: form.alt_text || null,
        image_position_x: form.image_position_x,
        image_position_y: form.image_position_y,
        image_scale: form.image_scale,
        image_fit: form.image_fit,
        image_align: form.image_align,
        visual_size: form.visual_size,
        sort_order: 0,
    };

    return {
        ...selectedCategory.value,
        items: [
            draftItem,
            ...selectedCategory.value.items.filter(
                (i) => i.id !== props.item.id,
            ),
        ],
    };
});

function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach((file) => {
        if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
            return;
        }

        newPreviews.value.push({ url: URL.createObjectURL(file), file });
        form.new_images.push(file);
    });
}

function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;

    if (input.files) {
        handleFiles(input.files);
    }

    input.value = '';
}

function onDrop(e: DragEvent) {
    e.preventDefault();

    if (e.dataTransfer?.files) {
        handleFiles(e.dataTransfer.files);
    }
}

function markDeleteExisting(id: number) {
    if (!form.delete_image_ids.includes(id)) {
        form.delete_image_ids.push(id);
    }

    if (form.primary_image_id === id) {
        form.primary_image_id = null;
    }
}

function setPrimaryExisting(id: number) {
    gallery.value.forEach((g) => {
        g.is_primary = g.id === id;
    });
    form.primary_image_id = id;
}

function removeNewPreview(idx: number) {
    URL.revokeObjectURL(newPreviews.value[idx].url);
    newPreviews.value.splice(idx, 1);
    form.new_images.splice(idx, 1);
}

function isMarkedDelete(id: number) {
    return form.delete_image_ids.includes(id);
}

function submit() {
    form.post(`/admin/menu-items/${props.item.id}`, { forceFormData: true });
}
</script>

<template>
    <Head :title="`Editar: ${item.name}`" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            :title="`Editar: ${item.name}`"
            description="Modifica los datos del platillo"
        >
            <template #label>Platillos</template>
            <template #actions>
                <Link href="/admin/menu-items" class="tc-btn-secondary"
                    >← Volver</Link
                >
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit">
            <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <!-- Left: gallery manager -->
                <div class="space-y-4 xl:col-span-1">
                    <div class="tc-admin-card p-5">
                        <h3
                            class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700"
                        >
                            <ImagePlus class="h-4 w-4 text-[var(--tc-blue)]" />
                            Galería de imágenes
                        </h3>

                        <!-- Existing images -->
                        <div
                            v-if="gallery.length"
                            class="mb-4 grid grid-cols-2 gap-2"
                        >
                            <div
                                v-for="img in gallery"
                                :key="img.id"
                                class="group relative overflow-hidden rounded-xl border-2 transition-all"
                                :class="[
                                    isMarkedDelete(img.id)
                                        ? 'border-red-300 opacity-40'
                                        : img.is_primary
                                          ? 'border-[var(--tc-blue)]'
                                          : 'border-transparent',
                                ]"
                            >
                                <img
                                    :src="img.image_url"
                                    :alt="img.alt_text ?? item.name"
                                    class="aspect-square w-full object-cover"
                                />
                                <div
                                    class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30"
                                />
                                <div
                                    v-if="
                                        img.is_primary &&
                                        !isMarkedDelete(img.id)
                                    "
                                    class="absolute top-1.5 left-1.5"
                                >
                                    <span
                                        class="tc-badge tc-badge-blue flex items-center gap-1 text-[10px]"
                                    >
                                        <Star
                                            class="h-2.5 w-2.5"
                                            fill="currentColor"
                                        />
                                        Principal
                                    </span>
                                </div>
                                <div
                                    v-if="isMarkedDelete(img.id)"
                                    class="absolute inset-0 flex items-center justify-center"
                                >
                                    <span
                                        class="tc-badge tc-badge-pink text-[10px]"
                                        >Se eliminará</span
                                    >
                                </div>
                                <div
                                    v-else
                                    class="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <button
                                        v-if="!img.is_primary"
                                        type="button"
                                        class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-white"
                                        title="Marcar como principal"
                                        @click.stop="setPrimaryExisting(img.id)"
                                    >
                                        <Star class="h-3 w-3" />
                                    </button>
                                    <button
                                        type="button"
                                        class="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white"
                                        title="Eliminar"
                                        @click.stop="markDeleteExisting(img.id)"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div v-else-if="item.image_url" class="mb-4">
                            <p class="mb-2 text-xs text-gray-500">
                                Imagen actual (legacy):
                            </p>
                            <img
                                :src="item.image_url"
                                :alt="item.name"
                                class="max-h-40 w-full rounded-xl object-cover"
                            />
                        </div>

                        <div
                            v-if="newPreviews.length"
                            class="mb-3 grid grid-cols-2 gap-2"
                        >
                            <div
                                v-for="(preview, idx) in newPreviews"
                                :key="preview.url"
                                class="group relative overflow-hidden rounded-xl border-2 border-green-300"
                            >
                                <img
                                    :src="preview.url"
                                    alt="Nueva imagen"
                                    class="aspect-square w-full object-cover"
                                />
                                <div class="absolute top-1.5 left-1.5">
                                    <span
                                        class="tc-badge tc-badge-green text-[10px]"
                                        >Nueva</span
                                    >
                                </div>
                                <button
                                    type="button"
                                    class="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-lg bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                    @click.stop="removeNewPreview(idx)"
                                >
                                    <X class="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        <div
                            class="cursor-pointer rounded-xl border-2 border-dashed border-amber-200 p-4 text-center transition-colors hover:border-[var(--tc-blue)] hover:bg-blue-50/30"
                            @dragover.prevent
                            @drop="onDrop"
                            @click="
                                ($refs.newFileInput as HTMLInputElement).click()
                            "
                        >
                            <ImagePlus
                                class="mx-auto mb-1 h-5 w-5 text-amber-300"
                            />
                            <p class="text-xs text-gray-500">
                                Agregar más imágenes
                            </p>
                        </div>
                        <input
                            ref="newFileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            class="hidden"
                            @change="onFileInput"
                        />

                        <div class="mt-2 flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="mediaLibraryOpen = true"
                            >
                                Elegir de biblioteca
                            </button>
                            <button
                                v-if="item.previous_image"
                                type="button"
                                class="tc-btn-secondary text-xs"
                                @click="restoreImage"
                            >
                                <History
                                    class="mr-1 inline h-3.5 w-3.5"
                                />Restaurar imagen anterior
                            </button>
                        </div>
                        <p
                            v-if="form.image_library_path"
                            class="mt-1 text-xs text-green-600"
                        >
                            Se usará la imagen elegida de la biblioteca al
                            guardar.
                        </p>

                        <p class="mt-2 text-xs text-gray-400">
                            Haz click en ⭐ para cambiar la imagen principal. La
                            imagen marcada se muestra en el menú.
                        </p>
                    </div>

                    <div class="tc-admin-card p-5">
                        <TcImagePositionEditor
                            :preview-url="primaryPreviewUrl"
                            :position-x="form.image_position_x"
                            :position-y="form.image_position_y"
                            :scale="form.image_scale"
                            :fit="form.image_fit"
                            :align="form.image_align"
                            :visual-size="form.visual_size"
                            @update:position-x="form.image_position_x = $event"
                            @update:position-y="form.image_position_y = $event"
                            @update:scale="form.image_scale = $event"
                            @update:fit="form.image_fit = $event"
                            @update:align="form.image_align = $event"
                            @update:visual-size="form.visual_size = $event"
                        />
                    </div>

                    <div class="tc-admin-card p-5">
                        <TcImageUpload
                            label="Imagen de leyenda (opcional)"
                            hint="Gráfico decorativo asociado a este platillo (ej. una frase manuscrita)"
                            :current-url="item.caption_image_url"
                            :max-mb="4"
                            @change="(f) => (form.caption_image = f)"
                        />
                    </div>

                    <div v-if="previewCategory" class="tc-admin-card p-5">
                        <MenuLivePreview :category="previewCategory" />
                    </div>
                </div>

                <!-- Right: form fields -->
                <div class="space-y-4 xl:col-span-2">
                    <AdminFormSection title="Información básica">
                        <TcSelect
                            id="category"
                            v-model="form.menu_category_id"
                            label="Categoría"
                            required
                            :options="categoryOptions"
                            :error="form.errors.menu_category_id"
                        />
                        <TcInput
                            id="name"
                            v-model="form.name"
                            label="Nombre del platillo"
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
                                id="alt_text"
                                v-model="form.alt_text"
                                label="Texto alternativo"
                            />
                            <TcSelect
                                id="zone"
                                v-model="form.zone"
                                label="Zona en la plantilla"
                                placeholder="Seleccionar categoría primero"
                                :required="!!zoneOptions.length"
                                :disabled="!zoneOptions.length"
                                :options="
                                    zoneOptions.map((z) => ({
                                        value: z.value,
                                        label: z.label,
                                    }))
                                "
                                :error="form.errors.zone"
                                :hint="
                                    zoneOptions.length
                                        ? 'Obligatoria: si no eliges zona, el platillo no aparecerá en el menú público aunque tenga imagen y precio.'
                                        : 'Esta plantilla no usa zonas — el platillo se muestra en el orden de la lista.'
                                "
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Precio">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="tc-field">
                                <label for="price"
                                    >Precio
                                    <span class="text-[var(--tc-pink)]"
                                        >*</span
                                    ></label
                                >
                                <div class="relative">
                                    <span
                                        class="absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-gray-400"
                                        >$</span
                                    >
                                    <input
                                        id="price"
                                        v-model="form.price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        class="tc-input pl-8"
                                        :class="{
                                            'border-[var(--tc-pink)]':
                                                form.errors.price,
                                        }"
                                    />
                                </div>
                                <p
                                    v-if="form.errors.price"
                                    class="mt-0.5 text-xs text-[var(--tc-pink)]"
                                >
                                    {{ form.errors.price }}
                                </p>
                            </div>
                            <TcInput
                                id="price_label"
                                v-model="form.price_label"
                                label="Etiqueta del precio"
                            />
                        </div>
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <TcInput
                                id="price_secondary"
                                v-model="form.price_secondary"
                                type="number"
                                min="0"
                                step="0.01"
                                label="Precio secundario"
                            />
                            <TcInput
                                id="price_secondary_label"
                                v-model="form.price_secondary_label"
                                label="Etiqueta del precio secundario"
                            />
                            <TcInput
                                id="presentation"
                                v-model="form.presentation"
                                label="Presentación / unidad"
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Detalles">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="badge"
                                v-model="form.badge"
                                label="Insignia"
                            />
                            <div class="space-y-2">
                                <TcInput
                                    id="choice_label"
                                    v-model="form.choice_label"
                                    label="Etiqueta de elección"
                                />
                                <TcSwitch
                                    :model-value="!form.choice_label_hidden"
                                    label="Etiqueta visible"
                                    description="Ocultarla no borra el texto"
                                    @update:model-value="
                                        form.choice_label_hidden = !$event
                                    "
                                />
                            </div>
                        </div>
                        <TcTextarea
                            id="ingredients"
                            v-model="form.ingredients"
                            label="Ingredientes / opciones"
                            :rows="2"
                        />
                        <TcSwitch
                            :model-value="!form.ingredients_hidden"
                            label="Ingredientes visibles"
                            description="Ocultarlos no borra el texto"
                            @update:model-value="
                                form.ingredients_hidden = !$event
                            "
                        />
                    </AdminFormSection>

                    <AdminFormSection title="Configuración">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <TcSwitch
                                v-model="form.is_active"
                                label="Activo"
                                description="Visible en el menú"
                            />
                            <TcSwitch
                                :model-value="!form.image_hidden"
                                label="Imagen visible"
                                description="Nombre/precio siguen mostrándose si se oculta"
                                @update:model-value="
                                    form.image_hidden = !$event
                                "
                            />
                            <TcSwitch
                                v-model="form.is_featured"
                                label="Destacado"
                                description="Aparece como especial"
                            />
                        </div>
                        <p class="text-xs text-gray-400">
                            El orden dentro de la categoría se controla
                            arrastrando los platillos en el listado.
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
                                    : 'Actualizar platillo'
                            }}
                        </button>
                        <Link href="/admin/menu-items" class="tc-btn-secondary"
                            >Cancelar</Link
                        >
                    </div>
                </div>
            </div>
        </form>
    </div>

    <TcMediaLibraryModal
        :open="mediaLibraryOpen"
        title="Elegir imagen del platillo"
        @close="mediaLibraryOpen = false"
        @picked="onLibraryPicked"
    />
</template>
