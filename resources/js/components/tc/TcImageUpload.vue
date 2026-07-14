<script setup lang="ts">
import { Image as ImageIcon, Upload, X } from 'lucide-vue-next';
import { ref } from 'vue';

const props = defineProps<{
    label?: string;
    currentUrl?: string | null;
    hint?: string;
    error?: string;
    accept?: string;
    maxMb?: number;
}>();

const emit = defineEmits<{
    change: [file: File | null];
}>();

const preview = ref<string | null>(props.currentUrl ?? null);
const inputRef = ref<HTMLInputElement>();

function handleFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];

    if (!file) {
return;
}

    if (props.maxMb && file.size > props.maxMb * 1024 * 1024) {
        alert(`La imagen no puede superar ${props.maxMb}MB.`);

        return;
    }

    preview.value = URL.createObjectURL(file);
    emit('change', file);
}

function clear() {
    preview.value = null;
    emit('change', null);

    if (inputRef.value) {
inputRef.value.value = '';
}
}
</script>

<template>
    <div class="tc-field">
        <label v-if="label">{{ label }}</label>

        <div
            class="tc-image-upload"
            :class="{ 'has-image': preview }"
            @click="inputRef?.click()"
        >
            <div v-if="preview" class="relative">
                <img
                    :src="preview"
                    alt="Preview"
                    class="mx-auto max-h-48 rounded-lg object-contain"
                />
                <button
                    type="button"
                    class="absolute top-1 right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 shadow transition-colors hover:text-red-500"
                    @click.stop="clear"
                >
                    <X class="h-3.5 w-3.5" />
                </button>
            </div>

            <div v-else class="flex flex-col items-center gap-2 py-4">
                <div
                    class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50"
                >
                    <ImageIcon class="h-6 w-6 text-[var(--tc-blue)]" />
                </div>
                <div class="text-center">
                    <p class="text-sm font-medium text-gray-700">
                        <span class="text-[var(--tc-blue)]">Elegir imagen</span>
                        o arrastra aquí
                    </p>
                    <p class="mt-0.5 text-xs text-gray-400">
                        {{
                            hint ??
                            `JPG, PNG, WEBP${maxMb ? ` · Máx. ${maxMb}MB` : ''}`
                        }}
                    </p>
                </div>
                <Upload class="h-4 w-4 text-gray-300" />
            </div>
        </div>

        <input
            ref="inputRef"
            type="file"
            :accept="accept ?? 'image/jpeg,image/png,image/webp'"
            class="hidden"
            @change="handleFile"
        />

        <p v-if="error" class="mt-0.5 text-xs text-[var(--tc-pink)]">
            {{ error }}
        </p>
    </div>
</template>
