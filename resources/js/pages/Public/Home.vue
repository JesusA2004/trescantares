<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';
import {
    heroHome,
    imgConcepto,
    imgMenu,
    cantaritoMain,
    tacoLeft,
    menuDishRight,
    limonLeft,
    cardBorracho,
    cardCantarito,
    cardNopal,
    cardRose,
    tornPaperLarge,
    tornPaperSmall,
} from '@/lib/tres-cantares-assets';

defineProps<{
    settings: Record<string, any>
}>();
</script>

<template>
    <Head title="Inicio" />

    <!-- ============================================================
         HERO
    ============================================================ -->
    <section class="relative overflow-hidden" style="height: 310px;">

        <!-- Background image -->
        <div class="absolute inset-0">
            <img
                v-if="settings.hero_background_url || settings.hero_background"
                :src="settings.hero_background_url || settings.hero_background"
                alt="Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <img
                v-else
                :src="heroHome"
                alt="Tres Cantares"
                class="w-full h-full object-cover object-center" />
            <div class="absolute inset-0 hero-overlay"></div>
        </div>

        <!-- Lotería cards LEFT — partially cut off at edge -->
        <div class="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-4"
            style="transform: translate(-30%, -50%);">
            <div class="loteria-card w-[100px] h-[135px] rotate-[-7deg] overflow-hidden shadow-2xl">
                <img :src="cardNopal" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="loteria-card w-[100px] h-[135px] rotate-[5deg] overflow-hidden shadow-2xl">
                <img :src="cardCantarito" alt="" class="w-full h-full object-cover" />
            </div>
        </div>

        <!-- Lotería cards RIGHT — partially cut off at edge -->
        <div class="absolute right-0 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-4"
            style="transform: translate(30%, -50%);">
            <div class="loteria-card w-[100px] h-[135px] rotate-[7deg] overflow-hidden shadow-2xl">
                <img :src="cardBorracho" alt="" class="w-full h-full object-cover" />
            </div>
            <div class="loteria-card w-[100px] h-[135px] rotate-[-5deg] overflow-hidden shadow-2xl">
                <img :src="cardRose" alt="" class="w-full h-full object-cover" />
            </div>
        </div>

        <!-- Torn paper bottom -->
        <div class="absolute bottom-0 left-0 right-0 z-20 leading-[0] pointer-events-none">
            <img :src="tornPaperLarge" alt="" class="w-full block"
                style="transform: scaleY(-1); height: 60px; object-fit: fill;" />
        </div>
    </section>

    <!-- ============================================================
         NUESTRO CONCEPTO
    ============================================================ -->
    <section class="relative overflow-hidden" style="background-color: var(--tc-paper);">

        <!-- Torn paper top -->
        <div class="absolute top-0 left-0 right-0 z-10 leading-[0] pointer-events-none">
            <img :src="tornPaperSmall" alt="" class="w-full block" style="height: 50px; object-fit: fill;" />
        </div>

        <div class="max-w-7xl mx-auto px-6 pt-24 pb-20">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

                <!-- Left: concepto image + text -->
                <div class="relative z-10">
                    <div class="mb-6">
                        <img :src="imgConcepto" alt="Nuestro Concepto"
                            style="width: 380px; max-width: 100%; height: auto;"
                            class="drop-shadow-sm" />
                    </div>
                    <p class="font-body text-gray-700 text-base sm:text-lg leading-relaxed max-w-lg">
                        En Tres Cantares fusionamos la tradición mexicana con un ambiente moderno y acogedor,
                        creando el lugar perfecto para compartir grandes momentos. Disfruta sabores auténticos,
                        buena música y una experiencia pensada para reunirte con quienes más quieres.
                    </p>
                </div>

                <!-- Right: cantarito + decorative lotería cards -->
                <div class="relative flex justify-center items-center min-h-80">

                    <!-- Card behind, rotated left -->
                    <div class="absolute -left-4 top-4 w-28 h-36 rotate-[-8deg] z-0 hidden sm:block">
                        <div class="loteria-card w-full h-full overflow-hidden">
                            <img :src="cardRose" alt="" class="w-full h-full object-cover" />
                        </div>
                    </div>

                    <!-- Main cantarito -->
                    <div class="relative z-10">
                        <img :src="cantaritoMain" alt="Cantarito Tres Cantares"
                            class="w-64 sm:w-80 lg:w-96 h-auto drop-shadow-2xl object-contain" />
                    </div>

                    <!-- Card front-right, rotated -->
                    <div class="absolute right-0 bottom-4 w-24 h-32 rotate-[7deg] z-20 hidden sm:block">
                        <div class="loteria-card w-full h-full overflow-hidden">
                            <img :src="cardCantarito" alt="" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ============================================================
         DIVIDER
    ============================================================ -->
    <DecorativeDivider />

    <!-- ============================================================
         CONOCE NUESTRO MENÚ
    ============================================================ -->
    <section class="relative overflow-hidden" style="background-color: var(--tc-paper-light);">

        <div class="max-w-7xl mx-auto px-6 py-20 relative">

            <!-- Taco — left edge -->
            <div class="absolute -left-10 bottom-0 w-44 sm:w-56 lg:w-72 opacity-90 pointer-events-none hidden sm:block">
                <img :src="tacoLeft" alt="" class="w-full h-auto drop-shadow-xl" />
            </div>

            <!-- Limón — upper left area -->
            <div class="absolute left-40 top-10 w-16 sm:w-20 opacity-70 pointer-events-none hidden lg:block">
                <img :src="limonLeft" alt="" class="w-full h-auto" />
            </div>

            <!-- Dish — right edge -->
            <div class="absolute -right-10 bottom-0 w-44 sm:w-56 lg:w-72 opacity-90 pointer-events-none hidden sm:block">
                <img :src="menuDishRight" alt="" class="w-full h-auto drop-shadow-xl" />
            </div>

            <!-- Center: title image + button -->
            <div class="relative z-10 text-center">
                <div class="flex justify-center mb-10">
                    <img :src="imgMenu" alt="Conoce Nuestro Menú"
                        class="max-w-sm sm:max-w-md lg:max-w-xl w-full h-auto drop-shadow-sm" />
                </div>

                <Link href="/menu" class="btn-menu-vintage">
                    MENÚ
                </Link>
            </div>
        </div>
    </section>

    <!-- ============================================================
         DIVIDER
    ============================================================ -->
    <DecorativeDivider />
</template>
