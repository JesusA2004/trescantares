<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { logoTresCantares } from '@/lib/tres-cantares-assets';
import { home } from '@/routes';

defineProps<{
    title?: string;
    description?: string;
}>();
</script>

<template>
    <div class="tc-auth-shell">
        <div class="tc-auth-wrap">

            <Link :href="home()" class="tc-auth-logo-link" aria-label="Tres Cantares — Inicio">
                <img :src="logoTresCantares" alt="Tres Cantares" class="tc-auth-logo" />
            </Link>

            <div class="tc-auth-card">
                <div v-if="title || description" class="tc-auth-card-header">
                    <div class="tc-auth-ornament" aria-hidden="true">
                        <span class="tc-auth-ornament-line"></span>
                        <span class="tc-auth-ornament-star">✦</span>
                        <span class="tc-auth-ornament-line"></span>
                    </div>
                    <h1 v-if="title" class="tc-auth-title font-display">{{ title }}</h1>
                    <p v-if="description" class="tc-auth-desc font-body">{{ description }}</p>
                </div>

                <slot />
            </div>

            <p class="tc-auth-footer font-body">
                Tres Cantares &copy; {{ new Date().getFullYear() }} &middot; Tepoztlán, Morelos
            </p>

        </div>
    </div>
</template>
