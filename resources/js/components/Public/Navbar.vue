<script setup lang="ts">
import { ref } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { logoTresCantares } from '@/lib/tres-cantares-assets';

defineProps<{ settings: Record<string, any> }>();

const menuOpen = ref(false);
const page = usePage();
</script>

<template>
    <!--
        Navbar en flujo normal del documento (NO absolute).
        Franja de papel claro arriba, links rosas, logo centrado.
    -->
    <nav style="background-color: var(--tc-paper-light); border-bottom: 1px solid rgba(0,0,0,0.06);">
        <!-- Desktop -->
        <div class="hidden lg:flex items-center justify-between max-w-6xl mx-auto px-8 py-2">

            <!-- Links izquierda -->
            <div class="flex items-center gap-10">
                <Link href="/"
                    class="font-display uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                    style="font-size: 18px; color: var(--tc-pink);"
                    :style="page.url === '/' ? 'color: var(--tc-blue);' : ''">
                    Nosotros
                </Link>
                <Link href="/ubicacion"
                    class="font-display uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                    style="font-size: 18px; color: var(--tc-pink);"
                    :style="page.url === '/ubicacion' ? 'color: var(--tc-blue);' : ''">
                    Ubicación
                </Link>
            </div>

            <!-- Logo centrado -->
            <Link href="/" class="flex-shrink-0">
                <img
                    v-if="settings.logo_url || settings.logo"
                    :src="settings.logo_url || settings.logo"
                    alt="Tres Cantares"
                    style="height: 95px; object-fit: contain;" />
                <img
                    v-else
                    :src="logoTresCantares"
                    alt="Tres Cantares"
                    style="height: 95px; object-fit: contain;" />
            </Link>

            <!-- Links derecha -->
            <div class="flex items-center gap-10">
                <Link href="/menu"
                    class="font-display uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                    style="font-size: 18px; color: var(--tc-pink);"
                    :style="page.url === '/menu' ? 'color: var(--tc-blue);' : ''">
                    Menú
                </Link>
                <a
                    :href="settings.billing_url && settings.billing_url !== '#' ? settings.billing_url : '#'"
                    class="font-display uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
                    style="font-size: 18px; color: var(--tc-pink);">
                    Facturación
                </a>
            </div>
        </div>

        <!-- Mobile -->
        <div class="lg:hidden flex items-center justify-between px-4 py-3">
            <Link href="/">
                <img
                    v-if="settings.logo_url || settings.logo"
                    :src="settings.logo_url || settings.logo"
                    alt="Tres Cantares"
                    style="height: 65px; object-fit: contain;" />
                <img
                    v-else
                    :src="logoTresCantares"
                    alt="Tres Cantares"
                    style="height: 65px; object-fit: contain;" />
            </Link>
            <button @click="menuOpen = !menuOpen"
                style="color: var(--tc-pink);" aria-label="Menú">
                <svg v-if="!menuOpen" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
                <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Mobile dropdown -->
        <Transition
            enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 -translate-y-2"
            enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-y-0"
            leave-to-class="opacity-0 -translate-y-2">
            <div v-show="menuOpen"
                class="lg:hidden flex flex-col items-center gap-5 py-6 border-t"
                style="background-color: var(--tc-paper); border-color: rgba(0,0,0,0.08);">
                <Link href="/" @click="menuOpen = false"
                    class="font-display uppercase tracking-widest"
                    style="font-size: 18px; color: var(--tc-pink);">
                    Nosotros
                </Link>
                <Link href="/ubicacion" @click="menuOpen = false"
                    class="font-display uppercase tracking-widest"
                    style="font-size: 18px; color: var(--tc-pink);">
                    Ubicación
                </Link>
                <Link href="/menu" @click="menuOpen = false"
                    class="font-display uppercase tracking-widest"
                    style="font-size: 18px; color: var(--tc-pink);">
                    Menú
                </Link>
                <a :href="settings.billing_url && settings.billing_url !== '#' ? settings.billing_url : '#'"
                    class="font-display uppercase tracking-widest"
                    style="font-size: 18px; color: var(--tc-pink);">
                    Facturación
                </a>
            </div>
        </Transition>
    </nav>
</template>
