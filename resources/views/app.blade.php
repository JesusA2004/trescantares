<!DOCTYPE html>
<html lang="es" data-appearance="{{ $appearance ?? 'system' }}" class="{{ ($appearance ?? 'system') === 'dark' ? 'dark' : '' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Apariencia: localStorage es fuente de verdad en cliente; cookie PHP es fallback --}}
    <script>
        (function() {
            try {
                var local = localStorage.getItem('appearance');
                var server = '{{ $appearance ?? "system" }}';
                var a = local || server || 'system';
                if (a !== 'light' && a !== 'dark' && a !== 'system') a = 'system';
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var shouldBeDark = (a === 'dark') || (a === 'system' && prefersDark);
                document.documentElement.classList.toggle('dark', shouldBeDark);
                document.documentElement.setAttribute('data-appearance', a);
            } catch(e) {}
        })();
    </script>

    {{-- Fondo base para evitar flash --}}
    <style>
        html { background-color: #F4F4F5; }
        html.dark { background-color: #151515; }
    </style>

    {{-- Favicons --}}
    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="shortcut icon" href="/favicon.ico">

    {{-- SEO base --}}
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#144E8F">
    <meta name="author" content="Tres Cantares">

    {{-- Open Graph (defaults; cada página los sobreescribe via Inertia Head) --}}
    <meta property="og:site_name" content="Tres Cantares">
    <meta property="og:locale" content="es_MX">
    <meta property="og:type" content="website">
    <meta property="og:image" content="{{ config('app.url') }}/img/logo-tres-cantares.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Tres Cantares — Restaurante Mexicano en Tepoztlán, Morelos">

    {{-- Twitter Card (defaults) --}}
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{{ config('app.url') }}/img/logo-tres-cantares.png">
    <meta name="twitter:image:alt" content="Tres Cantares — Restaurante Mexicano en Tepoztlán, Morelos">

    {{--
        JSON-LD — Schema.org Restaurant / LocalBusiness
        NOTA: @@ escapa la arroba para que Blade no lo interprete como directiva.
        En el HTML final se renderiza como @ (correcto para JSON-LD).
    --}}
    <script type="application/ld+json">
    {
        "@@context": "https://schema.org",
        "@@type": ["Restaurant", "FoodEstablishment", "LocalBusiness"],
        "name": "Tres Cantares",
        "alternateName": "Restaurante Tres Cantares",
        "description": "Restaurante mexicano en Tepoztlán, Morelos. Sabores auténticos de México en un espacio cálido y moderno con buena música y los mejores momentos para compartir.",
        "url": "{{ config('app.url') }}",
        "logo": "{{ config('app.url') }}/img/logo-tres-cantares.png",
        "image": "{{ config('app.url') }}/img/logo-tres-cantares.png",
        "telephone": "+52 777 153 1475",
        "address": {
            "@@type": "PostalAddress",
            "streetAddress": "Pino González 1, La Santísima",
            "addressLocality": "Tepoztlán",
            "addressRegion": "Morelos",
            "postalCode": "62520",
            "addressCountry": "MX"
        },
        "geo": {
            "@@type": "GeoCoordinates",
            "latitude": 18.9843,
            "longitude": -99.1009
        },
        "openingHoursSpecification": [
            {
                "@@type": "OpeningHoursSpecification",
                "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],
                "opens": "08:00",
                "closes": "22:00"
            }
        ],
        "servesCuisine": ["Comida Mexicana", "Gastronomía Mexicana Tradicional"],
        "priceRange": "$$",
        "areaServed": {
            "@@type": "Place",
            "name": "Tepoztlán, Morelos, México"
        },
        "hasMap": "https://www.google.com/maps/search/Tres+Cantares+Tepoztlan+Morelos",
        "sameAs": []
    }
    </script>

    {{-- Preconnect fuentes --}}
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    @vite(['resources/css/app.css', 'resources/js/app.ts', "resources/js/pages/{$page['component']}.vue"])
    <x-inertia::head>
        <title>Tres Cantares | Restaurante Mexicano en Tepoztlán</title>
    </x-inertia::head>
</head>
<body class="font-sans antialiased">
    <x-inertia::app />
</body>
</html>
