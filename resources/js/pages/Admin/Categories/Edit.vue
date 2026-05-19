<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps<{
    category: any
}>();

const form = useForm({
    name: props.category.name,
    description: props.category.description ?? '',
    image: null as File | null,
    sort_order: props.category.sort_order,
    is_active: props.category.is_active,
    _method: 'PUT',
});

const imagePreview = ref<string | null>(props.category.image_url ?? null);

function handleImage(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        form.image = file;
        imagePreview.value = URL.createObjectURL(file);
    }
}

function submit() {
    form.post(`/admin/categories/${props.category.id}`, {
        forceFormData: true,
    });
}
</script>

<template>
    <Head title="Editar Categoría" />

    <div class="max-w-2xl space-y-6">
        <div class="flex items-center justify-between">
            <h1 class="text-2xl font-semibold">Editar Categoría</h1>
            <Link href="/admin/categories" class="text-sm text-gray-500 hover:text-gray-700">← Volver</Link>
        </div>

        <form @submit.prevent="submit" class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input v-model="form.name" type="text" required
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p v-if="form.errors.name" class="mt-1 text-xs text-red-600">{{ form.errors.name }}</p>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea v-model="form.description" rows="3"
                    class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Imagen</label>
                <div class="flex items-start gap-4">
                    <div class="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <img v-if="imagePreview" :src="imagePreview" class="w-full h-full object-cover" />
                        <svg v-else class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <input type="file" accept="image/*" @change="handleImage"
                            class="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        <p class="mt-1 text-xs text-gray-400">Dejar vacío para conservar la imagen actual.</p>
                        <p v-if="form.errors.image" class="mt-1 text-xs text-red-600">{{ form.errors.image }}</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                    <input v-model.number="form.sort_order" type="number" min="0"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div class="flex items-end pb-2">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input v-model="form.is_active" type="checkbox"
                            class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                        <span class="text-sm font-medium text-gray-700">Activo</span>
                    </label>
                </div>
            </div>

            <div class="flex gap-3 pt-2">
                <button type="submit" :disabled="form.processing"
                    class="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {{ form.processing ? 'Guardando...' : 'Actualizar Categoría' }}
                </button>
                <Link href="/admin/categories"
                    class="px-6 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                    Cancelar
                </Link>
            </div>
        </form>
    </div>
</template>
