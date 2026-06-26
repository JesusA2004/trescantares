<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcImageUpload from '@/components/tc/TcImageUpload.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';

const props = defineProps<{
    category: {
        id: number;
        name: string;
        slug: string;
        description: string | null;
        image_url: string | null;
        icon: string | null;
        color: string | null;
        sort_order: number;
        is_active: boolean;
    };
}>();

const form = useForm({
    name: props.category.name,
    description: props.category.description ?? '',
    icon: props.category.icon ?? '',
    color: props.category.color ?? '#144e8f',
    image: null as File | null,
    sort_order: props.category.sort_order,
    is_active: props.category.is_active,
    _method: 'PUT',
});

function handleImage(file: File | null) {
    form.image = file;
}

function submit() {
    form.post(`/admin/categories/${props.category.id}`, { forceFormData: true });
}
</script>

<template>
    <Head :title="`Editar: ${category.name}`" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader :title="`Editar: ${category.name}`" description="Modifica los datos de la categoría">
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
                    :error="form.errors.name"
                />
                <TcTextarea
                    id="description"
                    v-model="form.description"
                    label="Descripción"
                    :rows="3"
                />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput
                        id="icon"
                        v-model="form.icon"
                        label="Ícono (nombre Lucide, opcional)"
                        placeholder="Ej: Soup, Salad, Coffee…"
                    />
                    <div class="tc-field">
                        <label for="color">Color de la categoría</label>
                        <div class="flex items-center gap-3">
                            <input
                                id="color"
                                v-model="form.color"
                                type="color"
                                class="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                            />
                            <span class="tc-input flex-1 text-gray-500 text-sm">{{ form.color }}</span>
                        </div>
                    </div>
                </div>
            </AdminFormSection>

            <AdminFormSection title="Imagen">
                <TcImageUpload
                    label="Imagen de categoría"
                    hint="Dejar sin cambios para conservar la imagen actual. JPG, PNG, WEBP · Máx. 4MB"
                    :current-url="category.image_url"
                    :max-mb="4"
                    :error="form.errors.image"
                    @change="handleImage"
                />
            </AdminFormSection>

            <AdminFormSection title="Configuración">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput
                        id="sort_order"
                        v-model="form.sort_order"
                        type="number"
                        label="Orden de aparición"
                    />
                    <div class="flex items-end pb-1">
                        <TcSwitch
                            v-model="form.is_active"
                            label="Categoría activa"
                            description="Visible en el menú público"
                        />
                    </div>
                </div>
            </AdminFormSection>

            <div class="flex gap-3">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Actualizar categoría' }}
                </button>
                <Link href="/admin/categories" class="tc-btn-secondary">Cancelar</Link>
            </div>

        </form>
    </div>
</template>
