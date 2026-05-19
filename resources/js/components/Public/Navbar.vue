<script setup lang="ts">
import { ref } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';

defineProps<{ settings: Record<string, any> }>();

const menuOpen = ref(false);
const page = usePage();

function isActive(name: string) {
    return page.url === { 'home': '/', 'public.location': '/ubicacion', 'public.menu': '/menu' }[name];
}
</script>

<template>
    <nav class="absolute top-0 left-0 right-0 z-50 w-full">
        <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <!-- Left links (desktop) -->
            <div class="hidden lg:flex items-center gap-8 flex-1">
                <Link href="/" class="text-white font-display text-sm tracking-widest uppercase hover:text-yellow-300 transition-colors"
                    :class="{ 'text-yellow-300 border-b border-yellow-300': page.url === '/' }">
                    Nosotros
                </Link>
                <Link href="/ubicacion" class="text-white font-display text-sm tracking-widest uppercase hover:text-yellow-300 transition-colors"
                    :class="{ 'text-yellow-300 border-b border-yellow-300': page.url === '/ubicacion' }">
                    Ubicación
                </Link>
            </div>

            <!-- Logo center -->
            <div class="flex-shrink-0 flex justify-center flex-1 lg:flex-none">
                <Link href="/" class="block">
                    <img v-if="settings.logo_url || settings.logo" :src="settings.logo_url || settings.logo"
                        alt="Tres Cantares" class="h-16 object-contain drop-shadow-lg" />
                    <div v-else class="text-white text-center">
                        <p class="font-display text-2xl tracking-widest leading-none">TRES</p>
                        <p class="font-display text-2xl tracking-widest leading-none">CANTARES</p>
                    </div>
                </Link>
            </div>

            <!-- Right links (desktop) -->
            <div class="hidden lg:flex items-center gap-8 flex-1 justify-end">
                <Link href="/menu" class="text-white font-display text-sm tracking-widest uppercase hover:text-yellow-300 transition-colors"
                    :class="{ 'text-yellow-300 border-b border-yellow-300': page.url === '/menu' }">
                    Menú
                </Link>
                <a href="#" class="text-white font-display text-sm tracking-widest uppercase hover:text-yellow-300 transition-colors">
                    Facturación
                </a>
            </div>

            <!-- Mobile hamburger -->
            <button @click="menuOpen = !menuOpen"
                class="lg:hidden text-white p-2 focus:outline-none z-50"
                aria-label="Menú">
                <svg v-if="!menuOpen" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                </svg>
                <svg v-else class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>

        <!-- Mobile menu -->
        <Transition enter-active-class="transition-all duration-300" enter-from-class="opacity-0 -translate-y-4" enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200" leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-4">
            <div v-show="menuOpen" class="lg:hidden bg-black/90 backdrop-blur-sm">
                <div class="flex flex-col items-center gap-6 py-8">
                    <Link href="/" @click="menuOpen = false" class="text-white font-display text-lg tracking-widest uppercase">Nosotros</Link>
                    <Link href="/ubicacion" @click="menuOpen = false" class="text-white font-display text-lg tracking-widest uppercase">Ubicación</Link>
                    <Link href="/menu" @click="menuOpen = false" class="text-white font-display text-lg tracking-widest uppercase">Menú</Link>
                    <a href="#" class="text-white font-display text-lg tracking-widest uppercase">Facturación</a>
                </div>
            </div>
        </Transition>
    </nav>
</template>
