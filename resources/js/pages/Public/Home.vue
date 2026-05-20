<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import Navbar from '@/components/Public/Navbar.vue';
import Footer from '@/components/Public/Footer.vue';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';
import {
    heroHome,
    imgConcepto,
    imgMenu,
    cantaritoMain,
    tacoLeft,
    pozoleLeft,
    menuDishRight,
    limonLeft,
    cardBorracho,
    cardCantarito,
    cardNopal,
    cardRose,
    tornPaperLarge,
    paperWhite,
} from '@/lib/tres-cantares-assets';

const page = usePage();
const settings = computed(() => (page.props as any).settings ?? {});

const paperBg = { backgroundImage: `url(${paperWhite})` };
</script>

<template>
    <Head title="Inicio" />

    <div class="tc-home-page">

        <!-- ============================================================
             NAVBAR  (con torn-paper-small.png como fondo real)
        ============================================================ -->
        <Navbar :settings="settings" />

        <!-- ============================================================
             HERO
        ============================================================ -->
        <section class="tc-home-hero">

            <!-- Fondo: hero-home.jpeg + overlay -->
            <div class="tc-home-hero-bg">
                <img
                    :src="settings.hero_background_url || settings.hero_background || heroHome"
                    alt="Tres Cantares" />
                <div class="tc-home-hero-overlay"></div>
            </div>

            <!-- Cartas LEFT: card-nopal + card-cantarito, parcialmente fuera -->
            <div class="tc-hero-loteria tc-hero-left hidden md:flex">
                <div class="tc-hero-card loteria-card"
                    style="width: 142px; height: 190px; transform: rotate(-7deg);">
                    <img :src="cardNopal" alt=""
                        style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
                <div class="tc-hero-card loteria-card"
                    style="width: 142px; height: 190px; transform: rotate(5deg);">
                    <img :src="cardCantarito" alt=""
                        style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
            </div>

            <!-- Carta RIGHT: card-borracho, grande, parcialmente fuera -->
            <div class="tc-hero-loteria tc-hero-right hidden md:flex">
                <div class="tc-hero-card loteria-card"
                    style="width: 200px; height: 267px; transform: rotate(8deg);">
                    <img :src="cardBorracho" alt=""
                        style="width: 100%; height: 100%; object-fit: cover;" />
                </div>
            </div>

            <!-- Título TRES CANTARES + texto -->
            <div class="tc-hero-content">
                <h1 style="font-family: var(--tc-font-display); color: white; font-size: 78px; line-height: 1; text-transform: uppercase; text-align: center; letter-spacing: 0.07em; margin-bottom: 16px; text-shadow: 2px 4px 12px rgba(0,0,0,0.6);">
                    TRES CANTARES
                </h1>
                <p style="color: white; font-size: 13px; line-height: 1.7; text-align: center; max-width: 580px; font-family: var(--tc-font-body);">
                    ¡Ven a disfrutar el auténtico sabor de México en un espacio cálido y moderno,
                    donde la tradición, la buena música y los mejores momentos se comparten
                    en familia, con amigos o en pareja! Vive la experiencia Tres Cantares.
                </p>
            </div>

            <!-- Papel rasgado inferior (torn-paper-large.png) -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; z-index: 30; line-height: 0; pointer-events: none;">
                <img :src="tornPaperLarge" alt=""
                    style="width: 100%; display: block; height: 58px; object-fit: fill; transform: scaleY(-1);" />
            </div>
        </section>

        <!-- ============================================================
             NUESTRO CONCEPTO
             Fondo: paper-white.png (import Vite)
        ============================================================ -->
        <section class="tc-concept" :style="paperBg">
            <div class="tc-concept-artboard">

                <!-- concepto.png + texto — columna izquierda -->
                <div class="tc-concept-title">
                    <img :src="imgConcepto" alt="Nuestro Concepto"
                        style="width: 100%; height: auto; display: block;" />
                    <p class="tc-concept-text">
                        En Tres Cantares fusionamos la tradición mexicana con un ambiente moderno y acogedor,
                        creando el lugar perfecto para compartir grandes momentos. Disfruta sabores auténticos,
                        buena música y una experiencia pensada para reunirte con quienes más quieres.
                    </p>
                </div>

                <!-- card-rose.png — detrás del cantarito (z-index 1) -->
                <div class="tc-concept-card-rose loteria-card hidden md:block">
                    <img :src="cardRose" alt=""
                        style="width: 100%; height: 100%; object-fit: cover;" />
                </div>

                <!-- card-cantarito.png — detrás del cantarito (z-index 1) -->
                <div class="tc-concept-card-cantarito loteria-card hidden md:block">
                    <img :src="cardCantarito" alt=""
                        style="width: 100%; height: 100%; object-fit: cover;" />
                </div>

                <!-- cantarito-main.png — grande a la derecha, desborda abajo (z-index 2) -->
                <img :src="cantaritoMain" alt="Cantarito Tres Cantares"
                    class="tc-concept-cantarito hidden md:block" />
            </div>
        </section>

        <!-- ============================================================
             DIVISOR  (mexican-divider-up.png + mexican-divider-down.png)
        ============================================================ -->
        <DecorativeDivider />

        <!-- ============================================================
             CONOCE NUESTRO MENÚ
             Fondo: paper-white.png (import Vite)
        ============================================================ -->
        <section class="tc-menu-preview" :style="paperBg">
            <div class="tc-menu-artboard">

                <!-- taco-lef.png — izquierda, grande, desborda borde -->
                <img :src="tacoLeft"      class="tc-menu-taco      hidden md:block" alt="" />

                <!-- limon-left.png — izquierda media, pequeño -->
                <img :src="limonLeft"     class="tc-menu-limon     hidden lg:block" alt="" />

                <!-- pozole-left.png — inferior izquierda -->
                <img :src="pozoleLeft"    class="tc-menu-pozole    hidden md:block" alt="" />

                <!-- menu-dish-right.png — derecha, grande, desborda borde -->
                <img :src="menuDishRight" class="tc-menu-dish-right hidden md:block" alt="" />

                <!-- menu.png — centrado -->
                <div class="tc-menu-title">
                    <img :src="imgMenu" alt="Conoce Nuestro Menú" />
                </div>

                <!-- Botón MENÚ -->
                <div class="tc-menu-button">
                    <Link href="/menu" class="btn-menu-vintage">
                        MENÚ
                    </Link>
                </div>
            </div>
        </section>

        <!-- ============================================================
             DIVISOR
        ============================================================ -->
        <DecorativeDivider />

        <!-- ============================================================
             FOOTER  (bg-footer.png como fondo real)
        ============================================================ -->
        <Footer :settings="settings" />

    </div>
</template>
