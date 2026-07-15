<script setup lang="ts">
import { Trash2, Upload, X } from 'lucide-vue-next';
import { onMounted, ref } from 'vue';
import { useNotify } from '@/composables/useNotify';
import { deleteJson, getJson, postFormWithProgress } from '@/lib/jsonApi';

interface Asset {
    id: number;
    disk_path: string;
    url: string;
    original_name: string | null;
    width: number | null;
    height: number | null;
    alt_text: string | null;
}

withDefaults(
    defineProps<{
        open: boolean;
        title?: string;
    }>(),
    {
        title: 'Biblioteca de imágenes',
    },
);

const emit = defineEmits<{
    close: [];
    /** Ruta relativa del disco `public` (nunca una ruta absoluta) + URL para
     * previsualizar de inmediato. */
    picked: [{ path: string; url: string }];
}>();

const notify = useNotify();
const assets = ref<Asset[]>([]);
const loading = ref(false);
const uploading = ref(false);
const uploadProgress = ref(0);
const fileInput = ref<HTMLInputElement>();
const dragActive = ref(false);

async function loadAssets() {
    loading.value = true;

    try {
        const res = await getJson<{ assets: Asset[] }>('/admin/media-library');
        assets.value = res.assets;
    } finally {
        loading.value = false;
    }
}

onMounted(loadAssets);

async function uploadFile(file: File) {
    if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
        notify.error('Solo se admiten imágenes JPG, PNG o WEBP.');

        return;
    }

    if (file.size > 6 * 1024 * 1024) {
        notify.error('La imagen no puede superar 6MB.');

        return;
    }

    uploading.value = true;
    uploadProgress.value = 0;

    try {
        const form = new FormData();
        form.append('file', file);

        const res = await postFormWithProgress<{ asset: Asset }>(
            '/admin/media-library',
            form,
            (percent) => (uploadProgress.value = percent),
        );

        assets.value.unshift(res.asset);
        emit('picked', { path: res.asset.disk_path, url: res.asset.url });
        notify.success('Imagen subida correctamente.');
    } catch {
        notify.error('No se pudo subir la imagen.');
    } finally {
        uploading.value = false;
    }
}

function onFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];

    if (file) {
        void uploadFile(file);
    }

    (e.target as HTMLInputElement).value = '';
}

function onDrop(e: DragEvent) {
    e.preventDefault();
    dragActive.value = false;
    const file = e.dataTransfer?.files?.[0];

    if (file) {
        void uploadFile(file);
    }
}

function pick(asset: Asset) {
    emit('picked', { path: asset.disk_path, url: asset.url });
}

async function remove(asset: Asset) {
    const confirmed = await notify.confirmDanger(
        '¿Borrar esta imagen de la biblioteca?',
        'Si todavía está en uso en algún platillo, título o adorno, no se podrá borrar.',
    );

    if (!confirmed) {
        return;
    }

    try {
        await deleteJson(`/admin/media-library/${asset.id}`);
        assets.value = assets.value.filter((a) => a.id !== asset.id);
        notify.success('Imagen eliminada.');
    } catch (e) {
        const usages =
            (e as { data?: { usages?: { label: string }[] } })?.data?.usages ??
            [];
        const detail = usages.length
            ? ` En uso: ${usages.map((u) => u.label).join(', ')}.`
            : '';
        notify.error(`Esta imagen sigue en uso y no se puede borrar.${detail}`);
    }
}
</script>

<template>
    <div v-if="open" class="tc-media-modal-overlay" @click.self="emit('close')">
        <div class="tc-media-modal">
            <div class="tc-media-modal-header">
                <h3 class="text-sm font-bold text-gray-800">{{ title }}</h3>
                <button
                    type="button"
                    class="tc-icon-btn"
                    aria-label="Cerrar"
                    @click="emit('close')"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <div
                class="tc-media-dropzone"
                :class="{ 'tc-media-dropzone--active': dragActive }"
                @dragover.prevent="dragActive = true"
                @dragleave="dragActive = false"
                @drop="onDrop"
                @click="fileInput?.click()"
            >
                <template v-if="uploading">
                    <div class="tc-media-progress-bar">
                        <div
                            class="tc-media-progress-fill"
                            :style="{ width: `${uploadProgress}%` }"
                        />
                    </div>
                    <p class="mt-1 text-xs text-gray-500">
                        Subiendo… {{ uploadProgress }}%
                    </p>
                </template>
                <template v-else>
                    <Upload class="mx-auto mb-1 h-5 w-5 text-gray-300" />
                    <p class="text-xs text-gray-500">
                        Arrastra una imagen aquí o haz click para subir una
                        nueva (JPG, PNG, WEBP · máx. 6MB)
                    </p>
                </template>
            </div>
            <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="onFileInput"
            />

            <p v-if="loading" class="py-6 text-center text-xs text-gray-400">
                Cargando biblioteca…
            </p>
            <p
                v-else-if="!assets.length"
                class="py-6 text-center text-xs text-gray-400"
            >
                Todavía no hay imágenes en la biblioteca.
            </p>
            <div v-else class="tc-media-grid">
                <div
                    v-for="asset in assets"
                    :key="asset.id"
                    class="tc-media-tile"
                >
                    <button
                        type="button"
                        class="tc-media-tile-btn"
                        :title="asset.original_name ?? ''"
                        @click="pick(asset)"
                    >
                        <img
                            :src="asset.url"
                            :alt="asset.alt_text ?? asset.original_name ?? ''"
                        />
                    </button>
                    <button
                        type="button"
                        class="tc-media-tile-delete"
                        aria-label="Borrar de la biblioteca"
                        @click.stop="remove(asset)"
                    >
                        <Trash2 class="h-3 w-3" />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.tc-media-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    padding: 20px;
}

.tc-media-modal {
    width: 100%;
    max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    border-radius: 14px;
    background: #fff;
    padding: 18px;
}

.tc-media-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.tc-media-dropzone {
    cursor: pointer;
    border: 2px dashed #e5decf;
    border-radius: 12px;
    padding: 18px;
    text-align: center;
    margin-bottom: 14px;
    transition: border-color 0.15s ease;
}

.tc-media-dropzone--active {
    border-color: var(--tc-blue);
}

.tc-media-progress-bar {
    height: 6px;
    border-radius: 999px;
    background: #f0e8d8;
    overflow: hidden;
}

.tc-media-progress-fill {
    height: 100%;
    background: var(--tc-blue);
    transition: width 0.15s ease;
}

.tc-media-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
    gap: 8px;
}

.tc-media-tile {
    position: relative;
}

.tc-media-tile-btn {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    border: 1px solid #f0e8d8;
    background: #f8f7f2;
}

.tc-media-tile-btn img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.tc-media-tile-delete {
    position: absolute;
    top: 3px;
    right: 3px;
    display: flex;
    height: 20px;
    width: 20px;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: rgba(220, 38, 38, 0.9);
    color: #fff;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.tc-media-tile:hover .tc-media-tile-delete {
    opacity: 1;
}
</style>
