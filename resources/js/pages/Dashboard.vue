<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { dashboard } from '@/routes';

defineOptions({
    layout: {
        breadcrumbs: [
            {
                title: 'Dashboard',
                href: dashboard(),
            },
        ],
    },
});

const adminLinks = [
    { label: 'Categorías', description: 'Gestionar categorías del menú', href: '/admin/categories', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Platillos', description: 'Crear y editar platillos', href: '/admin/menu-items', color: 'bg-green-50 border-green-200 text-green-700' },
    { label: 'Usuarios', description: 'Administrar usuarios y roles', href: '/admin/users', color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { label: 'Configuración', description: 'Ajustar datos del restaurante', href: '/admin/settings', color: 'bg-orange-50 border-orange-200 text-orange-700' },
];
</script>

<template>
    <Head title="Dashboard" />

    <div class="flex h-full flex-1 flex-col gap-6 p-4 overflow-x-auto">
        <div>
            <h2 class="text-xl font-semibold text-gray-800 mb-1">Panel de Administración</h2>
            <p class="text-sm text-gray-500">Tres Cantares — Gestiona tu restaurante desde aquí.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link v-for="link in adminLinks" :key="link.href" :href="link.href"
                class="block rounded-xl border p-5 transition-all hover:shadow-md hover:-translate-y-0.5"
                :class="link.color">
                <h3 class="font-semibold text-base mb-1">{{ link.label }}</h3>
                <p class="text-sm opacity-75">{{ link.description }}</p>
            </Link>
        </div>

        <div class="flex gap-4 mt-4">
            <Link href="/" target="_blank"
                class="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
                Ver sitio web público →
            </Link>
            <Link href="/menu" target="_blank"
                class="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2">
                Ver menú público →
            </Link>
        </div>
    </div>
</template>
