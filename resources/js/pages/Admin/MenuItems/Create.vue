<script setup lang="ts">
import { ref } from 'vue';
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ImagePlus, Star, Trash2, X } from 'lucide-vue-next';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';

const props = defineProps<{
    categories: { id: number; name: string }[];
}>();

const categoryOptions = props.categories.map((c) => ({ value: c.id, label: c.name }));

const form = useForm({
    menu_category_id: '' as string | number,
    name: '',
    description: '',
    badge: '',
    price: '' as string | number,
    ingredients: '',
    is_featured: false,
    is_active: true,
    sort_order: 0,
    images: [] as File[],
    primary_image_index: 0,
});

interface Preview {
    url: string;
    file: File;
    isPrimary: boolean;
}

const previews = ref<Preview[]>([]);
const dropzone = ref<HTMLDivElement>();

function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    arr.forEach((file) => {
        if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) return;
        const url = URL.createObjectURL(file);
        previews.value.push({ url, file, isPrimary: previews.value.length === 0 });
        form.images.push(file);
    });
    form.primary_image_index = previews.value.findIndex((p) => p.isPrimary);
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
    previews.value.forEach((p, i) => { p.isPrimary = i === idx; });
    form.primary_image_index = idx;
}

function submit() {
    form.post('/admin/menu-items', { forceFormData: true });
}
</script>

<template>
    <Head title="Nuevo Platillo" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Nuevo Platillo" description="Agrega un platillo al menú">
            <template #label>Platillos</template>
            <template #actions>
                <Link href="/admin/menu-items" class="tc-btn-secondary">← Volver</Link>
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit">
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">

                <!-- Left: images -->
                <div class="xl:col-span-1 space-y-4">
                    <div class="tc-admin-card p-5">
                        <h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <ImagePlus class="w-4 h-4 text-[var(--tc-blue)]" />
                            Imágenes del platillo
                        </h3>

                        <!-- Dropzone -->
                        <div
                            ref="dropzone"
                            class="border-2 border-dashed border-amber-200 rounded-xl p-6 text-center cursor-pointer hover:border-[var(--tc-blue)] hover:bg-blue-50/30 transition-colors"
                            @dragover.prevent
                            @drop="onDrop"
                            @click="($refs.fileInput as HTMLInputElement).click()"
                        >
                            <ImagePlus class="w-8 h-8 text-amber-300 mx-auto mb-2" />
                            <p class="text-sm text-gray-500">Arrastra imágenes o haz clic</p>
                            <p class="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · máx 4 MB por imagen</p>
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
                        <div v-if="previews.length" class="mt-4 grid grid-cols-2 gap-2">
                            <div
                                v-for="(preview, idx) in previews"
                                :key="preview.url"
                                class="relative group rounded-xl overflow-hidden border-2 transition-colors"
                                :class="preview.isPrimary ? 'border-[var(--tc-blue)]' : 'border-transparent'"
                            >
                                <img :src="preview.url" :alt="`Imagen ${idx + 1}`" class="w-full aspect-square object-cover" />
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                                <!-- Primary badge -->
                                <div v-if="preview.isPrimary" class="absolute top-1.5 left-1.5">
                                    <span class="tc-badge tc-badge-blue text-[10px] flex items-center gap-1">
                                        <Star class="w-2.5 h-2.5" fill="currentColor" /> Principal
                                    </span>
                                </div>
                                <!-- Actions -->
                                <div class="absolute bottom-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        v-if="!preview.isPrimary"
                                        type="button"
                                        class="w-6 h-6 rounded-lg bg-amber-400 text-white flex items-center justify-center"
                                        title="Marcar como principal"
                                        @click.stop="setPrimary(idx)"
                                    >
                                        <Star class="w-3 h-3" />
                                    </button>
                                    <button
                                        type="button"
                                        class="w-6 h-6 rounded-lg bg-red-500 text-white flex items-center justify-center"
                                        title="Eliminar"
                                        @click.stop="removeImage(idx)"
                                    >
                                        <X class="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <p class="text-xs text-gray-400 mt-2">
                            La imagen marcada con ⭐ se mostrará en el menú público.
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
                                        placeholder="0.00"
                                    />
                                </div>
                                <p v-if="form.errors.price" class="text-xs text-[var(--tc-pink)] mt-0.5">{{ form.errors.price }}</p>
                            </div>
                            <TcInput
                                id="badge"
                                v-model="form.badge"
                                label="Etiqueta"
                                placeholder="Ej: Nuevo, Popular, Chef's pick…"
                                hint="Badge visible en el menú"
                            />
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Detalles">
                        <TcTextarea
                            id="ingredients"
                            v-model="form.ingredients"
                            label="Ingredientes"
                            placeholder="Ej: pollo, chile ancho, crema, queso…"
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
                                hint="Menor número = primero"
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
                            {{ form.processing ? 'Guardando…' : 'Crear platillo' }}
                        </button>
                        <Link href="/admin/menu-items" class="tc-btn-secondary">Cancelar</Link>
                    </div>
                </div>

            </div>
        </form>
    </div>
</template>
