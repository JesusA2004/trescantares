<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { computed, reactive, ref, watch } from 'vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcMediaLibraryModal from '@/components/tc/TcMediaLibraryModal.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';
import type { MenuCategoryData, MenuItemData } from '@/components/Public/Menu/types';
import { ApiError, postFormWithProgress } from '@/lib/jsonApi';
import { zonesForLayout } from '@/pages/Admin/MenuItems/zones';

const props = defineProps<{
    open: boolean;
    category: MenuCategoryData | null;
}>();

const emit = defineEmits<{
    close: [];
    created: [item: MenuItemData];
}>();

function blankForm() {
    return {
        name: '',
        price: '' as string | number,
        zone: '',
        description: '',
        image_library_path: '',
    };
}

const form = reactive(blankForm());
const previewUrl = ref<string | null>(null);
const errors = ref<Record<string, string[]>>({});
const submitting = ref(false);
const libraryOpen = ref(false);

const zoneOptions = computed(() => zonesForLayout(props.category?.layout));

// Cada vez que se abre el modal para una sección nueva, empieza limpio — sin
// arrastrar el nombre/precio/imagen del platillo anterior que se acaba de
// crear.
watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            Object.assign(form, blankForm());
            previewUrl.value = null;
            errors.value = {};
        }
    },
);

function onPicked({ path, url }: { path: string; url: string }) {
    form.image_library_path = path;
    previewUrl.value = url;
    libraryOpen.value = false;
}

function fieldError(field: string): string | undefined {
    return errors.value[field]?.join(' ');
}

async function submit() {
    if (!props.category || submitting.value) {
        return;
    }

    submitting.value = true;
    errors.value = {};

    const body = new FormData();
    body.append('menu_category_id', String(props.category.id));
    body.append('name', form.name);
    body.append('price', String(form.price));
    body.append('is_active', '1');

    if (form.zone) {
        body.append('zone', form.zone);
    }

    if (form.description) {
        body.append('description', form.description);
    }

    if (form.image_library_path) {
        body.append('image_library_path', form.image_library_path);
    }

    try {
        const res = await postFormWithProgress<{ item: MenuItemData }>(
            '/admin/menu-editor/items',
            body,
        );
        emit('created', res.item);
    } catch (e) {
        if (e instanceof ApiError && e.status === 422) {
            errors.value =
                (e.data as { errors?: Record<string, string[]> } | null)
                    ?.errors ?? {};
        } else if (e instanceof ApiError && e.status === 419) {
            errors.value = {
                name: ['Tu sesión expiró. Recarga la página e intenta de nuevo.'],
            };
        } else {
            errors.value = {
                name: [
                    e instanceof ApiError
                        ? e.message
                        : 'No se pudo crear el platillo. Intenta de nuevo.',
                ],
            };
        }
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div
        v-if="open"
        class="tc-additem-overlay"
        @click.self="emit('close')"
    >
        <div class="tc-additem-modal">
            <div class="tc-additem-header">
                <div>
                    <h3 class="text-sm font-bold text-gray-800">
                        Agregar platillo
                    </h3>
                    <p class="text-xs text-gray-400">
                        {{ category?.name }}
                    </p>
                </div>
                <button
                    type="button"
                    class="tc-icon-btn"
                    aria-label="Cerrar"
                    @click="emit('close')"
                >
                    <X class="h-4 w-4" />
                </button>
            </div>

            <form class="space-y-3" @submit.prevent="submit">
                <TcInput
                    id="add-item-name"
                    v-model="form.name"
                    label="Nombre del platillo"
                    required
                    placeholder="Ej: Pozole Verde"
                    :error="fieldError('name')"
                />

                <div class="grid grid-cols-2 gap-3">
                    <div class="tc-field">
                        <label for="add-item-price"
                            >Precio
                            <span class="text-[var(--tc-pink)]">*</span></label
                        >
                        <div class="relative">
                            <span
                                class="absolute top-1/2 left-3 -translate-y-1/2 font-semibold text-gray-400"
                                >$</span
                            >
                            <input
                                id="add-item-price"
                                v-model="form.price"
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                class="tc-input pl-8"
                                :class="{
                                    'border-[var(--tc-pink)]':
                                        fieldError('price'),
                                }"
                                placeholder="0.00"
                            />
                        </div>
                        <p
                            v-if="fieldError('price')"
                            class="mt-0.5 text-xs text-[var(--tc-pink)]"
                        >
                            {{ fieldError('price') }}
                        </p>
                    </div>

                    <TcSelect
                        v-if="zoneOptions.length"
                        id="add-item-zone"
                        v-model="form.zone"
                        label="Zona en la plantilla"
                        placeholder="Elegir zona"
                        :options="
                            zoneOptions.map((z) => ({
                                value: z.value,
                                label: z.label,
                            }))
                        "
                        :error="fieldError('zone')"
                        hint="Puede haber varios platillos en la misma zona."
                    />
                </div>

                <TcTextarea
                    id="add-item-description"
                    v-model="form.description"
                    label="Descripción"
                    placeholder="Opcional"
                    :rows="2"
                />

                <div class="tc-field">
                    <label>Imagen</label>
                    <div class="flex items-center gap-3">
                        <div
                            v-if="previewUrl"
                            class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200"
                        >
                            <img
                                :src="previewUrl"
                                alt=""
                                class="h-full w-full object-cover"
                            />
                        </div>
                        <button
                            type="button"
                            class="tc-btn-secondary text-xs"
                            @click="libraryOpen = true"
                        >
                            Elegir o subir imagen
                        </button>
                    </div>
                    <p
                        v-if="fieldError('image_library_path')"
                        class="mt-0.5 text-xs text-[var(--tc-pink)]"
                    >
                        {{ fieldError('image_library_path') }}
                    </p>
                </div>

                <div class="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        class="tc-btn-secondary"
                        :disabled="submitting"
                        @click="emit('close')"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        class="tc-btn-primary"
                        :disabled="submitting"
                    >
                        {{ submitting ? 'Guardando…' : 'Crear platillo' }}
                    </button>
                </div>
            </form>
        </div>
    </div>

    <TcMediaLibraryModal
        :open="libraryOpen"
        title="Imagen del platillo — elige o sube una"
        @close="libraryOpen = false"
        @picked="onPicked"
    />
</template>

<style scoped>
.tc-additem-overlay {
    position: fixed;
    inset: 0;
    z-index: 210;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
    padding: 20px;
}

.tc-additem-modal {
    width: 100%;
    max-width: 460px;
    max-height: 85vh;
    overflow-y: auto;
    border-radius: 14px;
    background: #fff;
    padding: 18px;
}

.tc-additem-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 12px;
}
</style>
