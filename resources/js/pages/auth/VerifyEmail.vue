<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

defineOptions({
    layout: {
        title: 'Verifica tu correo',
        description: 'Por favor verifica tu correo haciendo clic en el enlace que te enviamos.',
    },
});

defineProps<{
    status?: string;
}>();
</script>

<template>
    <Head title="Verificar correo" />

    <div
        v-if="status === 'verification-link-sent'"
        class="mb-4 text-center text-sm font-medium text-green-600"
    >
        Se ha enviado un nuevo enlace de verificación al correo que registraste.
    </div>

    <Form v-bind="send.form()" class="space-y-6 text-center" v-slot="{ processing }">
        <Button :disabled="processing" class="w-full tc-auth-submit-btn">
            <Spinner v-if="processing" />
            Reenviar correo de verificación
        </Button>

        <TextLink :href="logout()" as="button" class="mx-auto block text-sm">
            Cerrar sesión
        </TextLink>
    </Form>
</template>
