<script setup lang="ts">
defineProps<{ settings: Record<string, any> }>();
</script>

<template>
    <footer class="bg-papel border-t border-gray-200">
        <div class="max-w-7xl mx-auto px-6 py-12">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Logo y nombre -->
                <div class="md:col-span-1 flex flex-col items-start gap-3">
                    <img v-if="settings.logo_url || settings.logo" :src="settings.logo_url || settings.logo"
                        alt="Tres Cantares" class="h-16 object-contain" />
                    <div v-else>
                        <p class="font-display text-2xl text-tc-rojo tracking-widest">TRES</p>
                        <p class="font-display text-2xl text-tc-rojo tracking-widest">CANTARES</p>
                    </div>
                    <p class="text-sm text-gray-500 font-body">El sabor auténtico de México.</p>
                </div>

                <!-- Contacto -->
                <div>
                    <h4 class="font-display text-tc-oscuro tracking-wider mb-3 text-lg">CONTACTO</h4>
                    <ul class="space-y-2 text-sm text-gray-600 font-body">
                        <li v-if="settings.contact_phone">
                            <span class="font-semibold">Tel:</span> {{ settings.contact_phone }}
                        </li>
                        <li v-if="settings.whatsapp_phone">
                            <a :href="`https://wa.me/${settings.whatsapp_phone}`" target="_blank"
                               class="text-tc-verde hover:underline">WhatsApp</a>
                        </li>
                    </ul>
                </div>

                <!-- Horario -->
                <div>
                    <h4 class="font-display text-tc-oscuro tracking-wider mb-3 text-lg">HORARIO</h4>
                    <p class="text-sm text-gray-600 font-body whitespace-pre-line">{{ settings.schedule || 'Consulta nuestras redes.' }}</p>
                </div>

                <!-- Dirección y Links -->
                <div>
                    <h4 class="font-display text-tc-oscuro tracking-wider mb-3 text-lg">UBICACIÓN</h4>
                    <p class="text-sm text-gray-600 font-body mb-4">{{ settings.address }}</p>
                    <ul class="space-y-1 text-sm">
                        <li><a href="#" class="text-gray-500 hover:text-tc-rojo transition-colors">Aviso de privacidad</a></li>
                        <li><a href="#" class="text-gray-500 hover:text-tc-rojo transition-colors">Bolsa de trabajo</a></li>
                        <li><a href="#" class="text-gray-500 hover:text-tc-rojo transition-colors">Facturación</a></li>
                    </ul>
                </div>
            </div>

            <!-- Redes sociales -->
            <div class="mt-8 pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <p class="text-xs text-gray-400 font-body text-center">
                    TRES CANTARES © {{ new Date().getFullYear() }} TODOS LOS DERECHOS RESERVADOS.
                </p>
                <div class="flex gap-4">
                    <a v-if="settings.facebook_url && settings.facebook_url !== '#'"
                       :href="settings.facebook_url" target="_blank"
                       class="text-gray-400 hover:text-tc-azul transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                        </svg>
                    </a>
                    <a v-if="settings.instagram_url && settings.instagram_url !== '#'"
                       :href="settings.instagram_url" target="_blank"
                       class="text-gray-400 hover:text-tc-rojo transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                        </svg>
                    </a>
                    <a v-if="settings.tiktok_url && settings.tiktok_url !== '#'"
                       :href="settings.tiktok_url" target="_blank"
                       class="text-gray-400 hover:text-tc-oscuro transition-colors">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.54V6.87a4.84 4.84 0 01-1.01-.18z"/>
                        </svg>
                    </a>
                </div>
            </div>
        </div>
    </footer>
</template>
