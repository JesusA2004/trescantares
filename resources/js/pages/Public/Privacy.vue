<script setup lang="ts">
import { Head } from '@inertiajs/vue3';

defineProps<{ settings: Record<string, any> }>();

const currentYear = new Date().getFullYear();
</script>

<template>
    <Head>
        <title>Aviso de Privacidad — Tres Cantares | Restaurante en Tepoztlán</title>
        <meta head-key="description" name="description"
            content="Aviso de privacidad de Tres Cantares. Conoce cómo tratamos y protegemos tu información personal conforme a la legislación mexicana vigente." />
        <meta head-key="og:title" property="og:title"
            content="Aviso de Privacidad — Tres Cantares" />
        <meta head-key="og:description" property="og:description"
            content="Aviso de privacidad de Tres Cantares, restaurante mexicano en Tepoztlán, Morelos." />
        <meta head-key="og:url" property="og:url" content="/aviso-de-privacidad" />
        <link head-key="canonical" rel="canonical" href="/aviso-de-privacidad" />
    </Head>

    <div class="tc-privacy-page">

        <!-- Hero -->
        <section class="tc-privacy-hero">
            <div class="tc-privacy-hero-inner">
                <div class="tc-privacy-ornament">
                    <span class="tc-privacy-orn-line"></span>
                    <span class="tc-privacy-orn-star font-display">✦</span>
                    <span class="tc-privacy-orn-line"></span>
                </div>

                <h1 class="tc-privacy-hero-title font-display">
                    Aviso de<br>Privacidad
                </h1>

                <div class="tc-privacy-ornament tc-privacy-ornament--bottom">
                    <span class="tc-privacy-orn-line"></span>
                    <span class="tc-privacy-orn-star font-display">✦</span>
                    <span class="tc-privacy-orn-line"></span>
                </div>

                <p class="tc-privacy-hero-sub font-body">
                    Tres Cantares &middot; Tepoztlán, Morelos
                </p>
            </div>
        </section>

        <!-- Content -->
        <section class="tc-privacy-content">
            <div class="tc-privacy-container">

                <div class="tc-privacy-meta font-body">
                    <span>Última actualización: {{ currentYear }}</span>
                    <span class="tc-privacy-meta-dot">·</span>
                    <span>Tres Cantares, Tepoztlán, Morelos</span>
                </div>

                <div class="tc-privacy-sections">

                    <!-- I -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">I</span>
                            <h2 class="tc-privacy-section-title font-display">Identidad del Responsable</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                <strong>Tres Cantares</strong>, con domicilio en Arq. Pablo González 1, La Santísima,
                                62520 Tepoztlán, Morelos, es responsable del tratamiento de los datos personales que
                                nos proporcione, de conformidad con la Ley Federal de Protección de Datos Personales
                                en Posesión de los Particulares (LFPDPPP) y su Reglamento.
                            </p>
                        </div>
                    </div>

                    <!-- II -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">II</span>
                            <h2 class="tc-privacy-section-title font-display">Datos Personales que Recabamos</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Para las finalidades descritas en el presente aviso, podemos recabar los siguientes datos:
                            </p>
                            <ul class="tc-privacy-list font-body">
                                <li>Nombre completo</li>
                                <li>Número de teléfono o WhatsApp</li>
                                <li>Correo electrónico (cuando aplique)</li>
                                <li>Información de contacto proporcionada voluntariamente</li>
                            </ul>
                            <p class="tc-privacy-text font-body">No recabamos datos personales sensibles.</p>
                        </div>
                    </div>

                    <!-- III -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">III</span>
                            <h2 class="tc-privacy-section-title font-display">Finalidades del Tratamiento</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">Los datos personales que recabamos serán utilizados para:</p>
                            <ul class="tc-privacy-list font-body">
                                <li>Atender solicitudes, consultas y comentarios</li>
                                <li>Gestionar solicitudes de empleo y contacto de candidatos</li>
                                <li>Proporcionar información sobre nuestros servicios y productos</li>
                                <li>Dar seguimiento a reservaciones o pedidos especiales</li>
                            </ul>
                        </div>
                    </div>

                    <!-- IV -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">IV</span>
                            <h2 class="tc-privacy-section-title font-display">Transferencia de Datos</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Sus datos personales no serán transferidos a terceros sin su consentimiento, salvo las
                                excepciones previstas en el artículo 37 de la LFPDPPP o cuando sea requerido por
                                autoridad competente. No vendemos ni rentamos datos personales a terceros.
                            </p>
                        </div>
                    </div>

                    <!-- V -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">V</span>
                            <h2 class="tc-privacy-section-title font-display">Derechos ARCO</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al
                                tratamiento de sus datos personales (derechos ARCO). Para ejercerlos contáctenos:
                            </p>
                            <ul class="tc-privacy-list font-body">
                                <li>Teléfono: 777 447 5431</li>
                                <li>Visita presencial: Arq. Pablo González 1, La Santísima, 62520 Tepoztlán, Mor.</li>
                            </ul>
                            <p class="tc-privacy-text font-body">
                                Le daremos respuesta en un plazo no mayor a 20 días hábiles a partir de la recepción de su solicitud.
                            </p>
                        </div>
                    </div>

                    <!-- VI -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num">VI</span>
                            <h2 class="tc-privacy-section-title font-display">Modificaciones al Aviso</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Tres Cantares se reserva el derecho de modificar el presente aviso en cualquier momento.
                                Los cambios serán publicados en esta misma página. Le recomendamos revisarlo periódicamente.
                            </p>
                        </div>
                    </div>

                </div>

                <!-- Notice -->
                <div class="tc-privacy-notice font-body">
                    <span class="tc-privacy-notice-icon">i</span>
                    <p>
                        <strong>Nota:</strong> Este aviso es un borrador base. El texto definitivo y específico
                        será actualizado próximamente por el responsable del establecimiento.
                    </p>
                </div>

            </div>
        </section>

    </div>
</template>
