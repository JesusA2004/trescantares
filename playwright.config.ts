import { defineConfig, devices } from '@playwright/test';

/**
 * Servidor apuntando a una base de datos SQLite aislada (ver
 * tests-e2e/menu-editor-wysiwyg.spec.ts) — Playwright NO arranca este
 * servidor (webServer) a propósito: requiere una base de datos ya migrada y
 * sembrada por separado, así que se levanta manualmente antes de correr
 * `npx playwright test`.
 */
export default defineConfig({
    testDir: './tests-e2e',
    fullyParallel: false,
    workers: 1,
    retries: 0,
    reporter: [['list']],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:8010',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
