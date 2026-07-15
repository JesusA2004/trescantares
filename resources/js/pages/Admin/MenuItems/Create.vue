<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ImagePlus, Star, X } from 'lucide-vue-next';
import { ref, computed, watch } from 'vue';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import MenuLivePreview from '@/components/Public/Menu/MenuLivePreview.vue';
import type {
    MenuCategoryData,
    MenuItemData,
} from '@/components/Public/Menu/types';
import TcImagePositionEditor from '@/components/tc/TcImagePositionEditor.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcMediaLibraryModal from '@/components/tc/TcMediaLibraryModal.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';
import { zonesForLayout } from './zones';

const props = defineProps<{
    categories: MenuCategoryData[];
}>();

const categoryOptions = props.categories.map((c) => ({
    value: c.id,
    label: c.name,
}));

const form = useForm({
    menu_category_id: '' as string | number,
    zone: '',
    name: '',
    description: '',
    badge: '',
    choice_label: '',
    price: '' as string | number,
    price_label: '',
    price_secondary: '' as string | number,
    price_secondary_label: '',
    presentation: '',
    ingredients: '',
    alt_text: '',
    image_position_x: 50,
    image_position_y: 50,
    image_scale: 1,
    image_fit: 'contain',
    image_align: 'center',
    visual_size: 'md',
    is_featured: false,
    is_active: true,
    images: [] as File[],
    primary_image_index: 0,
    image_library_path: '',
});

const mediaLibraryOpen = ref(false);

function onLibraryPicked({ path, url }: { path: string; url: string }) {
    form.image_library_path = path;
    form.images = [];
    form.primary_image_index = 0;
    previews.value = [{ url, file: null as unknown as File, isPrimary: true }];
    mediaLibraryOpen.value = false;
}

const selectedCategory = computed(
    () =>
        props.categories.find((c) => c.id === Number(form.menu_category_id)) ??
        null,
);
const zoneOptions = computed(() =>
    zonesForLayout(selectedCategory.value?.layout),
);

// Si cambia la categoría (y por tanto la plantilla), la zona seleccionada deja
// de ser válida a menos que siga existiendo en la nueva lista.
watch(selectedCategory, (category) => {
    const valid = zonesForLayout(category?.layout).some(
        (z) => z.value === form.zone,
    );

    if (!valid) {
        form.zone = '';
    }
});

interface Preview {
    url: string;
    file: File;
    isPrimary: boolean;
}

const previews = ref<Preview[]>([]);
const dropzone = ref<HTMLDivElement>();

const primaryPreviewUrl = computed(
    () =>
        previews.value.find((p) => p.isPrimary)?.url ??
        previews.value[0]?.url ??
        null,
);

// Vista previa en vivo: la categoría seleccionada con sus platillos reales,
// más el platillo que se está creando (con sus valores actuales del formulario).
const previewCategory = computed<MenuCategoryData | null>(() => {
    if (!selectedCategory.value) {
        return null;
    }

    const draftItem: MenuItemData = {
        id: -1,
        name: form.name || 'Nombre del platillo',
        slug: '',
        zone: form.zone || null,
        price: form.price || 0,
        price_label: form.price_label || null,
        price_secondary: form.price_secondary || null,
        price_secondary_label: form.price_secondary_label || null,
        presentation: form.presentation || null,
        choice_label: form.choice_label || null,
        ingredients: form.ingredients || null,
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

    // El platillo en edición se antepone para que gane el primer puesto en las
    // zonas de un solo elemento (main, accompaniment, footer, sope…); en zonas
    // con varios elementos simplemente aparece junto a los ya existentes.
    return {
        ...selectedCategory.value,
        items: [draftItem, ...selectedCategory.value.items],
    };
});

function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    arr.forEach((file) => {
        if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
            return;
        }

        const url = URL.createObjectURL(file);
        previews.value.push({
            url,
            file,
            isPrimary: previews.value.length === 0,
        });
        form.images.push(file);
    });
    form.primary_image_index = previews.value.findIndex((p) => p.isPrimary);
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

function removeImage(idx: number) {
    URL.revokeObjectURL(previews.value[idx].url);
    const wasPrimary = previews.value[idx].isPrimary;
    previews.value.splice(idx, 1);
    form.images.splice(idx, 1);

    if (wasPrimary && previews.value.length > 0) {
        previews.value[0].isPrimary = true;
    }

    form.primary_image_index = previews.value.findIndex((p) => p.isPrimary);
}

function setPrimary(idx: number) {
    previews.value.forEach((p, i) => {
        p.isPrimary = i === idx;
    });
    form.primary_image_index = idx;
}

function submit() {
    form.post('/admin/menu-items', { forceFormData: true });
}
</script>

<template>
    <Head title="Nuevo Platillo" />

    <div class="tc-admin-page space-y-5">
        <AdminPageHeader
            title="Nuevo Platillo"
            description="Agrega un platillo al menú"
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
                <!-- Left: images -->
                <div class="space-y-4 xl:col-span-1">
                    <div class="tc-admin-card p-5">
                        <h3
                            class="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700"
                        >
                            <ImagePlus class="h-4 w-4 text-[var(--tc-blue)]" />
                            Imágenes del platillo
                        </h3>

                        <!-- Dropzone -->
                        <div
                            ref="dropzone"
                            class="cursor-pointer rounded-xl border-2 border-dashed border-amber-200 p-6 text-center transition-colors hover:border-[var(--tc-blue)] hover:bg-blue-50/30"
                            @dragover.prevent
                            @drop="onDrop"
                            @click="
                                ($refs.fileInput as HTMLInputElement).click()
                            "
                        >
                            <ImagePlus
                                class="mx-auto mb-2 h-8 w-8 text-amber-300"
                            />
                            <p class="text-sm text-gray-500">
                                Arrastra imágenes o haz clic
                            </p>
                            <p class="mt-1 text-xs text-gray-400">
                                JPG, PNG, WEBP · máx 6 MB por imagen
                            </p>
                        </div>
                        <input
                            ref="fileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            class="hidden"
                            @change="onFileInput"
                        />

                        <!-- Preview grid -->
                        <div
                            v-if="previews.length"
                            class="mt-4 grid grid-cols-2 gap-2"
                        >
                            <div
                                v-for="(preview, idx) in previews"
                                :key="preview.url"
                                class="group relative overflow-hidden rounded-xl border-2 transition-colors"
                                :class="
                                    preview.isPrimary
                                        ? 'border-[var(--tc-blue)]'
                                        : 'border-transparent'
                                "
                            >
                                <img
                                    :src="preview.url"
                                    :alt="`Imagen ${idx + 1}`"
                                    class="aspect-square w-full object-cover"
                                />
                                <div
                                    class="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/30"
                                />
                                <div
                                    v-if="preview.isPrimary"
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
                                    class="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <button
                                        v-if="!preview.isPrimary"
                                        type="button"
                                        class="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400 text-white"
                                        title="Marcar como principal"
                                        @click.stop="setPrimary(idx)"
                                    >
                                        <Star class="h-3 w-3" />
                                    </button>
                                    <button
                                        type="button"
                                        class="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white"
                                        title="Eliminar"
                                        @click.stop="removeImage(idx)"
                                    >
                                        <X class="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            class="tc-btn-secondary mt-2 text-xs"
                            @click="mediaLibraryOpen = true"
                        >
                            Elegir de biblioteca
                        </button>

                        <p class="mt-2 text-xs text-gray-400">
                            La imagen marcada con ⭐ se mostrará en el menú
                            público.
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
                            placeholder="Seleccionar categoría"
                            :options="categoryOptions"
                            :error="form.errors.menu_category_id"
                        />
                        <TcInput
                            id="name"
                            v-model="form.name"
                            label="Nombre del platillo"
                            required
                            placeholder="Ej: Enchiladas verdes, Pozole rojo…"
                            :error="form.errors.name"
                        />
                        <TcTextarea
                            id="description"
                            v-model="form.description"
                            label="Descripción"
                            placeholder="Describe brevemente el platillo…"
                            :rows="2"
                        />
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="alt_text"
                                v-model="form.alt_text"
                                label="Texto alternativo"
                                placeholder="Descripción para accesibilidad"
                            />
                            <TcSelect
                                id="zone"
                                v-model="form.zone"
                                label="Zona en la plantilla"
                                placeholder="Seleccionar categoría primero"
                                :disabled="!zoneOptions.length"
                                :options="
                                    zoneOptions.map((z) => ({
                                        value: z.value,
                                        label: z.label,
                                    }))
                                "
                                :error="form.errors.zone"
                                hint="Determina en qué parte de la página se ubica este platillo, según la plantilla de la categoría."
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
                                        placeholder="0.00"
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
                                placeholder="Ej: Blanco, Copa, Litro…"
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
                                placeholder="Ej: precio de botella"
                            />
                            <TcInput
                                id="price_secondary_label"
                                v-model="form.price_secondary_label"
                                label="Etiqueta del precio secundario"
                                placeholder="Ej: Botella, Medio litro…"
                            />
                            <TcInput
                                id="presentation"
                                v-model="form.presentation"
                                label="Presentación / unidad"
                                placeholder="Ej: 700 ml"
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Detalles">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcInput
                                id="badge"
                                v-model="form.badge"
                                label="Insignia"
                                placeholder="Ej: Nuevo, Popular, Chef's pick…"
                            />
                            <TcInput
                                id="choice_label"
                                v-model="form.choice_label"
                                label="Etiqueta de elección"
                                placeholder="Ej: TÚ ELIGES"
                            />
                        </div>
                        <TcTextarea
                            id="ingredients"
                            v-model="form.ingredients"
                            label="Ingredientes / opciones"
                            placeholder="Ej: pollo, chile ancho, crema, queso…"
                            :rows="2"
                        />
                    </AdminFormSection>

                    <AdminFormSection title="Configuración">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <TcSwitch
                                v-model="form.is_active"
                                label="Activo"
                                description="Visible en el menú"
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
                                    : 'Crear platillo'
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
