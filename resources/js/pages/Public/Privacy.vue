<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { cantaritoMain, pozoleLeft, tacoLeft, menuDishRight, limonLeft } from '@/lib/tres-cantares-assets';

defineProps<{ settings: Record<string, any> }>();

const currentYear = new Date().getFullYear();
</script>

<template>
    <Head>
        <title>Aviso de Privacidad — Tres Cantares | Restaurante en Tepoztlán</title>
        <meta head-key="description" name="description"
            content="Aviso de privacidad de Tres Cantares. Conoce cómo tratamos y protegemos tu información personal conforme a la legislación mexicana vigente." />
        <meta head-key="og:title" property="og:title" content="Aviso de Privacidad — Tres Cantares" />
        <meta head-key="og:url" property="og:url" content="/aviso-de-privacidad" />
        <link head-key="canonical" rel="canonical" href="/aviso-de-privacidad" />
    </Head>

    <div class="tc-privacy-page">

        <!-- ── IMÁGENES DECORATIVAS FLOTANTES ─────────────────── -->

        <!-- Pozole — abajo izquierda -->
        <img
            :src="pozoleLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="
                left: -40px; bottom: 120px;
                width: clamp(240px, 24vw, 460px);
                animation: tc-float-slow 9s ease-in-out infinite;
            "
        />

        <!-- Tacos — lateral izquierdo, zona media -->
        <img
            :src="tacoLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="left: -30px; top: 42%; width: clamp(220px, 22vw, 440px); animation: tc-float-med 8s 1.5s ease-in-out infinite;"
        />

        <!-- Dish — lateral derecho -->
        <img
            :src="menuDishRight" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="right: -30px; top: 55%; width: clamp(240px, 23vw, 460px); animation: tc-float 10s 2s ease-in-out infinite;"
        />

        <!-- Limones — arriba derecha, detrás del cantarito -->
        <img
            :src="limonLeft" alt="" aria-hidden="true" loading="lazy"
            class="tc-floating-food"
            style="right: 20px; top: 18%; width: clamp(130px, 13vw, 240px); opacity: .82; animation: tc-float-med 7s 3s ease-in-out infinite;"
        />

        <!-- ── ENCABEZADO EDITORIAL ─────────────────────────── -->
        <div class="tc-privacy-title-section" style="position:relative;z-index:30;">
            <div class="tc-privacy-container">

                <div class="tc-privacy-header-grid">

                    <!-- Columna texto -->
                    <div class="tc-privacy-header-left">

                        <!-- Ornamento gold -->
                        <div class="tc-premium-ornament" style="justify-content:flex-start;">
                            <span class="tc-gold-line"></span>
                            <span class="tc-gold-star font-display">✦</span>
                            <span class="tc-gold-line"></span>
                        </div>

                        <p class="tc-privacy-header-eyebrow font-display">
                            Tres Cantares &middot; Tepoztlán, Morelos
                        </p>

                        <h1 class="tc-page-title-xl" style="text-align:left;">
                            Aviso de<br>Privacidad
                        </h1>

                        <p class="tc-page-title-tagline" style="text-align:left; margin-top:14px; margin-bottom:20px;">
                            Transparencia y cuidado<br>de tus datos personales.
                        </p>

                        <p class="tc-privacy-main-sub font-body">
                            Última actualización: {{ currentYear }}
                        </p>
                    </div>

                    <!-- Cantarito principal -->
                    <div class="tc-privacy-header-right" style="z-index:30;">
                        <img
                            :src="cantaritoMain"
                            alt="Cantarito Tres Cantares"
                            loading="lazy"
                            style="
                                width: clamp(220px, 22vw, 400px);
                                height: auto;
                                object-fit: contain;
                                filter: drop-shadow(0 20px 44px rgba(0,0,0,.22));
                                animation: tc-float-slow 8s ease-in-out infinite;
                                transition: transform .5s ease, filter .4s ease;
                            "
                            @mouseenter="(e) => (e.target as HTMLElement).style.transform = 'scale(1.06) translateY(-8px)'"
                            @mouseleave="(e) => (e.target as HTMLElement).style.transform = ''"
                        />
                    </div>
                </div>

                <!-- Ornamento divisor inferior -->
                <div class="tc-premium-ornament" style="margin-top:32px;">
                    <span class="tc-gold-line"></span>
                    <span class="tc-gold-star font-display">✦</span>
                    <span class="tc-gold-line"></span>
                </div>

            </div>
        </div>

        <!-- ── CONTENIDO EDITORIAL ──────────────────────────── -->
        <section class="tc-privacy-content" style="position:relative;z-index:30;">
            <div class="tc-privacy-container">
                <div class="tc-privacy-sections">

                    <!-- I -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">I</span>
                            <h2 class="tc-privacy-section-title font-display">Identidad del Responsable</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                El presente aviso de privacidad está dirigido a los titulares de datos personales
                                que están en posesión de <strong>Tres Cantares</strong>, con domicilio en
                                <strong>Arq. Pablo González #1, La Santísima, Tepoztlán, Morelos, C.P. 62520</strong>,
                                en lo sucesivo referido como Tres Cantares.
                            </p>
                            <p class="tc-privacy-text font-body">
                                El presente aviso tiene como objetivo principal cumplir con lo establecido por la
                                <strong>Ley Federal de Protección de Datos Personales en Posesión de los
                                Particulares (LFPDPPP)</strong> y su Reglamento.
                            </p>
                        </div>
                    </div>

                    <!-- II -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">II</span>
                            <h2 class="tc-privacy-section-title font-display">Datos Personales que Recabamos</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Tres Cantares podrá recabar, utilizar y tratar los siguientes datos personales:
                            </p>
                            <ul class="tc-privacy-list font-body">
                                <li>Nombre completo</li>
                                <li>Número de teléfono o WhatsApp</li>
                                <li>Correo electrónico (cuando aplique)</li>
                                <li>Información de contacto proporcionada voluntariamente</li>
                                <li>Información proporcionada a través de formularios en línea o presenciales</li>
                                <li>Datos relacionados con solicitudes de empleo (incluyendo curriculum vitae)</li>
                                <li>Cualquier dato que el titular proporcione voluntariamente al comunicarse con Tres Cantares</li>
                            </ul>
                            <p class="tc-privacy-text font-body">
                                No se recaban ni se tratarán datos personales sensibles conforme a lo establecido
                                en la LFPDPPP.
                            </p>
                        </div>
                    </div>

                    <!-- III -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">III</span>
                            <h2 class="tc-privacy-section-title font-display">Finalidades del Tratamiento</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Tres Cantares solicita sus datos personales con el propósito de:
                            </p>
                            <ul class="tc-privacy-list font-body">
                                <li>Identificar clientes y usuarios que soliciten servicios</li>
                                <li>Atender solicitudes, consultas, comentarios y comunicaciones</li>
                                <li>Dar seguimiento a reservaciones y pedidos especiales</li>
                                <li>Gestionar solicitudes de empleo y contacto con candidatos</li>
                                <li>Proporcionar información sobre nuestros productos y servicios</li>
                                <li>Comunicación relacionada con los servicios contratados o solicitados</li>
                            </ul>
                        </div>
                    </div>

                    <!-- IV -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">IV</span>
                            <h2 class="tc-privacy-section-title font-display">Limitaciones en el Uso y Divulgación</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Los datos obtenidos se manejan mediante medios técnicos, administrativos y digitales
                                adecuados para salvaguardar su información.
                            </p>
                            <p class="tc-privacy-text font-body">
                                Tres Cantares podrá transferir los datos personales únicamente cuando sea necesario
                                para cumplir con obligaciones legales u operativas, o cuando exista consentimiento
                                expreso del titular, conforme a lo dispuesto por la LFPDPPP.
                            </p>
                        </div>
                    </div>

                    <!-- V -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">V</span>
                            <h2 class="tc-privacy-section-title font-display">Procedimientos Seguros para el Tratamiento</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Tres Cantares mantiene medidas de seguridad <strong>administrativas, técnicas y
                                digitales</strong> razonables para proteger la privacidad de los usuarios y prevenir
                                el daño, pérdida, alteración, destrucción o divulgación indebida de datos personales.
                            </p>
                            <p class="tc-privacy-text font-body">
                                El acceso a los datos personales está restringido al personal autorizado que los
                                requiera para cumplir con las finalidades descritas en este aviso.
                            </p>
                        </div>
                    </div>

                    <!-- VI -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">VI</span>
                            <h2 class="tc-privacy-section-title font-display">Política de Conservación y Eliminación</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Los datos personales se conservarán únicamente durante el tiempo necesario para
                                cumplir con las finalidades mencionadas en este aviso.
                            </p>
                            <p class="tc-privacy-text font-body">
                                El titular podrá solicitar la eliminación, rectificación o cancelación de sus datos
                                en cualquier momento, conforme a sus derechos ARCO.
                            </p>
                        </div>
                    </div>

                    <!-- VII -->
                    <div class="tc-privacy-section">
                        <div class="tc-privacy-section-header">
                            <span class="tc-privacy-section-num font-display">VII</span>
                            <h2 class="tc-privacy-section-title font-display">Derechos ARCO</h2>
                        </div>
                        <div class="tc-privacy-section-body">
                            <p class="tc-privacy-text font-body">
                                Usted tiene derecho a <strong>Acceder, Rectificar, Cancelar u Oponerse</strong> al
                                tratamiento de sus datos personales. Contáctenos a través de:
                            </p>
                            <ul class="tc-privacy-list font-body">
                                <li>WhatsApp / Teléfono: <strong>777 267 8443</strong></li>
                                <li>Visita presencial: <strong>Arq. Pablo González #1, La Santísima, Tepoztlán, Morelos, C.P. 62520</strong></li>
                            </ul>
                            <p class="tc-privacy-text font-body">
                                Le daremos respuesta en un plazo no mayor a 20 días hábiles a partir de la
                                recepción de su solicitud.
                            </p>
                        </div>
                    </div>

                    <!-- VIII + IX — par en 2 columnas -->
                    <div class="tc-privacy-pair">

                        <div class="tc-privacy-section">
                            <div class="tc-privacy-section-header">
                                <span class="tc-privacy-section-num font-display">VIII</span>
                                <h2 class="tc-privacy-section-title font-display">Transferencia de Datos</h2>
                            </div>
                            <div class="tc-privacy-section-body">
                                <p class="tc-privacy-text font-body">
                                    Sus datos personales no serán transferidos a terceros sin su consentimiento,
                                    salvo en los casos previstos por el artículo 37 de la LFPDPPP.
                                    Tres Cantares no vende ni renta datos personales a terceros.
                                </p>
                            </div>
                        </div>

                        <div class="tc-privacy-section">
                            <div class="tc-privacy-section-header">
                                <span class="tc-privacy-section-num font-display">IX</span>
                                <h2 class="tc-privacy-section-title font-display">Comunicación y Modificaciones</h2>
                            </div>
                            <div class="tc-privacy-section-body">
                                <p class="tc-privacy-text font-body">
                                    Tres Cantares se reserva el derecho de modificar el presente aviso en cualquier
                                    momento. Las modificaciones sustanciales se comunicarán a través de esta página.
                                    Le recomendamos revisarlo periódicamente.
                                </p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>

    </div>
</template>
