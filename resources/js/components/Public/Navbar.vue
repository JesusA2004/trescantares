<script setup lang="ts">
import { ref } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { logoTresCantares, tornPaperSmall } from '@/lib/tres-cantares-assets';

defineProps<{ settings: Record<string, any> }>();

const menuOpen = ref(false);
const page = usePage();
</script>

<template>
    <nav class="tc-public-navbar">

        <!-- torn-paper-small.png — transform scaleY(-1) en CSS, corte hacia abajo -->
        <img :src="tornPaperSmall" class="tc-navbar-paper" alt="" decoding="async" />

        <!-- Desktop -->
        <div class="tc-navbar-inner hidden lg:flex items-center">
            <div class="tc-navbar-content">
                <div style="display: flex; align-items: center; gap: 44px;">
                    <Link href="/" class="tc-nav-link"
                        :class="{ 'tc-nav-link-active': page.url === '/' }">Nosotros</Link>
                    <Link href="/ubicacion" class="tc-nav-link"
                        :class="{ 'tc-nav-link-active': page.url === '/ubicacion' }">Ubicación</Link>
                </div>

                <Link href="/" style="flex-shrink: 0; display: block;">
                    <img v-if="settings.logo_url || settings.logo"
                        :src="settings.logo_url || settings.logo"
                        alt="Tres Cantares" class="tc-navbar-logo" />
                    <img v-else :src="logoTresCantares"
                        alt="Tres Cantares" class="tc-navbar-logo" />
                </Link>

                <div style="display: flex; align-items: center; gap: 44px;">
                    <Link href="/menu" class="tc-nav-link"
                        :class="{ 'tc-nav-link-active': page.url === '/menu' }">Menú</Link>
                    <a :href="settings.billing_url && settings.billing_url !== '#' ? settings.billing_url : '#'"
                        class="tc-nav-link">Facturación</a>
                </div>
            </div>
        </div>

        <!-- Mobile -->
        <div class="tc-navbar-inner lg:hidden flex items-center">
            <div style="width:100%; padding:0 16px; display:flex; align-items:center; justify-content:space-between;">
                <Link href="/">
                    <img v-if="settings.logo_url || settings.logo"
                        :src="settings.logo_url || settings.logo"
                        alt="Tres Cantares" style="height:50px; object-fit:contain;" />
                    <img v-else :src="logoTresCantares"
                        alt="Tres Cantares" style="height:50px; object-fit:contain;" />
                </Link>
                <button @click="menuOpen = !menuOpen"
                    style="color: var(--tc-pink); background:none; border:none; cursor:pointer; padding:4px;">
                    <svg v-if="!menuOpen" style="width:28px;height:28px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                    <svg v-else style="width:28px;height:28px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>

        <Transition enter-active-class="transition-all duration-300"
            enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0"
            leave-active-class="transition-all duration-200"
            leave-from-class="opacity-100 translate-y-0" leave-to-class="opacity-0 -translate-y-2">
            <div v-show="menuOpen" class="lg:hidden"
                style="background-color:var(--tc-paper); border-top:1px solid rgba(0,0,0,0.08); display:flex; flex-direction:column; align-items:center; gap:18px; padding:20px 0 22px;">
                <Link href="/"         @click="menuOpen=false" class="tc-nav-link" style="font-size:20px;">Nosotros</Link>
                <Link href="/ubicacion" @click="menuOpen=false" class="tc-nav-link" style="font-size:20px;">Ubicación</Link>
                <Link href="/menu"      @click="menuOpen=false" class="tc-nav-link" style="font-size:20px;">Menú</Link>
                <a :href="settings.billing_url && settings.billing_url !== '#' ? settings.billing_url : '#'"
                    class="tc-nav-link" style="font-size:20px;">Facturación</a>
            </div>
        </Transition>
    </nav>
</template>
