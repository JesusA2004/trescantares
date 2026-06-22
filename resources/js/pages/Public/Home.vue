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
    paperWhite,
} from '@/lib/tres-cantares-assets';

const page = usePage();
const settings = computed(() => (page.props as any).settings ?? {});

const paperBg = {
    backgroundImage: `url(${paperWhite})`,
    backgroundSize: '100% auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center top',
    backgroundColor: 'var(--tc-paper)',
};
</script>

<template>
    <Head>
        <title></title>
        <meta
            head-key="description"
            name="description"
            content="Ven a disfrutar el auténtico sabor de México en Tres Cantares, Tepoztlán. Comida mexicana tradicional, buena música y los mejores momentos para compartir en familia o con amigos. Lun, mié y dom: 9–20 hrs. Jue–sáb: 9–22 hrs."
        />
        <meta
            head-key="keywords"
            name="keywords"
            content="restaurante Tepoztlán, comida mexicana Tepoztlán, Tres Cantares, gastronomía mexicana, restaurante Morelos, cantarito, sabores auténticos México"
        />
        <meta
            head-key="og:title"
            property="og:title"
            content="Tres Cantares | Restaurante Mexicano en Tepoztlán, Morelos"
        />
        <meta
            head-key="og:description"
            property="og:description"
            content="Ven a vivir la experiencia Tres Cantares: sabores auténticos de México, buena música y momentos únicos en Tepoztlán, Morelos. Lun, mié y dom: 9–20 hrs. Jue–sáb: 9–22 hrs."
        />
        <meta head-key="og:url" property="og:url" content="/" />
        <meta head-key="og:type" property="og:type" content="website" />
        <meta
            head-key="twitter:title"
            name="twitter:title"
            content="Tres Cantares | Restaurante Mexicano en Tepoztlán, Morelos"
        />
        <meta
            head-key="twitter:description"
            name="twitter:description"
            content="Ven a vivir la experiencia Tres Cantares: sabores auténticos de México, buena música y momentos únicos en Tepoztlán, Morelos."
        />
        <link head-key="canonical" rel="canonical" href="/" />
    </Head>

    <div class="tc-home-page">
        <!-- ============================================================
             HERO — Navbar flota encima como papel rasgado
        ============================================================ -->
        <section class="tc-home-hero">
            <!-- Navbar absolutamente posicionado encima del hero -->
            <Navbar :settings="settings" />

            <!-- Fondo: fetchpriority high — imagen principal del hero -->
            <div class="tc-home-hero-bg">
                <img
                    :src="
                        settings.hero_background_url ||
                        settings.hero_background ||
                        heroHome
                    "
                    alt="Tres Cantares"
                    fetchpriority="high"
                    decoding="async"
                />
                <div class="tc-home-hero-overlay"></div>
            </div>

            <!-- Cartas: position absolute sobre el hero — decoding async, no bloquean render -->
            <img
                :src="cardNopal"
                class="tc-hero-card tc-hero-card-nopal hidden md:block"
                alt=""
                decoding="async"
            />
            <img
                :src="cardCantarito"
                class="tc-hero-card tc-hero-card-cantarito hidden md:block"
                alt=""
                decoding="async"
            />
            <img
                :src="cardBorracho"
                class="tc-hero-card tc-hero-card-borracho hidden md:block"
                alt=""
                decoding="async"
            />

            <!-- Título + texto centrado -->
            <div class="tc-hero-content">
                <h1 class="tc-hero-title">TRES CANTARES</h1>
                <p class="tc-hero-text">
                    ¡Ven a disfrutar el auténtico sabor de México en un espacio
                    cálido y moderno, donde la tradición,<br />
                    la buena música y los mejores momentos se comparten en
                    familia, con amigos o en pareja!<br />
                    <strong>Vive la experiencia Tres Cantares.</strong>
                </p>
            </div>
        </section>

        <!-- ============================================================
             WRAPPER PAPEL — fondo aplicado UNA sola vez para ambas secciones.
             Sin background-attachment:fixed → sin repintado en cada scroll.
        ============================================================ -->
        <div :style="paperBg">
            <!-- NUESTRO CONCEPTO -->
            <section class="tc-concept">
                <div class="tc-concept-artboard">
                    <!-- Izquierda: título gráfico + texto azul -->
                    <div class="tc-concept-title">
                        <img
                            :src="imgConcepto"
                            alt="Nuestro Concepto"
                            loading="lazy"
                            decoding="async"
                            style="width: 100%; height: auto; display: block"
                        />
                        <p class="tc-concept-text">
                            En Tres Cantares fusionamos la tradición mexicana
                            con un ambiente moderno y acogedor, creando el lugar
                            perfecto para compartir grandes momentos. Disfruta
                            sabores auténticos, buena música y una experiencia
                            pensada para reunirte con quienes más quieres.
                        </p>
                    </div>

                    <!-- La Rosa — parte superior del cantarito, detrás (z-index 3) -->
                    <img
                        :src="cardRose"
                        class="tc-concept-card-rose hidden md:block"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />

                    <!-- Cantarito principal — encima de las cartas (z-index 5) -->
                    <img
                        :src="cantaritoMain"
                        class="tc-concept-cantarito hidden md:block"
                        alt="Cantarito Tres Cantares"
                        loading="lazy"
                        decoding="async"
                    />
                </div>

                <!-- Tacos pegados al borde izquierdo de la sección, cruzan hacia menú -->
                <img
                    :src="tacoLeft"
                    class="tc-cross-tacos hidden md:block"
                    alt=""
                    loading="lazy"
                    decoding="async"
                />
            </section>

            <!-- Divisor entre concepto y menú -->
            <DecorativeDivider type="up" />

            <!-- CONOCE NUESTRO MENÚ -->
            <section class="tc-menu-preview">
                <div class="tc-menu-artboard">
                    <!-- Comidas decorativas — sin taco (viene del cross-tacos de arriba) -->
                    <img
                        :src="limonLeft"
                        class="tc-menu-limon hidden lg:block"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                    <img
                        :src="pozoleLeft"
                        class="tc-menu-pozole hidden md:block"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />
                    <img
                        :src="menuDishRight"
                        class="tc-menu-dish-right hidden md:block"
                        alt=""
                        loading="lazy"
                        decoding="async"
                    />

                    <!-- menu.png título gráfico -->
                    <div class="tc-menu-title">
                        <img
                            :src="imgMenu"
                            alt="Conoce Nuestro Menú"
                            loading="lazy"
                            decoding="async"
                            style="width: 100%; height: auto; display: block"
                        />
                    </div>

                    <!-- Botón MENÚ — siempre debajo del título -->
                    <div class="tc-menu-button">
                        <a href="/menu" class="btn-menu-vintage">
                            <span>MENÚ</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
        <!-- /wrapper papel -->

        <!-- Divisor entre menú y footer -->
        <DecorativeDivider type="down" />

        <!-- FOOTER -->
        <Footer :settings="settings" />
    </div>
</template>
