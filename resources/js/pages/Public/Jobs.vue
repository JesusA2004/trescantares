<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { bgLocation, tornPaperLarge, cardCantarito, cardNopal } from '@/lib/tres-cantares-assets';

defineProps<{ settings: Record<string, any> }>();

const WA_JOBS = 'https://wa.me/527772678443?text=Hola%2C%20me%20interesa%20conocer%20las%20vacantes%20disponibles%20en%20Tres%20Cantares.';
</script>

<template>
    <Head>
        <title>Bolsa de Trabajo — Tres Cantares | Únete a Nuestro Equipo</title>
        <meta head-key="description" name="description"
            content="Únete al equipo de Tres Cantares en Tepoztlán, Morelos. Pregunta por nuestras vacantes disponibles y forma parte de una experiencia culinaria única." />
        <meta head-key="og:title" property="og:title"
            content="Bolsa de Trabajo — Tres Cantares | Únete a Nuestro Equipo" />
        <meta head-key="og:description" property="og:description"
            content="¿Te apasiona la gastronomía mexicana? Únete al equipo de Tres Cantares en Tepoztlán. Contáctanos por WhatsApp para conocer nuestras vacantes." />
        <meta head-key="og:url" property="og:url" content="/bolsa-de-trabajo" />
        <meta head-key="twitter:title" name="twitter:title"
            content="Bolsa de Trabajo — Tres Cantares | Únete a Nuestro Equipo" />
        <meta head-key="twitter:description" name="twitter:description"
            content="Únete al equipo de Tres Cantares, Tepoztlán. Pregunta por nuestras vacantes vía WhatsApp." />
        <link head-key="canonical" rel="canonical" href="/bolsa-de-trabajo" />
    </Head>

    <!-- HERO -->
    <section class="tc-jobs-hero">
        <div class="tc-jobs-hero-bg">
            <img :src="bgLocation" alt="Bolsa de Trabajo Tres Cantares"
                class="w-full h-full object-cover object-center" loading="eager" />
            <div class="tc-jobs-hero-overlay"></div>
        </div>

        <!-- Lotería cards decorativas -->
        <img :src="cardNopal" alt="" class="tc-jobs-hero-card tc-jobs-card-left hidden md:block" loading="lazy" />
        <img :src="cardCantarito" alt="" class="tc-jobs-hero-card tc-jobs-card-right hidden md:block" loading="lazy" />

        <div class="tc-jobs-hero-content">
            <div class="tc-jobs-star-row">
                <span class="tc-jobs-star">✦</span>
                <span class="tc-jobs-eyebrow font-body">Tres Cantares · Tepoztlán</span>
                <span class="tc-jobs-star">✦</span>
            </div>
            <h1 class="tc-jobs-title font-display">BOLSA DE TRABAJO</h1>
            <p class="tc-jobs-hero-sub font-body">
                Únete al equipo, pregunta por nuestras vacantes
            </p>
            <a :href="WA_JOBS" target="_blank" rel="noopener noreferrer" class="tc-jobs-wa-btn font-body">
                <svg class="tc-jobs-wa-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Contáctanos por WhatsApp
            </a>
        </div>

        <div class="tc-jobs-torn-bottom">
            <img :src="tornPaperLarge" alt=""
                style="transform:scaleY(-1); width:100%; height:55px; object-fit:fill; display:block;" />
        </div>
    </section>

    <!-- CARDS SECTION -->
    <section class="tc-jobs-cards-section">
        <div class="tc-jobs-inner">

            <!-- Intro text -->
            <div class="tc-jobs-intro">
                <p class="font-display tc-jobs-intro-title">¿Por qué trabajar con nosotros?</p>
                <p class="font-body tc-jobs-intro-text">
                    En Tres Cantares somos más que un restaurante. Somos un equipo apasionado por la gastronomía mexicana,
                    comprometido con ofrecer la mejor experiencia a nuestros comensales en el corazón de Tepoztlán.
                </p>
            </div>

            <!-- Cards row -->
            <div class="tc-jobs-cards">

                <div class="tc-jobs-card">
                    <div class="tc-jobs-card-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                        </svg>
                    </div>
                    <h3 class="font-display tc-jobs-card-title">Ambiente</h3>
                    <p class="font-body tc-jobs-card-text">
                        Un espacio cálido y moderno en Tepoztlán donde la cultura mexicana, la música y la gastronomía se fusionan cada día.
                    </p>
                </div>

                <div class="tc-jobs-card tc-jobs-card--featured">
                    <div class="tc-jobs-card-icon tc-jobs-card-icon--featured">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 class="font-display tc-jobs-card-title tc-jobs-card-title--featured">Nuestro Equipo</h3>
                    <p class="font-body tc-jobs-card-text">
                        Somos un equipo unido, con vocación de servicio y amor por la cocina mexicana. Aquí cada persona importa y se nota en cada platillo.
                    </p>
                </div>

                <div class="tc-jobs-card">
                    <div class="tc-jobs-card-icon">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3 class="font-display tc-jobs-card-title">Vacantes</h3>
                    <p class="font-body tc-jobs-card-text">
                        Contáctanos por WhatsApp para conocer las posiciones disponibles. Estamos en búsqueda constante de personas talentosas y con ganas de crecer.
                    </p>
                </div>

            </div>

            <!-- CTA final -->
            <div class="tc-jobs-cta">
                <div class="tc-jobs-cta-divider">
                    <span class="font-display tc-jobs-cta-star">✦</span>
                </div>
                <p class="font-display tc-jobs-cta-title">¿Te interesa formar parte?</p>
                <p class="font-body tc-jobs-cta-text">
                    Únete al equipo, pregunta por nuestras vacantes disponibles. Nuestro equipo te responderá a la brevedad.
                </p>
                <a :href="WA_JOBS" target="_blank" rel="noopener noreferrer" class="tc-jobs-cta-btn font-body">
                    <svg style="width:22px;height:22px;flex-shrink:0;" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Escríbenos: 777 267 8443
                </a>
                <p class="font-body tc-jobs-cta-hint">
                    También puedes visitarnos en<br>
                    Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.
                </p>
            </div>

        </div>
    </section>
</template>
