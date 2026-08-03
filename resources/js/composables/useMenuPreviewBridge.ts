import { onMounted, onUnmounted } from 'vue';
import type {
    StoredElementConfig,
    MenuDevice,
} from '@/components/Public/Menu/types';

/**
 * Protocolo postMessage entre /admin/menu-editor (padre) y el iframe que
 * carga /admin/menu-editor/preview (el MISMO Public/Menu.vue del sitio
 * real, con editable=true). El arrastre/resize ocurre siempre DENTRO del
 * documento del iframe (nunca hay que dividir por ningún factor de escala);
 * este puente solo sincroniza selección, ediciones del inspector —incluidas
 * las que afectan a un breakpoint DISTINTO al que el iframe muestra ahora
 * (copiar/restaurar todos los breakpoints)— y mediciones de geometría real
 * (para centrar) que solo el documento del iframe puede tomar.
 */
export interface RectData {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface PreviewToEditorMessage {
    source: 'tc-menu-preview';
    type: 'ready' | 'select' | 'commit' | 'deselect' | 'rect';
    elementKey?: string;
    label?: string;
    config?: StoredElementConfig;
    breakpoint?: MenuDevice;
    requestId?: string;
    rect?: { element: RectData; parent: RectData } | null;
}

export interface EditorToPreviewMessage {
    source: 'tc-menu-editor';
    type:
        | 'selectElement'
        | 'updateConfig'
        | 'clearElement'
        | 'scrollToCategory'
        | 'requestRect';
    elementKey?: string;
    config?: StoredElementConfig;
    breakpoint?: MenuDevice;
    categoryId?: number | null;
    requestId?: string;
}

function targetOrigin(): string {
    return typeof window === 'undefined' ? '*' : window.location.origin;
}

/** Lado hijo (dentro del iframe = Public/Menu.vue en modo editable). */
export function useMenuPreviewChild(handlers: {
    onSelectElement?: (key: string) => void;
    onUpdateConfig?: (
        key: string,
        config: StoredElementConfig,
        breakpoint?: MenuDevice,
    ) => void;
    onClearElement?: (key: string, breakpoint?: MenuDevice) => void;
    onScrollToCategory?: (categoryId: number | null) => void;
    onRequestRect?: (elementKey: string, requestId: string) => void;
}) {
    function post(msg: Omit<PreviewToEditorMessage, 'source'>) {
        if (typeof window !== 'undefined' && window.parent !== window) {
            window.parent.postMessage(
                {
                    source: 'tc-menu-preview',
                    ...msg,
                } satisfies PreviewToEditorMessage,
                targetOrigin(),
            );
        }
    }

    function onMessage(e: MessageEvent) {
        if (e.origin !== targetOrigin()) {
            return;
        }

        const data = e.data as EditorToPreviewMessage | undefined;

        if (!data || data.source !== 'tc-menu-editor') {
            return;
        }

        if (data.type === 'selectElement' && data.elementKey) {
            handlers.onSelectElement?.(data.elementKey);
        }

        if (data.type === 'updateConfig' && data.elementKey && data.config) {
            handlers.onUpdateConfig?.(
                data.elementKey,
                data.config,
                data.breakpoint,
            );
        }

        if (data.type === 'clearElement' && data.elementKey) {
            handlers.onClearElement?.(data.elementKey, data.breakpoint);
        }

        if (data.type === 'scrollToCategory') {
            handlers.onScrollToCategory?.(data.categoryId ?? null);
        }

        if (data.type === 'requestRect' && data.elementKey && data.requestId) {
            handlers.onRequestRect?.(data.elementKey, data.requestId);
        }
    }

    onMounted(() => {
        window.addEventListener('message', onMessage);
        post({ type: 'ready' });
    });

    onUnmounted(() => {
        window.removeEventListener('message', onMessage);
    });

    return { post };
}

/** Lado padre (la página /admin/menu-editor controlando el iframe). */
export function useMenuPreviewParent(
    iframe: () => HTMLIFrameElement | null | undefined,
    handlers: {
        onReady?: () => void;
        onSelect?: (key: string, label: string, config: StoredElementConfig) => void;
        onCommit?: (key: string, config: StoredElementConfig) => void;
        onDeselect?: () => void;
    },
) {
    const pendingRects = new Map<
        string,
        { resolve: (r: { element: RectData; parent: RectData } | null) => void }
    >();

    function post(msg: Omit<EditorToPreviewMessage, 'source'>) {
        const win = iframe()?.contentWindow;

        if (win) {
            win.postMessage(
                {
                    source: 'tc-menu-editor',
                    ...msg,
                } satisfies EditorToPreviewMessage,
                targetOrigin(),
            );
        }
    }

    function onMessage(e: MessageEvent) {
        if (e.origin !== targetOrigin()) {
            return;
        }

        const data = e.data as PreviewToEditorMessage | undefined;

        if (!data || data.source !== 'tc-menu-preview') {
            return;
        }

        if (data.type === 'ready') {
            handlers.onReady?.();
        }

        if (data.type === 'select' && data.elementKey && data.config) {
            handlers.onSelect?.(
                data.elementKey,
                data.label ?? data.elementKey,
                data.config,
            );
        }

        if (data.type === 'commit' && data.elementKey && data.config) {
            handlers.onCommit?.(data.elementKey, data.config);
        }

        if (data.type === 'deselect') {
            handlers.onDeselect?.();
        }

        if (data.type === 'rect' && data.requestId) {
            const pending = pendingRects.get(data.requestId);

            if (pending) {
                pendingRects.delete(data.requestId);
                pending.resolve(data.rect ?? null);
            }
        }
    }

    onMounted(() => {
        window.addEventListener('message', onMessage);
    });

    onUnmounted(() => {
        window.removeEventListener('message', onMessage);
    });

    function requestRect(
        key: string,
    ): Promise<{ element: RectData; parent: RectData } | null> {
        const requestId = `rect-${Date.now()}-${Math.random().toString(36).slice(2)}`;

        return new Promise((resolve) => {
            pendingRects.set(requestId, { resolve });
            post({ type: 'requestRect', elementKey: key, requestId });

            setTimeout(() => {
                if (pendingRects.has(requestId)) {
                    pendingRects.delete(requestId);
                    resolve(null);
                }
            }, 800);
        });
    }

    return {
        selectElement: (key: string) =>
            post({ type: 'selectElement', elementKey: key }),
        updateConfig: (
            key: string,
            config: StoredElementConfig,
            breakpoint?: MenuDevice,
        ) =>
            post({ type: 'updateConfig', elementKey: key, config, breakpoint }),
        clearElement: (key: string, breakpoint?: MenuDevice) =>
            post({ type: 'clearElement', elementKey: key, breakpoint }),
        scrollToCategory: (categoryId: number | null) =>
            post({ type: 'scrollToCategory', categoryId }),
        requestRect,
    };
}
