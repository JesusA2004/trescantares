<script setup lang="ts">
import { Head, Link, useForm } from '@inertiajs/vue3';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import TcImageUpload from '@/components/tc/TcImageUpload.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';

const form = useForm({
    name: '',
    description: '',
    icon: '',
    color: '#144e8f',
    image: null as File | null,
    sort_order: 0,
    is_active: true,
});

function handleImage(file: File | null) {
    form.image = file;
}

function submit() {
    form.post('/admin/categories', { forceFormData: true });
}
</script>

<template>
    <Head title="Nueva Categoría" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Nueva Categoría" description="Agrega una sección al menú">
            <template #label>Categorías</template>
            <template #actions>
                <Link href="/admin/categories" class="tc-btn-secondary">
                    ← Volver
                </Link>
            </template>
        </AdminPageHeader>

        <form @submit.prevent="submit" class="space-y-4">

            <AdminFormSection title="Información básica">
                <TcInput
                    id="name"
                    v-model="form.name"
                    label="Nombre"
                    required
                    placeholder="Ej: Entradas, Sopas, Postres…"
                    :error="form.errors.name"
                />
                <TcTextarea
                    id="description"
                    v-model="form.description"
                    label="Descripción"
                    placeholder="Descripción breve de la categoría (opcional)"
                    :rows="3"
                    :error="form.errors.description"
                />
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput
                        id="icon"
                        v-model="form.icon"
                        label="Ícono (nombre Lucide, opcional)"
                        placeholder="Ej: Soup, Salad, Coffee…"
                    />
                    <div class="tc-field">
                        <label for="color">Color de la categoría</label>
                        <div class="flex items-center gap-3">
                            <input
                                id="color"
                                v-model="form.color"
                                type="color"
                                class="w-10 h-10 rounded-lg border border-gray-200 dark:border-amber-400/30 cursor-pointer"
                            />
                            <span class="tc-input flex-1 text-gray-500 text-sm">{{ form.color }}</span>
                        </div>
                    </div>
                </div>
            </AdminFormSection>

            <AdminFormSection title="Imagen">
                <TcImageUpload
                    label="Imagen de categoría (opcional)"
                    hint="JPG, PNG, WEBP · Máx. 4MB"
                    :max-mb="4"
                    :error="form.errors.image"
                    @change="handleImage"
                />
            </AdminFormSection>

            <AdminFormSection title="Configuración">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <TcInput
                        id="sort_order"
                        v-model="form.sort_order"
                        type="number"
                        label="Orden de aparición"
                        hint="Número menor aparece primero"
                    />
                    <div class="flex items-end pb-1">
                        <TcSwitch
                            v-model="form.is_active"
                            label="Categoría activa"
                            description="Visible en el menú público"
                        />
                    </div>
                </div>
            </AdminFormSection>

            <div class="flex gap-3">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Crear categoría' }}
                </button>
                <Link href="/admin/categories" class="tc-btn-secondary">Cancelar</Link>
            </div>

        </form>
    </div>
</template>
