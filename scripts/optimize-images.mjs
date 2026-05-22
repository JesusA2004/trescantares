/**
 * Tres Cantares — Image Optimizer
 * Genera versiones WebP optimizadas de las imágenes pesadas.
 * Ejecutar: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import { readFileSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const jobs = [
    // Textura de papel — tile de 800px, WebP ligero
    {
        input:  'resources/js/img/textures/paper-white.png',
        output: 'resources/js/img/textures/paper-white.webp',
        resize: { width: 800, withoutEnlargement: true },
        webp:   { quality: 82, lossless: false },
        note:   'Tile 400px × 2x — era 60 MB',
    },

    // Footer background
    {
        input:  'resources/js/img/footer/bg-footer.png',
        output: 'resources/js/img/footer/bg-footer.webp',
        resize: { width: 1920, withoutEnlargement: true },
        webp:   { quality: 80 },
        note:   'Footer bg — era 13.2 MB',
    },

    // Tacos — cruzan concepto/menú, 640px display
    {
        input:  'resources/js/img/food/taco-lef.png',
        output: 'resources/js/img/food/taco-lef.webp',
        resize: { width: 1280, withoutEnlargement: true },
        webp:   { quality: 82, lossless: false },
        note:   'Tacos decorativos — era 13.6 MB',
    },

    // Pozole — 580px display
    {
        input:  'resources/js/img/food/pozole-left.png',
        output: 'resources/js/img/food/pozole-left.webp',
        resize: { width: 1200, withoutEnlargement: true },
        webp:   { quality: 82, lossless: false },
        note:   'Pozole — era 8.6 MB',
    },

    // Cantarito main — 600px display
    {
        input:  'resources/js/img/food/cantarito-main.png',
        output: 'resources/js/img/food/cantarito-main.webp',
        resize: { width: 1200, withoutEnlargement: true },
        webp:   { quality: 82, lossless: false },
        note:   'Cantarito — era 7.9 MB',
    },

    // Menu dish right — 430px display
    {
        input:  'resources/js/img/food/menu-dish-right.png',
        output: 'resources/js/img/food/menu-dish-right.webp',
        resize: { width: 900, withoutEnlargement: true },
        webp:   { quality: 82, lossless: false },
        note:   'Tostada — era 7.2 MB',
    },

    // Lotería cards
    {
        input:  'resources/js/img/loteria/card-rose.png',
        output: 'resources/js/img/loteria/card-rose.webp',
        resize: { width: 600, withoutEnlargement: true },
        webp:   { quality: 84, lossless: false },
        note:   'Card Rose — era 6.7 MB',
    },
    {
        input:  'resources/js/img/loteria/card-cantarito.png',
        output: 'resources/js/img/loteria/card-cantarito.webp',
        resize: { width: 600, withoutEnlargement: true },
        webp:   { quality: 84, lossless: false },
        note:   'Card Cantarito — era 6.2 MB',
    },
    {
        input:  'resources/js/img/loteria/card-nopal.png',
        output: 'resources/js/img/loteria/card-nopal.webp',
        resize: { width: 700, withoutEnlargement: true },
        webp:   { quality: 84, lossless: false },
        note:   'Card Nopal — era 5.2 MB',
    },
    {
        input:  'resources/js/img/loteria/card-borracho.png',
        output: 'resources/js/img/loteria/card-borracho.webp',
        resize: { width: 520, withoutEnlargement: true },
        webp:   { quality: 84, lossless: false },
        note:   'Card Borracho — era 4.8 MB',
    },

    // Limon — 128px display
    {
        input:  'resources/js/img/food/limon-left.png',
        output: 'resources/js/img/food/limon-left.webp',
        resize: { width: 300, withoutEnlargement: true },
        webp:   { quality: 84 },
        note:   'Limón pequeño',
    },
];

let totalOriginal = 0;
let totalOptimized = 0;

for (const job of jobs) {
    const inputPath  = path.join(root, job.input);
    const outputPath = path.join(root, job.output);

    if (!existsSync(inputPath)) {
        console.warn(`⚠  No encontrado: ${job.input}`);
        continue;
    }

    const originalSize = statSync(inputPath).size;
    totalOriginal += originalSize;

    try {
        const metadata = await sharp(inputPath).metadata();
        console.log(`\n📷 ${path.basename(job.input)}`);
        console.log(`   Dimensiones originales: ${metadata.width}×${metadata.height} px`);
        console.log(`   Tamaño original: ${(originalSize / 1024 / 1024).toFixed(1)} MB  (${job.note})`);

        let pipeline = sharp(inputPath);
        if (job.resize) {
            pipeline = pipeline.resize(job.resize);
        }
        await pipeline.webp(job.webp).toFile(outputPath);

        const newSize = statSync(outputPath).size;
        totalOptimized += newSize;
        const reduction = ((1 - newSize / originalSize) * 100).toFixed(0);
        console.log(`   ✅ Guardado: ${path.basename(job.output)}`);
        console.log(`   Tamaño nuevo: ${(newSize / 1024).toFixed(0)} KB  (${reduction}% reducción)`);
    } catch (err) {
        console.error(`   ❌ Error procesando ${job.input}:`, err.message);
    }
}

console.log('\n══════════════════════════════════════════');
console.log(`Total original:   ${(totalOriginal  / 1024 / 1024).toFixed(1)} MB`);
console.log(`Total optimizado: ${(totalOptimized / 1024 / 1024).toFixed(1)} MB`);
console.log(`Reducción total:  ${((1 - totalOptimized / totalOriginal) * 100).toFixed(0)}%`);
console.log('══════════════════════════════════════════\n');
console.log('✅ Ahora actualiza resources/js/lib/tres-cantares-assets.ts');
console.log('   para importar los .webp en lugar de los .png\n');
