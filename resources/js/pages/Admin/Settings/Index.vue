<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import { ref } from 'vue';

const props = defineProps<{
    settings: Record<string, any>
    imageKeys: string[]
}>();

const form = useForm({
    restaurant_name: props.settings.restaurant_name ?? '',
    contact_phone: props.settings.contact_phone ?? '',
    whatsapp_phone: props.settings.whatsapp_phone ?? '',
    address: props.settings.address ?? '',
    google_maps_embed_url: props.settings.google_maps_embed_url ?? '',
    schedule: props.settings.schedule ?? '',
    facebook_url: props.settings.facebook_url ?? '',
    instagram_url: props.settings.instagram_url ?? '',
    tiktok_url: props.settings.tiktok_url ?? '',
    logo: null as File | null,
    hero_background: null as File | null,
    location_background: null as File | null,
    _method: 'POST',
});

const previews: Record<string, string | null> = {
    logo: props.settings.logo_url ?? null,
    hero_background: props.settings.hero_background_url ?? null,
    location_background: props.settings.location_background_url ?? null,
};

const previewRefs = ref({ ...previews });

function handleImage(key: string, e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
        (form as any)[key] = file;
        previewRefs.value[key] = URL.createObjectURL(file);
    }
}

function submit() {
    form.post('/admin/settings', { forceFormData: true });
}

const imageLabels: Record<string, string> = {
    logo: 'Logo del Restaurante',
    hero_background: 'Imagen de Fondo del Hero',
    location_background: 'Imagen de Fondo de Ubicación',
};
</script>

<template>
    <Head title="Configuración del Sitio" />

    <div class="max-w-3xl space-y-6">
        <h1 class="text-2xl font-semibold">Configuración del Sitio</h1>

        <form @submit.prevent="submit" class="space-y-6">
            <!-- Datos básicos -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                <h2 class="font-semibold text-gray-800 text-lg border-b pb-3">Información del Restaurante</h2>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
                        <input v-model="form.restaurant_name" type="text"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Teléfono de Contacto</label>
                        <input v-model="form.contact_phone" type="text"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">WhatsApp (solo números)</label>
                        <input v-model="form.whatsapp_phone" type="text"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                        <input v-model="form.address" type="text"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                    <textarea v-model="form.schedule" rows="4" placeholder="Lunes a Jueves: 1pm – 10pm&#10;Viernes y Sábado: 1pm – 12am"
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Google Maps Embed URL</label>
                    <textarea v-model="form.google_maps_embed_url" rows="3" placeholder="https://www.google.com/maps/embed?pb=..."
                        class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono"></textarea>
                    <p class="mt-1 text-xs text-gray-400">Copia el src del iframe de Google Maps.</p>
                </div>
            </div>

            <!-- Redes sociales -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
                <h2 class="font-semibold text-gray-800 text-lg border-b pb-3">Redes Sociales</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
                        <input v-model="form.facebook_url" type="url"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
                        <input v-model="form.instagram_url" type="url"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">TikTok URL</label>
                        <input v-model="form.tiktok_url" type="url"
                            class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
            </div>

            <!-- Imágenes -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                <h2 class="font-semibold text-gray-800 text-lg border-b pb-3">Imágenes</h2>

                <div v-for="key in imageKeys" :key="key" class="flex items-start gap-4">
                    <div class="w-28 h-20 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <img v-if="previewRefs[key]" :src="previewRefs[key]!" class="w-full h-full object-cover" />
                        <svg v-else class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <label class="block text-sm font-medium text-gray-700 mb-1">{{ imageLabels[key] }}</label>
                        <input type="file" accept="image/*" @change="(e) => handleImage(key, e)"
                            class="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        <p class="mt-1 text-xs text-gray-400">JPG, PNG, WEBP. Máx. 5MB. Dejar vacío para conservar la imagen actual.</p>
                    </div>
                </div>
            </div>

            <div class="flex gap-3">
                <button type="submit" :disabled="form.processing"
                    class="bg-blue-600 text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {{ form.processing ? 'Guardando...' : 'Guardar Configuración' }}
                </button>
            </div>
        </form>
    </div>
</template>
