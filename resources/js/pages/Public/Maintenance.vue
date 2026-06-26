<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { logoTresCantares, cantaritoMain } from '@/lib/tres-cantares-assets';

defineProps<{
    title?: string;
    message?: string;
}>();
</script>

<template>
    <div class="tc-maintenance-page tc-public-layout">

        <!-- Decorative top border -->
        <div class="tc-maintenance-border-top" />

        <div class="tc-maintenance-wrap">

            <!-- Logo -->
            <div class="tc-maintenance-logo-wrap">
                <img :src="logoTresCantares" alt="Tres Cantares" class="tc-maintenance-logo" />
            </div>

            <!-- Decorative image -->
            <div class="tc-maintenance-deco" aria-hidden="true">
                <img :src="cantaritoMain" alt="" class="tc-maintenance-cantarito" />
            </div>

            <!-- Content -->
            <div class="tc-maintenance-content">
                <!-- Ornament -->
                <div class="tc-maintenance-ornament">✦ ✦ ✦</div>

                <h1 class="tc-maintenance-title">
                    {{ title ?? 'Página en mantenimiento' }}
                </h1>

                <p class="tc-maintenance-msg">
                    {{ message ?? 'Actualmente esta sección no está disponible. Próximamente estaremos de vuelta.' }}
                </p>

                <div class="tc-maintenance-ornament tc-maintenance-ornament--bottom">— ✦ —</div>

                <div class="tc-maintenance-actions">
                    <Link href="/" class="tc-maintenance-btn-primary">
                        ← Volver al inicio
                    </Link>
                    <Link href="/menu" class="tc-maintenance-btn-secondary">
                        Ver menú
                    </Link>
                </div>
            </div>

        </div>

        <!-- Decorative bottom border -->
        <div class="tc-maintenance-border-bottom" />

    </div>
</template>

<style scoped>
.tc-maintenance-page {
    min-height: 100vh;
    background-color: var(--tc-paper);
    background-image: url('/img/textures/paper-white.webp');
    background-repeat: no-repeat;
    background-size: cover;
    background-position: top center;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    position: relative;
    overflow: hidden;
}

.tc-maintenance-border-top {
    height: 6px;
    background: linear-gradient(90deg, var(--tc-blue) 0%, var(--tc-pink) 50%, var(--tc-yellow) 100%);
}

.tc-maintenance-border-bottom {
    height: 4px;
    background: linear-gradient(90deg, var(--tc-yellow) 0%, var(--tc-pink) 50%, var(--tc-blue) 100%);
    margin-top: auto;
}

.tc-maintenance-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 24px 80px;
    position: relative;
}

.tc-maintenance-logo-wrap {
    margin-bottom: 40px;
}

.tc-maintenance-logo {
    height: 80px;
    width: auto;
    object-fit: contain;
    filter: drop-shadow(0 4px 12px rgba(0,0,0,0.18));
}

.tc-maintenance-deco {
    position: absolute;
    right: -40px;
    bottom: 60px;
    opacity: 0.12;
    pointer-events: none;
    z-index: 0;
}

.tc-maintenance-cantarito {
    width: 320px;
    height: auto;
    transform: rotate(12deg);
}

.tc-maintenance-content {
    text-align: center;
    max-width: 560px;
    position: relative;
    z-index: 1;
}

.tc-maintenance-ornament {
    font-family: var(--tc-font-display);
    color: var(--tc-yellow);
    font-size: 1.1rem;
    letter-spacing: 0.3em;
    margin-bottom: 20px;
    opacity: 0.85;
}

.tc-maintenance-ornament--bottom {
    margin-top: 20px;
    margin-bottom: 32px;
}

.tc-maintenance-title {
    font-family: var(--tc-font-display);
    font-size: clamp(2rem, 5vw, 3.5rem);
    color: var(--tc-blue);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.1;
    margin-bottom: 20px;
    text-shadow: 2px 3px 0 rgba(20, 78, 143, 0.12);
}

.tc-maintenance-msg {
    font-family: var(--tc-font-body);
    font-size: 1.1rem;
    color: #5a4f40;
    line-height: 1.7;
    max-width: 420px;
    margin: 0 auto;
}

.tc-maintenance-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    justify-content: center;
    margin-top: 8px;
}

.tc-maintenance-btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, var(--tc-blue) 0%, #1a5ea8 100%);
    color: white;
    padding: 0.75rem 1.75rem;
    border-radius: 0.875rem;
    font-size: 0.9375rem;
    font-weight: 700;
    font-family: var(--tc-font-body);
    text-decoration: none;
    box-shadow: 0 4px 16px rgba(20, 78, 143, 0.28);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.tc-maintenance-btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(20, 78, 143, 0.38);
}

.tc-maintenance-btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: transparent;
    color: var(--tc-pink);
    padding: 0.75rem 1.75rem;
    border-radius: 0.875rem;
    border: 2px solid var(--tc-pink);
    font-size: 0.9375rem;
    font-weight: 700;
    font-family: var(--tc-font-body);
    text-decoration: none;
    transition: background 0.2s ease, color 0.2s ease;
}

.tc-maintenance-btn-secondary:hover {
    background: var(--tc-pink);
    color: white;
}

@media (max-width: 480px) {
    .tc-maintenance-deco { display: none; }
    .tc-maintenance-actions { flex-direction: column; align-items: center; }
    .tc-maintenance-btn-primary,
    .tc-maintenance-btn-secondary { width: 100%; justify-content: center; }
}
</style>
