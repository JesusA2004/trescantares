<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3';
import {
    Briefcase,
    Globe,
    Image as ImageIcon,
    Info,
    Settings,
    UtensilsCrossed,
} from 'lucide-vue-next';
import { ref } from 'vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import AdminFormSection from '@/components/admin/AdminFormSection.vue';
import TcImageUpload from '@/components/tc/TcImageUpload.vue';
import TcInput from '@/components/tc/TcInput.vue';
import TcSwitch from '@/components/tc/TcSwitch.vue';
import TcTextarea from '@/components/tc/TcTextarea.vue';

const props = defineProps<{
    settings: Record<string, any>;
    imageKeys: string[];
}>();

const activeTab = ref<string>('general');

const tabs = [
    { key: 'general', label: 'General', icon: Info },
    { key: 'branding', label: 'Branding', icon: ImageIcon },
    { key: 'menu', label: 'Menú', icon: UtensilsCrossed },
    { key: 'jobs', label: 'Bolsa', icon: Briefcase },
    { key: 'social', label: 'Redes', icon: Globe },
    { key: 'urls', label: 'URLs', icon: Settings },
];

const form = useForm({
    // General
    restaurant_name: props.settings.restaurant_name ?? '',
    contact_phone: props.settings.contact_phone ?? '',
    whatsapp_phone: props.settings.whatsapp_phone ?? '',
    address: props.settings.address ?? '',
    google_maps_embed_url: props.settings.google_maps_embed_url ?? '',
    schedule: props.settings.schedule ?? '',
    currency: props.settings.currency ?? 'MXN',
    timezone: props.settings.timezone ?? 'America/Mexico_City',
    // Social
    facebook_url: props.settings.facebook_url ?? '',
    instagram_url: props.settings.instagram_url ?? '',
    tiktok_url: props.settings.tiktok_url ?? '',
    // URLs
    billing_url: props.settings.billing_url ?? '',
    privacy_policy_url: props.settings.privacy_policy_url ?? '',
    jobs_url: props.settings.jobs_url ?? '',
    // Menu
    menu_show_prices: props.settings.menu_show_prices === '1' || props.settings.menu_show_prices === true,
    menu_intro_text: props.settings.menu_intro_text ?? '',
    // Jobs
    jobs_whatsapp: props.settings.jobs_whatsapp ?? '',
    jobs_intro_text: props.settings.jobs_intro_text ?? '',
    jobs_enabled: props.settings.jobs_enabled === '1' || props.settings.jobs_enabled === true,
    // Images
    logo: null as File | null,
    favicon: null as File | null,
    hero_background: null as File | null,
    location_background: null as File | null,
    _method: 'POST',
});

type ImageKey = 'logo' | 'favicon' | 'hero_background' | 'location_background';

function handleImage(key: ImageKey, file: File | null) {
    (form as any)[key] = file;
}

const imageLabels: Record<string, string> = {
    logo: 'Logo del restaurante',
    favicon: 'Favicon (ícono del navegador)',
    hero_background: 'Imagen de fondo del hero',
    location_background: 'Imagen de fondo de ubicación',
};

function submit() {
    form.post('/admin/settings', { forceFormData: true });
}
</script>

<template>
    <Head title="Configuración" />

    <div class="tc-admin-page space-y-5">

        <AdminPageHeader title="Configuración" description="Ajusta los datos y apariencia del sitio">
            <template #label>Sistema</template>
        </AdminPageHeader>

        <!-- Tabs -->
        <div class="tc-tabs">
            <button
                v-for="tab in tabs"
                :key="tab.key"
                type="button"
                class="tc-tab"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
            >
                <component :is="tab.icon" class="w-3.5 h-3.5" />
                {{ tab.label }}
            </button>
        </div>

        <form @submit.prevent="submit" class="space-y-4">

            <!-- TAB: General -->
            <template v-if="activeTab === 'general'">
                <AdminFormSection title="Información del restaurante">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <TcInput id="restaurant_name" v-model="form.restaurant_name" label="Nombre" />
                        <TcInput id="contact_phone" v-model="form.contact_phone" label="Teléfono de contacto" />
                        <TcInput id="whatsapp_phone" v-model="form.whatsapp_phone" label="WhatsApp (solo números)" hint="Ej: 527774475431" />
                        <TcInput id="address" v-model="form.address" label="Dirección" />
                        <TcInput id="currency" v-model="form.currency" label="Moneda" hint="Ej: MXN, USD" />
                        <TcInput id="timezone" v-model="form.timezone" label="Zona horaria" hint="Ej: America/Mexico_City" />
                    </div>
                    <TcTextarea id="schedule" v-model="form.schedule" label="Horarios" :rows="4" placeholder="Lunes a Jueves: 9am–10pm&#10;Martes: cerrado" />
                    <TcTextarea id="maps_url" v-model="form.google_maps_embed_url" label="Google Maps Embed URL" :rows="3" hint="Copia el src del iframe de Google Maps" />
                </AdminFormSection>
            </template>

            <!-- TAB: Branding -->
            <template v-if="activeTab === 'branding'">
                <AdminFormSection title="Imágenes del sitio" description="Dejar sin cambios para conservar las imágenes actuales">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <TcImageUpload
                            v-for="key in imageKeys"
                            :key="key"
                            :label="imageLabels[key]"
                            :current-url="settings[key + '_url'] ?? null"
                            :max-mb="5"
                            @change="(f) => handleImage(key as ImageKey, f)"
                        />
                    </div>
                </AdminFormSection>
            </template>

            <!-- TAB: Menú -->
            <template v-if="activeTab === 'menu'">
                <AdminFormSection title="Configuración del menú público">
                    <TcSwitch
                        v-model="form.menu_show_prices"
                        label="Mostrar precios"
                        description="Los precios se verán en el menú público"
                    />
                    <TcTextarea
                        id="menu_intro_text"
                        v-model="form.menu_intro_text"
                        label="Texto introductorio del menú"
                        :rows="3"
                        placeholder="Texto que aparece al inicio del menú público…"
                    />
                </AdminFormSection>
            </template>

            <!-- TAB: Bolsa -->
            <template v-if="activeTab === 'jobs'">
                <AdminFormSection title="Bolsa de trabajo">
                    <TcSwitch
                        v-model="form.jobs_enabled"
                        label="Bolsa de trabajo activa"
                        description="Habilita o deshabilita la sección de bolsa de trabajo"
                    />
                    <TcInput
                        id="jobs_whatsapp"
                        v-model="form.jobs_whatsapp"
                        label="WhatsApp de bolsa de trabajo (solo números)"
                        hint="Ej: 527772678443"
                    />
                    <TcTextarea
                        id="jobs_intro_text"
                        v-model="form.jobs_intro_text"
                        label="Texto introductorio"
                        :rows="4"
                        placeholder="Describe la cultura y oportunidades del restaurante…"
                    />
                </AdminFormSection>
            </template>

            <!-- TAB: Redes -->
            <template v-if="activeTab === 'social'">
                <AdminFormSection title="Redes sociales">
                    <TcInput id="facebook_url" v-model="form.facebook_url" label="Facebook URL" placeholder="https://facebook.com/…" />
                    <TcInput id="instagram_url" v-model="form.instagram_url" label="Instagram URL" placeholder="https://instagram.com/…" />
                    <TcInput id="tiktok_url" v-model="form.tiktok_url" label="TikTok URL" placeholder="https://tiktok.com/@…" />
                </AdminFormSection>
            </template>

            <!-- TAB: URLs -->
            <template v-if="activeTab === 'urls'">
                <AdminFormSection title="URLs del sitio" description="Solo la URL de facturación es personalizable. Las demás son rutas fijas del sistema.">
                    <TcInput id="billing_url" v-model="form.billing_url" label="Facturación URL" placeholder="https://…" hint="URL externa donde los clientes pueden solicitar factura" />

                    <!-- Readonly URLs -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="tc-field">
                            <label class="tc-label">Aviso de Privacidad</label>
                            <div class="flex items-center gap-2 tc-input bg-gray-50 cursor-default select-text text-gray-500">
                                <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Fija</span>
                                <span class="font-mono text-sm">/aviso-de-privacidad</span>
                            </div>
                            <p class="tc-help-text">Ruta interna del sistema, no editable</p>
                        </div>
                        <div class="tc-field">
                            <label class="tc-label">Bolsa de Trabajo</label>
                            <div class="flex items-center gap-2 tc-input bg-gray-50 cursor-default select-text text-gray-500">
                                <span class="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">Fija</span>
                                <span class="font-mono text-sm">/bolsa-de-trabajo</span>
                            </div>
                            <p class="tc-help-text">Ruta interna del sistema, no editable</p>
                        </div>
                    </div>
                </AdminFormSection>
            </template>

            <div class="flex gap-3 pt-2">
                <button type="submit" class="tc-btn-primary" :disabled="form.processing">
                    {{ form.processing ? 'Guardando…' : 'Guardar configuración' }}
                </button>
            </div>

        </form>
    </div>
</template>
