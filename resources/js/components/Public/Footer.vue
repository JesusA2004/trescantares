<script setup lang="ts">
import { logoTresCantares, bgFooter } from '@/lib/tres-cantares-assets';

defineProps<{ settings: Record<string, any> }>();
</script>

<template>
    <!-- bg-footer.png como fondo real, no overlay -->
    <footer
        class="tc-footer-public"
        :style="{ backgroundImage: `url(${bgFooter})` }">

        <div style="max-width: 1120px; margin: 0 auto; padding: 24px 80px 0;">

            <!-- 3 columnas -->
            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;">

                <!-- COL 1: Logo + tagline -->
                <div style="flex: 0 0 auto;">
                    <img
                        v-if="settings.logo_url || settings.logo"
                        :src="settings.logo_url || settings.logo"
                        alt="Tres Cantares"
                        style="height: 68px; object-fit: contain; display: block;" />
                    <img
                        v-else
                        :src="logoTresCantares"
                        alt="Tres Cantares"
                        style="height: 68px; object-fit: contain; display: block;" />
                    <p class="font-display" style="font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--tc-pink); margin-top: 6px;">
                        El sabor auténtico de México
                    </p>
                </div>

                <!-- COL 2: Contacto / Horario / Ubicación -->
                <div style="flex: 0 0 auto;" class="font-body">
                    <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tc-blue); margin-bottom: 3px;">
                        Contacto
                    </p>
                    <p style="font-size: 12px; color: var(--tc-dark); line-height: 1.5; margin-bottom: 8px;">
                        {{ settings.contact_phone || '+52 777 153 1475' }}
                    </p>
                    <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tc-blue); margin-bottom: 3px;">
                        Horario
                    </p>
                    <p style="font-size: 12px; color: var(--tc-dark); line-height: 1.5; margin-bottom: 8px; white-space: pre-line;">
                        {{ settings.schedule || 'Lunes a Domingo, 08:00 a 22:00 hrs.' }}
                    </p>
                    <p style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tc-blue); margin-bottom: 3px;">
                        Ubicación
                    </p>
                    <p style="font-size: 12px; color: var(--tc-dark); line-height: 1.5;">
                        {{ settings.address || 'Tepoztlán, Morelos' }}
                    </p>
                </div>

                <!-- COL 3: Links + Redes -->
                <div style="flex: 0 0 auto; text-align: right;">
                    <div style="display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px;">
                        <a :href="settings.privacy_policy_url && settings.privacy_policy_url !== '#' ? settings.privacy_policy_url : '#'"
                            class="font-display uppercase transition-opacity hover:opacity-70"
                            style="font-size: 10px; letter-spacing: 0.12em; color: var(--tc-dark); text-decoration: none;">
                            Aviso de Privacidad
                        </a>
                        <a :href="settings.jobs_url && settings.jobs_url !== '#' ? settings.jobs_url : '#'"
                            class="font-display uppercase transition-opacity hover:opacity-70"
                            style="font-size: 10px; letter-spacing: 0.12em; color: var(--tc-dark); text-decoration: none;">
                            Bolsa de Trabajo
                        </a>
                        <a :href="settings.billing_url && settings.billing_url !== '#' ? settings.billing_url : '#'"
                            class="font-display uppercase transition-opacity hover:opacity-70"
                            style="font-size: 10px; letter-spacing: 0.12em; color: var(--tc-dark); text-decoration: none;">
                            Facturación
                        </a>
                    </div>

                    <p class="font-display" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tc-blue); margin-bottom: 6px;">
                        Síguenos
                    </p>

                    <!-- Redes sociales -->
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <a v-if="settings.facebook_url && settings.facebook_url !== '#'"
                            :href="settings.facebook_url" target="_blank" rel="noopener"
                            class="transition-opacity hover:opacity-80"
                            style="width: 26px; height: 26px; border-radius: 50%; background-color: #1877F2; display: inline-flex; align-items: center; justify-content: center;">
                            <svg style="width: 11px; height: 11px; color: white;" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                            </svg>
                        </a>
                        <a v-if="settings.instagram_url && settings.instagram_url !== '#'"
                            :href="settings.instagram_url" target="_blank" rel="noopener"
                            class="transition-opacity hover:opacity-80"
                            style="width: 26px; height: 26px; border-radius: 50%; background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%); display: inline-flex; align-items: center; justify-content: center;">
                            <svg style="width: 11px; height: 11px; color: white;" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                            </svg>
                        </a>
                        <a v-if="settings.tiktok_url && settings.tiktok_url !== '#'"
                            :href="settings.tiktok_url" target="_blank" rel="noopener"
                            class="transition-opacity hover:opacity-80"
                            style="width: 26px; height: 26px; border-radius: 50%; background-color: #000; display: inline-flex; align-items: center; justify-content: center;">
                            <svg style="width: 11px; height: 11px; color: white;" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.78 1.54V6.87a4.84 4.84 0 01-1.01-.18z"/>
                            </svg>
                        </a>
                        <a v-if="settings.whatsapp_phone"
                            :href="`https://wa.me/${settings.whatsapp_phone}`" target="_blank" rel="noopener"
                            class="transition-opacity hover:opacity-80"
                            style="width: 26px; height: 26px; border-radius: 50%; background-color: #25D366; display: inline-flex; align-items: center; justify-content: center;">
                            <svg style="width: 11px; height: 11px; color: white;" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Copyright -->
            <div style="margin-top: 14px; border-top: 1px solid rgba(0,0,0,0.13); padding: 7px 0 12px;">
                <p class="font-body" style="text-align: center; font-size: 9px; text-transform: uppercase; letter-spacing: 0.14em; color: rgba(0,0,0,0.42);">
                    TRES CANTARES &copy; {{ new Date().getFullYear() }} TODOS LOS DERECHOS RESERVADOS.
                </p>
            </div>
        </div>
    </footer>
</template>
