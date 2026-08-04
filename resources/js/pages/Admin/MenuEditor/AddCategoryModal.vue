<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { reactive, ref, watch } from 'vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSelect from '@/components/tc/TcSelect.vue';
import type { MenuCategoryData } from '@/components/Public/Menu/types';
import { ApiError, postFormWithProgress } from '@/lib/jsonApi';
import { layoutOptions } from '@/pages/Admin/Categories/layouts';

const props = defineProps<{
    open: boolean;
    layouts: string[];
}>();

const emit = defineEmits<{
    close: [];
    created: [category: MenuCategoryData];
}>();

function blankForm() {
    return {
        name: '',
        layout: 'grid',
        color: '#144E8F',
    };
}

const form = reactive(blankForm());
const errors = ref<Record<string, string[]>>({});
const submitting = ref(false);

watch(
    () => props.open,
    (isOpen) => {
        if (isOpen) {
            Object.assign(form, blankForm());
            errors.value = {};
        }
    },
);

function fieldError(field: string): string | undefined {
    return errors.value[field]?.join(' ');
}

async function submit() {
    if (submitting.value) {
        return;
    }

    submitting.value = true;
    errors.value = {};

    const body = new FormData();
    body.append('name', form.name);
    body.append('layout', form.layout);
    body.append('color', form.color);
    body.append('is_active', '1');

    try {
        const res = await postFormWithProgress<{ category: MenuCategoryData }>(
            '/admin/menu-editor/categories',
            body,
        );
        emit('created', res.category);
    } catch (e) {
        if (e instanceof ApiError && e.status === 422) {
            errors.value =
                (e.data as { errors?: Record<string, string[]> } | null)
                    ?.errors ?? {};
        } else {
            errors.value = {
                name: [
                    e instanceof ApiError
                        ? e.message
                        : 'No se pudo crear la sección. Intenta de nuevo.',
                ],
            };
        }
    } finally {
        submitting.value = false;
    }
}
</script>

<template>
    <div v-if="open" class="tc-additem-overlay" @click.self="emit('close')">
        <div class="tc-additem-modal">
            <div class="tc-additem-header">
                <h3 class="text-sm font-bold text-gray-800">Nueva sección</h3>
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
                    id="add-category-name"
                    v-model="form.name"
                    label="Nombre de la sección"
                    required
                    placeholder="Ej: Ensaladas"
                    :error="fieldError('name')"
                />

                <TcSelect
                    id="add-category-layout"
                    v-model="form.layout"
                    label="Plantilla"
                    :options="layoutOptions(layouts)"
                    :error="fieldError('layout')"
                    hint="Puedes cambiarla después desde Categorías. 'Genérico' funciona para cualquier lista simple de platillos."
                />

                <div class="tc-field">
                    <label for="add-category-color">Color</label>
                    <input
                        id="add-category-color"
                        v-model="form.color"
                        type="color"
                        class="h-9 w-16 rounded border border-gray-200"
                    />
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
                        {{ submitting ? 'Creando…' : 'Crear sección' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
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
    max-width: 420px;
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
