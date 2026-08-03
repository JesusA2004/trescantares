import { defineConfig } from 'vitest/config';

// Solo pruebas unitarias de funciones puras (conversión px<->%, interpolación
// de resolveElementConfig) — no requieren jsdom ni montar componentes Vue.
export default defineConfig({
    test: {
        environment: 'node',
        include: ['resources/js/**/*.spec.ts'],
    },
});
