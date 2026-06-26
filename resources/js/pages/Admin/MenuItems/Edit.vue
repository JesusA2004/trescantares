<script setup lang="ts">
import { ref } from 'vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ImagePlus, Star, X } from 'lucide-vue-next';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';

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
        slug: string;
        menu_category_id: number;
        description: string | null;
        badge: string | null;
        price: string | number;
        image_url: string | null;
        ingredients: string | null;
        is_featured: boolean;
        is_active: boolean;
        sort_order: number;
        gallery: GalleryImage[];
    };
    categories: { id: number; name: string }[];
}>();

const categoryOptions = props.categories.map((c) => ({ value: c.id, label: c.name }));

const form = useForm({
    menu_category_id: props.item.menu_category_id,
    name: props.item.name,
    description: props.item.description ?? '',
    badge: props.item.badge ?? '',
    price: props.item.price,
    ingredients: props.item.ingredients ?? '',
    is_featured: props.item.is_featured,
    is_active: props.item.is_active,
    sort_order: props.item.sort_order,
    _method: 'PUT',
    delete_image_ids: [] as number[],
    primary_image_id: props.item.gallery.find((g) => g.is_primary)?.id ?? null as number | null,
    new_images: [] as File[],
});

// Gallery state (existing images)
const gallery = ref<GalleryImage[]>(props.item.gallery.map((g) => ({ ...g })));

// New image previews
interface NewPreview { url: string; file: File }
const newPreviews = ref<NewPreview[]>([]);

function handleFiles(files: FileList | File[]) {
    Array.from(files).forEach((file) => {
        if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) return;
        newPreviews.value.push({ url: URL.createObjectURL(file), file });
        form.new_images.push(file);
    });
}

function onFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) handleFiles(input.files);
    input.value = '';
}

function onDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
}

function markDeleteExisting(id: number) {
    if (!form.delete_image_ids.includes(id)) form.delete_image_ids.push(id);
    if (form.primary_image_id === id) form.primary_image_id = null;
}

function setPrimaryExisting(id: number) {
    gallery.value.forEach((g) => { g.is_primary = g.id === id; });
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

        <AdminPageHeader :title="`Editar: ${item.name}`" description="Modifica los datos del platillo">
            <template #label>Platillos</template>
            <template #actions>
                <Link href="/admin/menu-items" class="tc-btn-secondary">← Volver</Link>
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">

                <!-- Left: gallery manager -->
                <div class="xl:col-span-1 space-y-4">
                    <div class="tc-admin-card p-5">
                        <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <ImagePlus class="w-4 h-4 text-[var(--tc-blue)]" />
                            Galería de imágenes
                        </h3>

                        <!-- Existing images -->
                        <div v-if="gallery.length" class="grid grid-cols-2 gap-2 mb-4">
                            <div
                                v-for="img in gallery"
                                :key="img.id"
                                class="relative group rounded-xl overflow-hidden border-2 transition-all"
                                :class="[
                                    isMarkedDelete(img.id) ? 'border-red-300 opacity-40' : img.is_primary ? 'border-[var(--tc-blue)]' : 'border-transparent',
                                ]"
                            >
                                <img :src="img.image_url" :alt="img.alt_text ?? item.name" class="w-full aspect-square object-cover" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                                <div v-if="img.is_primary && !isMarkedDelete(img.id)" class="absolute top-1.5 left-1.5">
                                    <span class="tc-badge tc-badge-blue text-[10px] flex items-center gap-1">
                                        <Star class="w-2.5 h-2.5" fill="currentColor" /> Principal
                                    </span>
                                </div>
                                <div v-if="isMarkedDelete(img.id)" class="absolute inset-0 flex items-center justify-center">
                                    <span class="tc-badge tc-badge-pink text-[10px]">Se eliminará</span>
                                </div>
                                <div v-else class="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        v-if="!img.is_primary"
                                        type="button"
                                        class="w-6 h-6 rounded-lg bg-amber-400 text-white flex items-center justify-center"
                                        title="Marcar como principal"
                                        @click.stop="setPrimaryExisting(img.id)"
                                    >
                                        <Star class="w-3 h-3" />
                                    </button>
                                    <button
                                        type="button"
                                        class="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center"
                                        title="Eliminar"
                                        @click.stop="markDeleteExisting(img.id)"
                                    >
                                        <X class="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Fallback legacy image -->
                        <div v-else-if="item.image_url" class="mb-4">
                            <p class="text-xs text-gray-500 mb-2">Imagen actual (legacy):</p>
                            <img :src="item.image_url" :alt="item.name" class="w-full max-h-40 object-cover rounded-xl" />
                        </div>

                        <!-- New images previews -->
                        <div v-if="newPreviews.length" class="grid grid-cols-2 gap-2 mb-3">
                            <div
                                v-for="(preview, idx) in newPreviews"
                                :key="preview.url"
                                class="relative group rounded-xl overflow-hidden border-2 border-green-300"
                            >
                                <img :src="preview.url" alt="Nueva imagen" class="w-full aspect-square object-cover" />
                                <div class="absolute top-1.5 left-1.5">
                                    <span class="tc-badge tc-badge-green text-[10px]">Nueva</span>
                                </div>
                                <button
                                    type="button"
                                    class="absolute top-1.5 right-1.5 w-5 h-5 rounded-lg bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    @click.stop="removeNewPreview(idx)"
                                >
                                    <X class="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <!-- Dropzone -->
                        <div
                            class="border-2 border-dashed border-amber-200 rounded-xl p-4 text-center cursor-pointer hover:border-[var(--tc-blue)] hover:bg-blue-50/30 transition-colors"
                            @dragover.prevent
                            @drop="onDrop"
                            @click="($refs.newFileInput as HTMLInputElement).click()"
                        >
                            <ImagePlus class="w-5 h-5 text-amber-300 mx-auto mb-1" />
                            <p class="text-xs text-gray-500">Agregar más imágenes</p>
                        </div>
                        <input
                            ref="newFileInput"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            class="hidden"
                            @change="onFileInput"
                        />

                        <p class="text-xs text-gray-400 mt-2">
                            Haz click en ⭐ para cambiar la imagen principal. La imagen marcada se muestra en el menú.
                        </p>
                    </div>
                </div>

                <!-- Right: form fields -->
                <div class="xl:col-span-2 space-y-4">
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
                            :rows="3"
                        />
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="tc-field">
                                <label for="price">Precio <span class="text-[var(--tc-pink)]">*</span></label>
                                <div class="relative">
                                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                                    <input
                                        id="price"
                                        v-model="form.price"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        class="tc-input pl-8"
                                        :class="{ 'border-[var(--tc-pink)]': form.errors.price }"
                                    />
                                </div>
                                <p v-if="form.errors.price" class="text-xs text-[var(--tc-pink)] mt-0.5">{{ form.errors.price }}</p>
                            </div>
                            <TcInput
                                id="badge"
                                v-model="form.badge"
                                label="Etiqueta"
                                placeholder="Ej: Nuevo, Popular…"
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Detalles">
                        <TcTextarea
                            id="ingredients"
                            v-model="form.ingredients"
                            label="Ingredientes"
                            :rows="2"
                        />
                    </AdminFormSection>

                    <AdminFormSection title="Configuración">
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <TcInput
                                id="sort_order"
                                v-model="form.sort_order"
                                type="number"
                                label="Orden"
                            />
                            <div class="flex items-end pb-1">
                                <TcSwitch v-model="form.is_active" label="Activo" description="Visible en el menú" />
                            </div>
                            <div class="flex items-end pb-1">
                                <TcSwitch v-model="form.is_featured" label="Destacado" description="Aparece como especial" />
                            </div>
                        </div>
                    </AdminFormSection>

                    <div class="flex gap-3">
                        <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                            {{ form.processing ? 'Guardando…' : 'Actualizar platillo' }}
                        </button>
                        <Link href="/admin/menu-items" class="tc-btn-secondary">Cancelar</Link>
                    </div>
                </div>

            </div>
        </form>
    </div>
</template>
