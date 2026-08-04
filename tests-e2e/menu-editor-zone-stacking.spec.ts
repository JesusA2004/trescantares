import { test, expect, type Page, type FrameLocator } from '@playwright/test';

/**
 * Receta E2E exacta pedida por el usuario: entra a una sección, agrega un
 * platillo nuevo en una zona que YA tiene otro, verifica que aparezcan los
 * dos (lista izquierda + lienzo), lo mueve, guarda, recarga, abre /menu y
 * confirma que ambos siguen visibles. Cubre la causa raíz real: 'zone' no es
 * una relación 1:1 (ver PozolePage.vue — 'main' ya no toma solo el primer
 * platillo con [0]) y crear un platillo ya no revienta con un 500 genérico
 * por colisión de slug (ver MenuItemController::rules()).
 *
 * La verificación de "sigue ahí" usa `[data-element-key="item-{id}:container"]`
 * — la clave real que MenuEditableElement pone en el DOM, basada en el ID del
 * platillo — en vez de buscar el NOMBRE como texto visible: la plantilla de
 * Pozole no siempre imprime `item.name` como texto (el platillo 'main' solo
 * muestra su foto/precio/etiqueta de elección), así que confiar en texto
 * visible daría falsos negativos ajenos al bug real que se está probando.
 *
 * Requiere el mismo entorno E2E aislado que menu-editor-wysiwyg.spec.ts
 * (SQLite aparte + `menu:import-initial` + usuario e2e-admin, servidor
 * manual en E2E_BASE_URL). La categoría "Pozole" (layout `pozole`) ya trae
 * "Pozole Blanco" sembrado en zone='main' — ese es el "otro platillo" que ya
 * ocupa la zona.
 */

const ADMIN_EMAIL = 'e2e-admin@test.local';
const ADMIN_PASSWORD = 'password';

async function login(page: Page) {
    await page.goto('/login');
    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('[data-test="login-button"]');
    await page.waitForURL(/dashboard/);
}

function editorFrame(page: Page): FrameLocator {
    return page.frameLocator('iframe[title="Vista previa editable del menú"]');
}

async function openEditor(page: Page): Promise<FrameLocator> {
    await page.goto('/admin/menu-editor');
    await expect(page.locator('.tc-editor-toolbar')).toBeVisible();

    const frame = editorFrame(page);
    await frame.locator('[data-element-key]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(600);

    return frame;
}

/** Todas las claves `item-{id}:container` presentes AHORA MISMO en el
 * lienzo — el universo completo de platillos renderizados, sin importar su
 * zona/categoría. */
async function itemContainerKeys(frame: FrameLocator): Promise<string[]> {
    return frame
        .locator('[data-element-key$=":container"][data-element-key^="item-"]')
        .evaluateAll((els) => els.map((el) => el.getAttribute('data-element-key') as string));
}

test.describe('editor: agregar platillo a una zona ya ocupada', () => {
    test('los dos platillos coexisten en la lista, el lienzo, tras recargar, y en /menu — ninguno desaparece ni se reemplaza', async ({ page }) => {
        test.setTimeout(90000);

        // 1. Entra a la sección (Pozole ya trae "Pozole Blanco" en zone=main).
        await login(page);
        let frame = await openEditor(page);
        await page.locator('.tc-section-btn', { hasText: 'Pozole' }).click();
        await page.waitForTimeout(300);

        const sidebar = page.locator('aside.tc-editor-sidebar');
        await expect(
            sidebar.locator('li[data-drag-row]').filter({ hasText: 'Pozole Blanco' }),
        ).toBeVisible();

        const initialRows = sidebar.locator('li[data-drag-row]');
        const initialCount = await initialRows.count();
        const beforeKeys = await itemContainerKeys(frame);
        expect(beforeKeys.length).toBeGreaterThan(0);

        // 2. Agrega un platillo nuevo EN LA MISMA ZONA (main) que ya ocupa
        // "Pozole Blanco" — exactamente el caso que antes ocultaba al que ya
        // estaba. Captura el ID real devuelto por el backend desde la
        // respuesta de la petición, no lo adivina.
        const newName = `Pozole Verde E2E ${Date.now()}`;
        await page.getByRole('button', { name: 'Agregar platillo' }).click();
        await expect(page.getByText('Agregar platillo')).toBeVisible();

        await page.fill('#add-item-name', newName);
        await page.fill('#add-item-price', '140');
        await page.selectOption('#add-item-zone', { label: 'Principal' });

        const [response] = await Promise.all([
            page.waitForResponse(
                (res) => res.url().includes('/admin/menu-editor/items') && res.request().method() === 'POST',
            ),
            page.getByRole('button', { name: 'Crear platillo' }).click(),
        ]);
        expect(response.status()).toBe(201);
        const created = (await response.json()) as { item: { id: number } };
        const newKey = `item-${created.item.id}:container`;

        // El modal se cierra solo (sin recargar la página completa).
        await expect(page.getByText('Agregar platillo')).not.toBeVisible({ timeout: 10000 });

        // 3. Verifica que aparezcan LOS DOS en la lista izquierda.
        await expect(
            sidebar.locator('li[data-drag-row]').filter({ hasText: 'Pozole Blanco' }),
        ).toBeVisible();
        await expect(
            sidebar.locator('li[data-drag-row]').filter({ hasText: newName }),
        ).toBeVisible();
        await expect(initialRows).toHaveCount(initialCount + 1);

        // ...y los dos en el lienzo (iframe): el nuevo aparece, y NINGUNO de
        // los que ya estaban desaparece — claves basadas en ID, ningún nodo
        // reemplazado/reutilizado.
        frame = editorFrame(page);
        await frame.locator(`[data-element-key="${newKey}"]`).waitFor({ state: 'visible', timeout: 10000 });
        const afterCreateKeys = await itemContainerKeys(frame);
        expect(afterCreateKeys).toContain(newKey);
        for (const key of beforeKeys) {
            expect(afterCreateKeys, `${key} debía seguir presente`).toContain(key);
        }
        expect(afterCreateKeys.length).toBe(beforeKeys.length + 1);

        // 4. Muévelo — el platillo nuevo queda auto-seleccionado al crearse
        // (ver onItemCreated en Index.vue), así que el nudge de teclado
        // actúa sobre ÉL, no sobre "Pozole Blanco".
        const newContainer = frame.locator(`[data-element-key="${newKey}"]`);
        await expect(frame.locator('.tc-mev--selected').first()).toHaveAttribute('data-element-key', newKey);
        const before = await newContainer.boundingBox();
        expect(before).not.toBeNull();

        const selected = frame.locator('.tc-mev--selected').first();
        await selected.focus();
        for (let i = 0; i < 8; i++) {
            await selected.press('Shift+ArrowRight');
        }
        await page.waitForTimeout(600); // deja que el autosave/commit termine

        const after = await newContainer.boundingBox();
        expect(after).not.toBeNull();
        expect(after!.x, 'el platillo nuevo se movió a la derecha').toBeGreaterThan(before!.x);

        // 5. Guarda ya ocurrió (autosave) — recarga el editor.
        frame = await openEditor(page);
        await page.locator('.tc-section-btn', { hasText: 'Pozole' }).click();
        await page.waitForTimeout(300);

        await expect(
            sidebar.locator('li[data-drag-row]').filter({ hasText: 'Pozole Blanco' }),
        ).toBeVisible();
        await expect(
            sidebar.locator('li[data-drag-row]').filter({ hasText: newName }),
        ).toBeVisible();

        frame = editorFrame(page);
        const afterReloadKeys = await itemContainerKeys(frame);
        expect(afterReloadKeys).toContain(newKey);
        for (const key of beforeKeys) {
            expect(afterReloadKeys, `${key} debía seguir presente tras recargar`).toContain(key);
        }

        // La posición movida persiste tras F5.
        const reloadedBox = await frame.locator(`[data-element-key="${newKey}"]`).boundingBox();
        expect(reloadedBox).not.toBeNull();
        expect(reloadedBox!.x).toBeGreaterThan(before!.x);

        // 6. Abre /menu — ambos siguen visibles (nunca se reemplazaron ni
        // desactivaron el uno al otro).
        await page.goto('/menu');
        await page.locator(`[data-element-key="${newKey}"]`).waitFor({ state: 'visible', timeout: 10000 });
        for (const key of beforeKeys) {
            await expect(page.locator(`[data-element-key="${key}"]`).first()).toBeVisible();
        }
        await expect(page.locator(`[data-element-key="${newKey}"]`).first()).toBeVisible();
    });
});
