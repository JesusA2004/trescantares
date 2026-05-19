<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import DecorativeDivider from '@/components/Public/DecorativeDivider.vue';
import SectionTitle from '@/components/Public/SectionTitle.vue';
import MenuCard from '@/components/Public/MenuCard.vue';

const props = defineProps<{
    settings: Record<string, any>
    featuredItems: any[]
}>();

const setting = (key: string, fallback = '') => props.settings?.[key] ?? fallback;
</script>

<template>
    <Head title="Inicio" />

    <!-- ===================== HERO ===================== -->
    <section class="relative min-h-[480px] lg:min-h-[520px] flex flex-col">
        <!-- Background -->
        <div class="absolute inset-0 overflow-hidden">
            <img v-if="settings.hero_background_url || settings.hero_background"
                :src="settings.hero_background_url || settings.hero_background"
                alt="Tres Cantares hero"
                class="w-full h-full object-cover object-center" />
            <!-- Placeholder pattern if no image -->
            <div v-else class="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
            <div class="absolute inset-0 hero-overlay"></div>
        </div>

        <!-- Content -->
        <div class="relative z-10 flex flex-col items-center justify-center flex-1 pt-28 pb-16 px-4 text-center">
            <!-- Decorative elements left -->
            <div class="absolute left-4 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3 opacity-60">
                <div class="w-16 h-20 border-2 border-yellow-400 rounded-sm flex items-center justify-center">
                    <span class="font-display text-yellow-400 text-xs text-center px-1">LOTERÍA</span>
                </div>
                <div class="w-16 h-20 border-2 border-red-400 rounded-sm flex items-center justify-center">
                    <span class="font-display text-red-400 text-xs text-center px-1">LOTERÍA</span>
                </div>
            </div>

            <h1 class="font-display text-6xl lg:text-8xl text-white tracking-widest drop-shadow-2xl mb-2">
                TRES CANTARES
            </h1>
            <p class="text-white/85 font-body max-w-2xl text-base lg:text-lg leading-relaxed mt-4 drop-shadow">
                Ven a disfrutar el auténtico sabor de México en un espacio cálido y moderno,
                donde la tradición, la buena música y los mejores momentos se comparten
                en familia, con amigos o en pareja.
            </p>
            <div class="mt-8 flex gap-4">
                <Link href="/menu"
                    class="bg-tc-rojo text-white font-display tracking-widest text-sm px-8 py-3 rounded hover:bg-red-700 transition-colors uppercase">
                    Ver Menú
                </Link>
                <Link href="/ubicacion"
                    class="border border-white text-white font-display tracking-widest text-sm px-8 py-3 rounded hover:bg-white/10 transition-colors uppercase">
                    Ubicación
                </Link>
            </div>

            <!-- Decorative elements right -->
            <div class="absolute right-4 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-3 opacity-60">
                <div class="w-16 h-20 border-2 border-green-400 rounded-sm flex items-center justify-center">
                    <span class="font-display text-green-400 text-xs text-center px-1">LOTERÍA</span>
                </div>
                <div class="w-16 h-20 border-2 border-blue-400 rounded-sm flex items-center justify-center">
                    <span class="font-display text-blue-400 text-xs text-center px-1">LOTERÍA</span>
                </div>
            </div>
        </div>
    </section>

    <!-- ===================== DIVIDER ===================== -->
    <DecorativeDivider />

    <!-- ===================== NUESTRO CONCEPTO ===================== -->
    <section class="tc-section bg-papel">
        <div class="max-w-7xl mx-auto px-6">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                    <SectionTitle title="Nuestro Concepto" color="rojo" />
                    <p class="font-body text-gray-700 text-base leading-relaxed">
                        En Tres Cantares fusionamos la tradición mexicana con un ambiente moderno y acogedor,
                        creando el lugar perfecto para compartir grandes momentos. Disfruta sabores auténticos,
                        buena música y una experiencia pensada para reunirte con quienes más quieres.
                    </p>
                    <div class="mt-6 flex gap-4">
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-tc-verde inline-block"></span>
                            <span class="font-body text-sm text-gray-600">Tradición Auténtica</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-tc-rojo inline-block"></span>
                            <span class="font-body text-sm text-gray-600">Ambiente Único</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-tc-azul inline-block"></span>
                            <span class="font-body text-sm text-gray-600">Buena Música</span>
                        </div>
                    </div>
                </div>
                <div class="flex justify-center relative">
                    <!-- Decorative background cards -->
                    <div class="absolute -top-4 -left-4 w-32 h-40 border-4 border-tc-rojo/20 rounded-lg rotate-6"></div>
                    <div class="absolute -bottom-4 -right-4 w-32 h-40 border-4 border-tc-azul/20 rounded-lg -rotate-6"></div>
                    <!-- Main image placeholder -->
                    <div class="relative w-72 h-80 rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-amber-100 to-orange-200 flex items-center justify-center">
                        <!-- Replace this div with an actual image when available -->
                        <div class="text-center">
                            <svg class="w-24 h-24 text-amber-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4"/>
                            </svg>
                            <p class="font-display text-amber-600 tracking-widest text-lg">CANTARITO</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===================== DIVIDER ===================== -->
    <DecorativeDivider />

    <!-- ===================== CONOCE NUESTRO MENÚ ===================== -->
    <section class="tc-section bg-white">
        <div class="max-w-7xl mx-auto px-6 text-center">
            <SectionTitle title="Conoce Nuestro Menú" color="azul" />
            <p class="font-body text-gray-600 max-w-xl mx-auto mb-8 text-base leading-relaxed">
                Platillos preparados con ingredientes frescos y recetas que honran la cocina mexicana tradicional.
            </p>

            <!-- Featured items preview -->
            <div v-if="featuredItems.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
                <MenuCard v-for="item in featuredItems.slice(0, 4)" :key="item.id" :item="item" />
            </div>

            <Link href="/menu"
                class="inline-block bg-tc-azul text-white font-display tracking-widest text-sm px-12 py-3 rounded hover:bg-blue-800 transition-colors uppercase">
                Ver Menú Completo
            </Link>
        </div>
    </section>

    <!-- ===================== DIVIDER ===================== -->
    <DecorativeDivider />
</template>
