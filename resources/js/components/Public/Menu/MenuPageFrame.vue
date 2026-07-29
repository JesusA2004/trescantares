<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        primaryColor?: string;
        secondaryColor?: string;
        /** URL del fondo exclusivo del menú (ajuste `menu_background`) — ya
         * trae su propio marco fino + adornos de esquina horneados sobre
         * textura de papel, así que cuando está presente se suprime TODO el
         * marco hecho a mano (doble borde pink/blue + fondo.png repetido de
         * app.css + los SVG de esquina de aquí abajo) para no duplicarlo —
         * ver MenuController/MenuEditorController, que exponen
         * `menu_background_url`. Vía estilo en línea para ganar siempre
         * sobre las reglas globales `.tc-mp-frame`/`.tc-mp-frame-inner` de
         * app.css sin pelear con su especificidad. */
        backgroundUrl?: string | null;
    }>(),
    {
        primaryColor: '#144E8F',
        secondaryColor: '#DB3465',
        backgroundUrl: null,
    },
);

const hasBackground = computed(() => !!props.backgroundUrl);

const outerStyle = computed(() =>
    hasBackground.value
        ? { border: 'none', background: 'none', backgroundImage: 'none' }
        : undefined,
);

const innerStyle = computed(() =>
    hasBackground.value ? { border: 'none' } : undefined,
);
</script>

<template>
    <div class="tc-mp-frame" :style="outerStyle">
        <div
            v-if="hasBackground"
            class="tc-mp-frame-bg"
            :style="{ backgroundImage: `url(${backgroundUrl})` }"
            aria-hidden="true"
        />
        <div class="tc-mp-frame-inner" :style="innerStyle">
            <template v-if="!hasBackground">
                <svg
                    class="tc-mp-corner tc-mp-corner--tl"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M4 22C4 12 12 4 22 4"
                        :stroke="primaryColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                    />
                    <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                    <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                    <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
                </svg>
                <svg
                    class="tc-mp-corner tc-mp-corner--tr"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M4 22C4 12 12 4 22 4"
                        :stroke="primaryColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                    />
                    <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                    <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                    <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
                </svg>
                <svg
                    class="tc-mp-corner tc-mp-corner--bl"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M4 22C4 12 12 4 22 4"
                        :stroke="primaryColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                    />
                    <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                    <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                    <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
                </svg>
                <svg
                    class="tc-mp-corner tc-mp-corner--br"
                    viewBox="0 0 40 40"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M4 22C4 12 12 4 22 4"
                        :stroke="primaryColor"
                        stroke-width="1.6"
                        stroke-linecap="round"
                    />
                    <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                    <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                    <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
                </svg>
            </template>

            <slot />
        </div>
    </div>
</template>

<style scoped>
/* Sin z-index explícito en .tc-mp-frame-inner a propósito: alcanza con que
   sea DOM-later que .tc-mp-frame-bg (ambos position:relative/absolute con
   z-index implícito) para pintarse encima de ella — un z-index positivo
   aquí "se escapa" del contexto de apilamiento local de .tc-mp-frame (que
   no lo aísla, ya que .tc-mp-frame nunca fija su propio z-index) y termina
   compitiendo directamente con los adornos de la sección (.tc-mp-decoration,
   hermanos de más arriba, sin z-index propio) — les ganaba y los dejaba
   sin poder recibir clics pese a estar después en el DOM. Bug real ya
   corregido: no reintroducir el z-index aquí. */
.tc-mp-frame-bg {
    position: absolute;
    inset: 0;
    background-repeat: no-repeat;
    background-size: 100% 100%;
    pointer-events: none;
}
</style>
