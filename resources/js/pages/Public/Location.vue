<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';
import { bgLocation, tornPaperLarge } from '@/lib/tres-cantares-assets';

const props = defineProps<{
    settings: Record<string, any>
}>();

const setting = (key: string, fallback = '') => props.settings?.[key] ?? fallback;
</script>

<template>
    <Head title="Ubicación" />

    <!-- ============================================================
         HERO
    ============================================================ -->
    <section class="relative min-h-[420px] lg:min-h-[480px] flex flex-col">

        <!-- Background -->
        <div class="absolute inset-0 overflow-hidden">
            <img
                v-if="settings.location_background_url || settings.location_background"
                :src="settings.location_background_url || settings.location_background"
                alt="Ubicación Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <img
                v-else
                :src="bgLocation"
                alt="Ubicación Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <div class="absolute inset-0 hero-overlay"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 flex-1 flex flex-col items-center justify-center py-16 px-4 text-center">
            <!-- Decorative dots -->
            <div class="flex items-center gap-4 mb-2">
                <span class="font-display text-white/60 tracking-widest text-lg">•</span>
                <h1 class="font-display text-6xl lg:text-8xl xl:text-9xl text-white tracking-[0.12em] drop-shadow-2xl">
                    UBICACIÓN
                </h1>
                <span class="font-display text-white/60 tracking-widest text-lg">•</span>
            </div>
        </div>

        <!-- Torn paper bottom -->
        <div class="absolute bottom-0 left-0 right-0 z-20 leading-[0] pointer-events-none">
            <img :src="tornPaperLarge" alt="" class="w-full block" style="transform: scaleY(-1); height: 60px; object-fit: fill;" />
        </div>
    </section>

    <!-- ============================================================
         DIVIDER
    ============================================================ -->
    <DecorativeDivider />

    <!-- ============================================================
         MAPA Y DATOS
    ============================================================ -->
    <section class="py-16 lg:py-24" style="background-color: var(--tc-paper);">
        <div class="max-w-5xl mx-auto px-6">

            <!-- Google Maps -->
            <div class="w-full rounded-2xl overflow-hidden shadow-xl mb-14 border-4"
                style="border-color: var(--tc-yellow);">
                <template v-if="settings.google_maps_embed_url">
                    <iframe
                        :src="settings.google_maps_embed_url"
                        class="w-full h-80 sm:h-96"
                        style="border:0"
                        allowfullscreen
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </template>
                <div v-else
                    class="w-full h-80 sm:h-96 flex flex-col items-center justify-center gap-4"
                    style="background-color: var(--tc-paper-light);">
                    <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    <p class="font-body text-sm text-gray-400">
                        Configura el mapa en el panel de administración
                    </p>
                </div>
            </div>

            <!-- Info blocks -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

                <!-- Teléfono -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border-t-4 transition-shadow hover:shadow-lg"
                    style="border-color: var(--tc-green);">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                        style="background-color: color-mix(in srgb, var(--tc-green) 12%, transparent);">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style="color: var(--tc-green);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-[0.2em] text-lg mb-2" style="color: var(--tc-dark);">TELÉFONO</h3>
                    <p class="font-body text-gray-600 text-sm">
                        {{ setting('contact_phone', '+52 777 153 1475') }}
                    </p>
                    <a v-if="settings.whatsapp_phone"
                        :href="`https://wa.me/${settings.whatsapp_phone}`"
                        target="_blank"
                        class="mt-3 inline-block text-sm font-body hover:underline"
                        style="color: var(--tc-green);">
                        WhatsApp →
                    </a>
                </div>

                <!-- Dirección -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border-t-4 transition-shadow hover:shadow-lg"
                    style="border-color: var(--tc-blue);">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                        style="background-color: color-mix(in srgb, var(--tc-blue) 12%, transparent);">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style="color: var(--tc-blue);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-[0.2em] text-lg mb-2" style="color: var(--tc-dark);">DIRECCIÓN</h3>
                    <p class="font-body text-gray-600 text-sm">
                        {{ setting('address', 'Pino González 1, La Santísima, 62520 Tepoztlán, Mor.') }}
                    </p>
                </div>

                <!-- Horario -->
                <div class="bg-white rounded-xl p-6 shadow-md text-center border-t-4 transition-shadow hover:shadow-lg"
                    style="border-color: var(--tc-pink);">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                        style="background-color: color-mix(in srgb, var(--tc-pink) 12%, transparent);">
                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                            style="color: var(--tc-pink);">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <h3 class="font-display tracking-[0.2em] text-lg mb-2" style="color: var(--tc-dark);">HORARIO</h3>
                    <p class="font-body text-gray-600 text-sm whitespace-pre-line">
                        {{ setting('schedule', 'Lunes a Domingo, 08:00 a 22:00 hrs.') }}
                    </p>
                </div>
            </div>
        </div>
    </section>
</template>
