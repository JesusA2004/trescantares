<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { login } from '@/routes';

defineOptions({
    layout: {
        title: 'Registro no disponible',
        description: '',
    },
});
</script>

<template>
    <Head title="Registro" />

    <div class="flex flex-col items-center gap-4 text-center">
        <p class="text-sm text-muted-foreground">
            El registro público está deshabilitado.
        </p>
        <Link :href="login()" class="text-sm underline underline-offset-4">
            Volver al inicio de sesión
        </Link>
    </div>
</template>
