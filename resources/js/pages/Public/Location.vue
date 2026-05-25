<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { computed } from 'vue';
import { bgLocation } from '@/lib/tres-cantares-assets';
import Navbar from '@/components/Public/Navbar.vue';
import Footer from '@/components/Public/Footer.vue';

defineOptions({
    layout: null as any,
});

const props = defineProps<{
    settings: Record<string, any>;
}>();

const setting = (key: string, fallback = '') =>
    props.settings?.[key] ?? fallback;

const mapSrc = computed(() => {
    return (
        setting('google_maps_embed_url') ||
        setting('google_map_embed_url') ||
        setting('maps_embed_url') ||
        'https://www.google.com/maps?q=Arq.%20Pablo%20Gonz%C3%A1lez%201,%20La%20Sant%C3%ADsima,%20Tepoztl%C3%A1n,%20Mor.&output=embed'
    );
});
</script>

<template>
    <Head>
        <title>Ubicación</title>

        <meta
            head-key="description"
            name="description"
            content="Encuéntranos en Arq. Pablo González 1, La Santísima, Tepoztlán, Morelos. Abiertos todos los días de 08:00 a 22:00 hrs. ¡Te esperamos en Tres Cantares!"
        />

        <meta
            head-key="keywords"
            name="keywords"
            content="ubicación Tres Cantares, dónde está Tres Cantares, restaurante Tepoztlán dirección, cómo llegar Tres Cantares, Pablo González Tepoztlán"
        />

        <meta
            head-key="og:title"
            property="og:title"
            content="Ubicación — Tres Cantares | Tepoztlán, Morelos"
        />

        <meta
            head-key="og:description"
            property="og:description"
            content="Nos encontramos en Arq. Pablo González 1, La Santísima, Tepoztlán, Morelos. Abiertos todos los días de 08:00 a 22:00 hrs."
        />

        <meta head-key="og:url" property="og:url" content="/ubicacion" />
        <meta head-key="og:type" property="og:type" content="website" />

        <meta
            head-key="twitter:title"
            name="twitter:title"
            content="Ubicación — Tres Cantares | Tepoztlán, Morelos"
        />

        <meta
            head-key="twitter:description"
            name="twitter:description"
            content="Nos encontramos en Tepoztlán, Morelos. Abiertos todos los días de 08:00 a 22:00 hrs. ¡Ven a Tres Cantares!"
        />

        <link head-key="canonical" rel="canonical" href="/ubicacion" />
    </Head>

    <main class="tc-location-page">
        <section
            class="tc-location-bg"
            :style="{
                backgroundImage: `linear-gradient(rgba(0,0,0,.58), rgba(0,0,0,.72)), url(${
                    settings.location_background_url ||
                    settings.location_background ||
                    bgLocation
                })`,
            }"
        >
            <!-- Navbar propio de ubicación. No usa PublicLayout. -->
            <Navbar :settings="settings" />

            <!-- HERO UBICACIÓN -->
            <section class="tc-location-hero">
                <div class="tc-location-hero-content">
                    <div class="tc-location-title-wrap">
                        <span class="tc-location-star">✦</span>
                        <h1 class="tc-location-title">UBICACIÓN</h1>
                        <span class="tc-location-star">✦</span>
                    </div>
                </div>
            </section>

            <!-- MAPA + DATOS -->
            <section class="tc-location-map-section">
                <div class="tc-location-map-wrap">
                    <iframe
                        :src="mapSrc"
                        class="tc-location-map"
                        style="border: 0"
                        allowfullscreen
                        loading="lazy"
                        referrerpolicy="no-referrer-when-downgrade"
                    />
                </div>

                <div class="tc-location-info-row">
                    <!-- Teléfono -->
                    <div class="tc-location-info-item">
                        <div class="tc-location-info-icon">
                            <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                />
                            </svg>
                        </div>

                        <div class="tc-location-info-text">
                            <h3>TELÉFONO</h3>
                            <p>
                                {{
                                    setting('contact_phone', '+52 777 153 1475')
                                }}
                            </p>
                        </div>
                    </div>

                    <!-- Dirección -->
                    <div class="tc-location-info-item tc-location-info-address">
                        <div class="tc-location-info-icon">
                            <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </div>

                        <div class="tc-location-info-text">
                            <h3>DIRECCIÓN</h3>
                            <p>
                                {{
                                    setting(
                                        'address',
                                        'Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.',
                                    )
                                }}
                            </p>
                        </div>
                    </div>

                    <!-- Horario -->
                    <div class="tc-location-info-item">
                        <div class="tc-location-info-icon">
                            <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </div>

                        <div class="tc-location-info-text">
                            <h3>HORARIO</h3>
                            <p>
                                {{
                                    setting(
                                        'schedule',
                                        'Lunes a Domingo, 08:00 a 22:00 hrs.',
                                    )
                                }}
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </section>

        <!-- Footer propio de ubicación con torn-paper-large arriba -->
        <Footer :settings="settings" :torn-top="true" />
    </main>
</template>
