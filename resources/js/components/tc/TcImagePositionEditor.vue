<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
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
        <div class="mb-2 flex items-center justify-between">
            <label class="!mb-0">Encuadre interno</label>
            <button
                type="button"
                class="flex items-center gap-1 text-xs text-[var(--tc-blue)] hover:underline"
                @click="reset"
            >
                <RotateCcw class="h-3 w-3" /> Restaurar encuadre
            </button>
        </div>
        <p class="-mt-1 mb-2 text-xs text-gray-400">
            Solo recorta la imagen dentro de su caja. Para mover el platillo
            dentro de la página, usa el
            <Link
                href="/admin/menu-editor"
                class="text-[var(--tc-blue)] hover:underline"
                >editor visual del menú</Link
            >.
        </p>

        <div
            class="mx-auto mb-3 aspect-square w-full max-w-56 overflow-hidden rounded-xl border border-[#f0e8d8] bg-gray-100"
        >
            <img
                v-if="previewUrl"
                :src="previewUrl"
                alt="Vista previa"
                class="h-full w-full"
                :style="previewStyle"
            />
        </div>

        <div class="grid grid-cols-2 gap-3">
            <div>
                <label class="text-xs text-gray-500"
                    >Encuadre interno X ({{ positionX }}%)</label
                >
                <input
                    type="range"
                    min="0"
                    max="100"
                    :value="positionX"
                    class="w-full"
                    @input="
                        emit(
                            'update:positionX',
                            Number(($event.target as HTMLInputElement).value),
                        )
                    "
                />
            </div>
            <div>
                <label class="text-xs text-gray-500"
                    >Encuadre interno Y ({{ positionY }}%)</label
                >
                <input
                    type="range"
                    min="0"
                    max="100"
                    :value="positionY"
                    class="w-full"
                    @input="
                        emit(
                            'update:positionY',
                            Number(($event.target as HTMLInputElement).value),
                        )
                    "
                />
            </div>
            <div>
                <label class="text-xs text-gray-500"
                    >Escala ({{ scale.toFixed(2) }}×)</label
                >
                <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.05"
                    :value="scale"
                    class="w-full"
                    @input="
                        emit(
                            'update:scale',
                            Number(($event.target as HTMLInputElement).value),
                        )
                    "
                />
            </div>
            <div>
                <label class="text-xs text-gray-500">Ajuste</label>
                <select
                    class="tc-select"
                    :value="fit"
                    @change="
                        emit(
                            'update:fit',
                            ($event.target as HTMLSelectElement).value,
                        )
                    "
                >
                    <option value="contain">
                        Contener (recomendado para PNG recortados)
                    </option>
                    <option value="cover">
                        Cubrir (fotografía rectangular)
                    </option>
                </select>
            </div>
            <div>
                <label class="text-xs text-gray-500">Alineación</label>
                <select
                    class="tc-select"
                    :value="align"
                    @change="
                        emit(
                            'update:align',
                            ($event.target as HTMLSelectElement).value,
                        )
                    "
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
                    @change="
                        emit(
                            'update:visualSize',
                            ($event.target as HTMLSelectElement).value,
                        )
                    "
                >
                    <option value="sm">Pequeño</option>
                    <option value="md">Mediano</option>
                    <option value="lg">Grande</option>
                </select>
            </div>
        </div>
    </div>
</template>
