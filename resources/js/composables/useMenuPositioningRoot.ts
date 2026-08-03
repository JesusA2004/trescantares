import { onBeforeUnmount, ref, watch, type Ref } from 'vue';

/**
 * Resuelve el "positioning root" (ancho real de .tc-mp-content-layer) y la
 * capa de Teleport (.tc-mp-customized-layer) de la sección de categoría que
 * contiene un elemento dado — ambas son hermanas directas de la misma
 * <section id="cat-…">, así que comparten exactamente el mismo origen y
 * ancho (mismo truco que ya usa .tc-mp-decoration-layer, ver app.css).
 *
 * Deliberadamente NO usa provide/inject a través de cada *Page.vue: resolver
 * la sección ancestro vía closest('[id^="cat-"]') sobre el elemento ya
 * montado evita tener que tocar los ~12 componentes de layout solo para
 * reenviar un id de categoría, sin perder la propiedad importante (un único
 * ResizeObserver por SECCIÓN, no uno por elemento) — ver el registro
 * compartido más abajo.
 */

interface RootEntry {
    width: Ref<number>;
    observer: ResizeObserver;
    refCount: number;
}

const rootRegistry = new WeakMap<Element, RootEntry>();

function subscribe(root: HTMLElement): RootEntry {
    let entry = rootRegistry.get(root);

    if (!entry) {
        const width = ref(root.getBoundingClientRect().width);
        const observer = new ResizeObserver((entries) => {
            const first = entries[0];

            if (first) {
                width.value = first.contentRect.width;
            }
        });
        observer.observe(root);
        entry = { width, observer, refCount: 0 };
        rootRegistry.set(root, entry);
    }

    entry.refCount += 1;

    return entry;
}

function unsubscribe(root: HTMLElement, entry: RootEntry) {
    entry.refCount -= 1;

    if (entry.refCount <= 0) {
        entry.observer.disconnect();
        rootRegistry.delete(root);
    }
}

function sectionOf(el: HTMLElement | null): HTMLElement | null {
    return el?.closest<HTMLElement>('[id^="cat-"]') ?? null;
}

function contentLayerOf(el: HTMLElement | null): HTMLElement | null {
    const section = sectionOf(el);

    return (
        section?.querySelector<HTMLElement>('.tc-mp-content-layer') ?? section
    );
}

export function usePositioningRoot() {
    // SSR-safe: 0 en el servidor (nunca se usa para renderizar ahí — el
    // modo normalized siempre se decide/mide en el cliente, después del
    // primer commit interactivo) y se corrige en cuanto attach() mide el DOM
    // real en el cliente.
    const width = ref(0);
    let currentRoot: HTMLElement | null = null;
    let currentEntry: RootEntry | null = null;
    let stopWatch: (() => void) | null = null;

    function detach() {
        if (currentRoot && currentEntry) {
            unsubscribe(currentRoot, currentEntry);
        }

        stopWatch?.();
        currentRoot = null;
        currentEntry = null;
        stopWatch = null;
    }

    /** Debe llamarse con el elemento raíz ya montado (p. ej. en onMounted o
     * en un watcher del template ref) — closest() no encuentra nada antes de
     * que el nodo esté insertado en el documento. */
    function attach(el: HTMLElement | null) {
        detach();

        const root = contentLayerOf(el);

        if (!root) {
            return;
        }

        currentRoot = root;
        currentEntry = subscribe(root);
        width.value = currentEntry.width.value;
        stopWatch = watch(currentEntry.width, (w) => {
            width.value = w;
        });
    }

    /** Rect real ACTUAL del root — usado únicamente en el instante de un
     * commit (conversión V1->V2 sin salto, ver upgradeV1ToV2), nunca
     * reactivo: measuredRectToNormalized necesita el rect exacto de ESE
     * frame, no un valor que pueda quedar desfasado un tick. */
    function measureRootRect(el: HTMLElement | null): DOMRect | null {
        return contentLayerOf(el)?.getBoundingClientRect() ?? null;
    }

    function customizedLayerFor(el: HTMLElement | null): HTMLElement | null {
        return (
            sectionOf(el)?.querySelector<HTMLElement>(
                '.tc-mp-customized-layer',
            ) ?? null
        );
    }

    onBeforeUnmount(detach);

    return { width, attach, detach, measureRootRect, customizedLayerFor };
}
