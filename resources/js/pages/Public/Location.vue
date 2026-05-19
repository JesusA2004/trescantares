<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

const props = defineProps<{
    settings: Record<string, any>
}>();

const setting = (key: string, fallback = '') => props.settings?.[key] ?? fallback;
</script>

<template>
    <Head title="Ubicación" />

    <!-- Hero con fondo oscuro -->
    <section class="relative min-h-[320px] flex flex-col items-center justify-center">
        <div class="absolute inset-0 overflow-hidden">
            <img v-if="settings.location_background_url || settings.location_background"
                :src="settings.location_background_url || settings.location_background"
                alt="Ubicación Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 via-slate-700 to-gray-900"></div>
            <div class="absolute inset-0 hero-overlay"></div>
        </div>
        <div class="relative z-10 text-center pt-28 pb-16 px-4">
            <h1 class="font-display text-6xl lg:text-8xl text-white tracking-widest drop-shadow-2xl">
                UBICACIÓN
            </h1>
        </div>
    </section>

    <!-- Mapa y datos -->
    <section class="tc-section bg-papel">
        <div class="max-w-5xl mx-auto px-6">
            <!-- Google Maps -->
            <div class="w-full rounded-2xl overflow-hidden shadow-xl mb-12 border border-gray-200">
                <template v-if="settings.google_maps_embed_url">
                    <iframe
                        :src="settings.google_maps_embed_url"
                        class="w-full h-96"
                        style="border:0"
                        allowfullscreen
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </template>
                <div v-else
                    class="w-full h-96 bg-gray-100 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <p class="font-body text-sm">Mapa disponible próximamente</p>
                </div>
            </div>

            <!-- Info blocks -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <!-- Teléfono -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border border-gray-100">
                    <div class="w-12 h-12 bg-tc-verde/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-tc-verde" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-wider text-tc-oscuro text-lg mb-2">TELÉFONO</h3>
                    <p class="font-body text-gray-600 text-sm">{{ setting('contact_phone', 'No disponible') }}</p>
                    <a v-if="settings.whatsapp_phone" :href="`https://wa.me/${settings.whatsapp_phone}`"
                        target="_blank" class="mt-2 inline-block text-tc-verde font-body text-sm hover:underline">
                        WhatsApp
                    </a>
                </div>

                <!-- Dirección -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border border-gray-100">
                    <div class="w-12 h-12 bg-tc-azul/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-tc-azul" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-wider text-tc-oscuro text-lg mb-2">DIRECCIÓN</h3>
                    <p class="font-body text-gray-600 text-sm">{{ setting('address', 'Consulta nuestras redes.') }}</p>
                </div>

                <!-- Horario -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border border-gray-100">
                    <div class="w-12 h-12 bg-tc-rojo/10 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg class="w-6 h-6 text-tc-rojo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-wider text-tc-oscuro text-lg mb-2">HORARIO</h3>
                    <p class="font-body text-gray-600 text-sm whitespace-pre-line">{{ setting('schedule', 'Consulta nuestras redes.') }}</p>
                </div>
            </div>
        </div>
    </section>
</template>
