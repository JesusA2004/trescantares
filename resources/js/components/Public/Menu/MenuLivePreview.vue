<script setup lang="ts">
import { computed, ref } from 'vue';
import { layoutFor } from './layoutRegistry';
import { MENU_DEVICE_WIDTH } from './types';
import type { MenuCategoryData, MenuDevice } from './types';

defineProps<{
    category: MenuCategoryData;
}>();

type PreviewDevice = Extract<MenuDevice, 'mobile' | 'desktop'>;

const device = ref<PreviewDevice>('mobile');

// Ancho real que simula cada vista y ancho aproximado del panel donde se
// dibuja la vista previa (se escala para caber sin scroll horizontal).
const PANEL_WIDTH = 320;

const targetWidth = computed(() => MENU_DEVICE_WIDTH[device.value]);
const scale = computed(() => PANEL_WIDTH / targetWidth.value);
</script>

<template>
    <div class="tc-field">
        <div class="mb-2 flex items-center justify-between">
            <label class="!mb-0">Vista previa</label>
            <div class="flex gap-1 rounded-lg bg-gray-100 p-0.5">
                <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                        device === 'mobile'
                            ? 'bg-white text-[var(--tc-blue)] shadow-sm'
                            : 'text-gray-500'
                    "
                    @click="device = 'mobile'"
                >
                    Móvil
                </button>
                <button
                    type="button"
                    class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                    :class="
                        device === 'desktop'
                            ? 'bg-white text-[var(--tc-blue)] shadow-sm'
                            : 'text-gray-500'
                    "
                    @click="device = 'desktop'"
                >
                    Escritorio
                </button>
            </div>
        </div>

        <div
            class="tc-preview-viewport"
            :class="device === 'mobile' ? 'mobile' : 'desktop'"
        >
            <div
                class="tc-preview-scaled tc-mp tc-public-layout"
                :style="{
                    width: targetWidth + 'px',
                    transform: `scale(${scale})`,
                }"
            >
                <section v-if="category.layout === 'portada'">
                    <component
                        :is="layoutFor(category)"
                        :category="category"
                        :breakpoint="targetWidth"
                    />
                </section>
                <section v-else class="tc-mp-page">
                    <component
                        :is="layoutFor(category)"
                        :category="category"
                        :breakpoint="targetWidth"
                    />
                </section>
            </div>
        </div>
        <p class="mt-1 text-xs text-gray-400">
            Vista previa aproximada — abre /menu para ver el resultado real.
        </p>
    </div>
</template>

<style scoped>
.tc-preview-viewport {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid #e5decf;
    background: #efe9da;
}

.tc-preview-viewport.mobile {
    height: 480px;
}

.tc-preview-viewport.desktop {
    height: 380px;
}

.tc-preview-scaled {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
}
</style>
