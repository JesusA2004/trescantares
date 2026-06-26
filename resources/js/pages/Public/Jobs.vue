<script setup lang="ts">
import { ref } from 'vue';
import { Head } from '@inertiajs/vue3';
import { cantaritoMain, pozoleLeft, tacoLeft, limonLeft } from '@/lib/tres-cantares-assets';
import TcDatePicker from '@/components/Public/TcDatePicker.vue';
import TcSelect from '@/components/Public/TcSelect.vue';

defineProps<{ settings: Record<string, any> }>();

const WA_NUMBER = '527772678443';

const form = ref({
    name: '',
    birthdate: '',
    phone: '',
    email: '',
    position: '',
    experience: '',
    availability: '',
});

const formError = ref('');

const positionOptions = [
    { value: 'Mesero/a', label: 'Mesero/a' },
    { value: 'Cocinero/a', label: 'Cocinero/a' },
    { value: 'Bartender', label: 'Bartender' },
    { value: 'Ayudante de cocina', label: 'Ayudante de cocina' },
    { value: 'Cajero/a', label: 'Cajero/a' },
    { value: 'Hostess', label: 'Hostess' },
    { value: 'Limpieza', label: 'Limpieza' },
    { value: 'Administración', label: 'Administración' },
    { value: 'Otra', label: 'Otra' },
];

const availabilityOptions = [
    { value: 'Tiempo completo', label: 'Tiempo completo' },
    { value: 'Medio tiempo', label: 'Medio tiempo' },
    { value: 'Fines de semana', label: 'Fines de semana' },
    { value: 'Flexible / A convenir', label: 'Flexible / A convenir' },
];

function sendViaWhatsApp() {
    formError.value = '';
    const { name, phone, position } = form.value;
    if (!name.trim() || !phone.trim() || !position) {
        formError.value = 'Por favor completa los campos obligatorios: Nombre, Teléfono y Vacante de interés.';
        return;
    }

    const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    function formatDate(d: string) {
        if (!d) return '';
        const parts = d.split('-').map(Number);
        return `${parts[2]} de ${MONTHS[parts[1]-1]} de ${parts[0]}`;
    }

    let msg = '¡Hola, Tres Cantares! Me interesa postularme a una vacante.\n\n';
    msg += `*Nombre completo:* ${name.trim()}\n`;
    if (form.value.birthdate) msg += `*Fecha de nacimiento:* ${formatDate(form.value.birthdate)}\n`;
    msg += `*Teléfono:* ${phone.trim()}\n`;
    if (form.value.email.trim()) msg += `*Correo:* ${form.value.email.trim()}\n`;
    msg += `*Vacante de interés:* ${position}\n`;
    if (form.value.availability) msg += `*Disponibilidad:* ${form.value.availability}\n`;
    if (form.value.experience.trim()) msg += `\n*Experiencia / Mensaje:*\n${form.value.experience.trim()}\n`;

    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
}
</script>

<template>
    <Head>
        <title>Bolsa de Trabajo — Tres Cantares | Únete a Nuestro Equipo</title>
        <meta head-key="description" name="description"
            content="Únete al equipo de Tres Cantares en Tepoztlán, Morelos. Postúlate fácil por WhatsApp con nuestro formulario en línea." />
        <meta head-key="og:title" property="og:title" content="Bolsa de Trabajo — Tres Cantares" />
        <meta head-key="og:url" property="og:url" content="/bolsa-de-trabajo" />
        <link head-key="canonical" rel="canonical" href="/bolsa-de-trabajo" />
    </Head>

    <div class="tc-privacy-page tc-public-layout">

        <!-- ── IMÁGENES DECORATIVAS FLOTANTES ───────────────── -->

        <!-- Cantarito — derecha alta -->
        <img
            :src="cantaritoMain" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="right: -20px; top: 40px; width: clamp(180px, 18vw, 340px); animation: tc-float-slow 8s ease-in-out infinite;"
        />

        <!-- Tacos — izquierda, zona título -->
        <img
            :src="tacoLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="left: -30px; top: 80px; width: clamp(180px, 18vw, 340px); animation: tc-float-med 9s 1s ease-in-out infinite;"
        />

        <!-- Pozole — derecha media, zona formulario -->
        <img
            :src="pozoleLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="right: -40px; top: 52%; width: clamp(200px, 20vw, 380px); animation: tc-float 10s 2s ease-in-out infinite;"
        />

        <!-- Limones — izquierda baja -->
        <img
            :src="limonLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="left: 0; bottom: 100px; width: clamp(110px, 11vw, 200px); opacity: .82; animation: tc-float-med 7s 3s ease-in-out infinite;"
        />

        <!-- ── TÍTULO — centrado, grande ───────────── -->
        <div class="tc-jobs-title-section" style="z-index:30; position:relative;">
            <div class="tc-jobs-title-container">

                <div class="tc-premium-ornament">
                    <span class="tc-gold-line"></span>
                    <span class="tc-gold-star font-display">✦</span>
                    <span class="tc-gold-line"></span>
                </div>

                <h1 class="tc-page-title-xl">
                    Bolsa de<br>Trabajo
                </h1>

                <p class="tc-page-title-tagline" style="margin-top:18px;">
                    Forma parte de la familia Tres Cantares
                </p>

                <div class="tc-premium-ornament">
                    <span class="tc-gold-line"></span>
                    <span class="tc-gold-star font-display">✦</span>
                    <span class="tc-gold-line"></span>
                </div>

            </div>
        </div>

        <!-- ── FORMULARIO ─────────────────────────────────── -->
        <section class="tc-jobs-form-section" style="position:relative;z-index:30;">
            <div class="tc-jobs-inner">

                <!-- Intro -->
                <div class="tc-jobs-intro">
                    <p class="font-display tc-jobs-intro-title">¿Por qué trabajar con nosotros?</p>
                    <p class="font-body tc-jobs-intro-text">
                        En Tres Cantares somos más que un restaurante. Somos un equipo apasionado por la
                        gastronomía mexicana, comprometido con ofrecer la mejor experiencia en el corazón
                        de Tepoztlán. Postúlate y forma parte de esta familia.
                    </p>
                </div>

                <!-- Form card -->
                <div class="tc-jobs-form-card">
                    <div class="tc-jobs-form-header">
                        <p class="tc-jobs-form-eyebrow font-display">✦ ÚNETE A NUESTRO EQUIPO ✦</p>
                        <h2 class="font-display tc-jobs-form-title">Formulario de Solicitud</h2>
                        <p class="font-body tc-jobs-form-subtitle">
                            Completa tus datos y te contactaremos a la brevedad
                        </p>
                    </div>

                    <form @submit.prevent="sendViaWhatsApp" novalidate>
                        <div class="tc-jobs-form-grid">

                            <!-- Nombre -->
                            <div class="tc-jobs-field tc-jobs-field--full">
                                <label class="tc-jobs-label font-body" for="j-name">
                                    Nombre completo <span style="color:var(--tc-pink)">*</span>
                                </label>
                                <input id="j-name" type="text" v-model="form.name"
                                    class="tc-jobs-input font-body"
                                    placeholder="Tu nombre completo" autocomplete="name" />
                            </div>

                            <!-- Fecha de nacimiento — date picker moderno -->
                            <div class="tc-jobs-field">
                                <label class="tc-jobs-label font-body">Fecha de nacimiento</label>
                                <TcDatePicker
                                    v-model="form.birthdate"
                                    placeholder="Selecciona tu fecha de nacimiento"
                                />
                            </div>

                            <!-- Teléfono -->
                            <div class="tc-jobs-field">
                                <label class="tc-jobs-label font-body" for="j-phone">
                                    Teléfono <span style="color:var(--tc-pink)">*</span>
                                </label>
                                <input id="j-phone" type="tel" v-model="form.phone"
                                    class="tc-jobs-input font-body"
                                    placeholder="10 dígitos" autocomplete="tel" />
                            </div>

                            <!-- Correo -->
                            <div class="tc-jobs-field">
                                <label class="tc-jobs-label font-body" for="j-email">Correo electrónico</label>
                                <input id="j-email" type="email" v-model="form.email"
                                    class="tc-jobs-input font-body"
                                    placeholder="tu@correo.com" autocomplete="email" />
                            </div>

                            <!-- Vacante -->
                            <div class="tc-jobs-field">
                                <label class="tc-jobs-label font-body">
                                    Vacante de interés <span style="color:var(--tc-pink)">*</span>
                                </label>
                                <TcSelect
                                    v-model="form.position"
                                    :options="positionOptions"
                                    placeholder="Selecciona una vacante"
                                />
                            </div>

                            <!-- Disponibilidad -->
                            <div class="tc-jobs-field">
                                <label class="tc-jobs-label font-body">Disponibilidad de horario</label>
                                <TcSelect
                                    v-model="form.availability"
                                    :options="availabilityOptions"
                                    placeholder="Selecciona disponibilidad"
                                />
                            </div>

                            <!-- Experiencia -->
                            <div class="tc-jobs-field tc-jobs-field--full">
                                <label class="tc-jobs-label font-body" for="j-exp">
                                    Experiencia breve / Mensaje
                                </label>
                                <textarea id="j-exp" v-model="form.experience"
                                    class="tc-jobs-input tc-jobs-textarea font-body"
                                    placeholder="Cuéntanos sobre tu experiencia o por qué te interesa formar parte de Tres Cantares..."></textarea>
                            </div>

                        </div>

                        <p v-if="formError" class="tc-jobs-error font-body">{{ formError }}</p>

                        <p class="tc-jobs-disclaimer font-body">
                            Al enviar tu información por WhatsApp, aceptas que Tres Cantares te contacte para el
                            seguimiento de tu solicitud.
                            <a href="/aviso-de-privacidad" class="tc-jobs-disclaimer-link">Ver aviso de privacidad.</a>
                        </p>

                        <div style="text-align:center;">
                            <button type="submit" class="tc-jobs-submit-btn font-body">
                                <svg style="width:24px;height:24px;flex-shrink:0;" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                </svg>
                                Enviar por WhatsApp
                            </button>
                        </div>
                    </form>
                </div>

                <p class="font-body tc-jobs-cta-hint" style="text-align:center; margin-top:32px;">
                    También puedes visitarnos directamente en<br>
                    Arq. Pablo González #1, La Santísima, Tepoztlán, Morelos.
                </p>

            </div>
        </section>

    </div>
</template>
