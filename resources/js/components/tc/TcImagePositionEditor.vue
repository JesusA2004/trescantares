<script setup lang="ts">
import { RotateCcw } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{
    previewUrl?: string | null;
    positionX: number;
    positionY: number;
    scale: number;
    fit: string;
    align: string;
    visualSize: string;
}>();

const emit = defineEmits<{
    'update:positionX': [number];
    'update:positionY': [number];
    'update:scale': [number];
    'update:fit': [string];
    'update:align': [string];
    'update:visualSize': [string];
}>();

const previewStyle = computed(() => ({
    objectPosition: `${props.positionX}% ${props.positionY}%`,
    objectFit: props.fit as 'cover' | 'contain',
    transform: `scale(${props.scale})`,
}));

function reset() {
    emit('update:positionX', 50);
    emit('update:positionY', 50);
    emit('update:scale', 1);
    emit('update:fit', 'contain');
    emit('update:align', 'center');
    emit('update:visualSize', 'md');
}
</script>

<template>
    <div class="tc-field">
        <div class="flex items-center justify-between mb-2">
            <label class="!mb-0">Encuadre de la imagen</label>
            <button type="button" class="text-xs text-[var(--tc-blue)] flex items-center gap-1 hover:underline" @click="reset">
                <RotateCcw class="w-3 h-3" /> Restaurar encuadre
            </button>
        </div>

        <div class="w-full aspect-square max-w-56 mx-auto rounded-xl overflow-hidden bg-gray-100 border border-[#f0e8d8] mb-3">
            <img v-if="previewUrl" :src="previewUrl" alt="Vista previa" class="w-full h-full" :style="previewStyle" />
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="text-xs text-gray-500">Posición X ({{ positionX }}%)</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    :value="positionX"
                    class="w-full"
                    @input="emit('update:positionX', Number(($event.target as HTMLInputElement).value))"
                />
            </div>
            <div>
                <label class="text-xs text-gray-500">Posición Y ({{ positionY }}%)</label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    :value="positionY"
                    class="w-full"
                    @input="emit('update:positionY', Number(($event.target as HTMLInputElement).value))"
                />
            </div>
            <div>
                <label class="text-xs text-gray-500">Escala ({{ scale.toFixed(2) }}×)</label>
                <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    :value="scale"
                    class="w-full"
                    @input="emit('update:scale', Number(($event.target as HTMLInputElement).value))"
                />
            </div>
            <div>
                <label class="text-xs text-gray-500">Ajuste</label>
                <select
                    class="tc-select"
                    :value="fit"
                    @change="emit('update:fit', ($event.target as HTMLSelectElement).value)"
                >
                    <option value="contain">Contener (recomendado para PNG recortados)</option>
                    <option value="cover">Cubrir (fotografía rectangular)</option>
                </select>
            </div>
            <div>
                <label class="text-xs text-gray-500">Alineación</label>
                <select
                    class="tc-select"
                    :value="align"
                    @change="emit('update:align', ($event.target as HTMLSelectElement).value)"
                >
                    <option value="left">Izquierda</option>
                    <option value="center">Centro</option>
                    <option value="right">Derecha</option>
                </select>
            </div>
            <div>
                <label class="text-xs text-gray-500">Tamaño visual</label>
                <select
                    class="tc-select"
                    :value="visualSize"
                    @change="emit('update:visualSize', ($event.target as HTMLSelectElement).value)"
                >
                    <option value="sm">Pequeño</option>
                    <option value="md">Mediano</option>
                    <option value="lg">Grande</option>
                </select>
            </div>
        </div>
    </div>
</template>
