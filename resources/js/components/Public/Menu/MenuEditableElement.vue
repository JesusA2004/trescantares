<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch } from 'vue';
import { usePositioningRoot } from '@/composables/useMenuPositioningRoot';
import {
    defaultElementConfig,
    isV2Config,
    pctToPx,
    pxToPct,
    upgradeV1ToV2,
} from './types';
import type {
    ElementConfig,
    ElementConfigV2,
    ElementPositionMode,
    StoredElementConfig,
} from './types';

const props = withDefaults(
    defineProps<{
        elementKey: string;
        label?: string;
        config?: StoredElementConfig;
        editable?: boolean;
        selected?: boolean;
        /** 'image' hace que este componente renderice el <img> internamente
         * (ver `src`) en vez de esperar contenido por slot, para poder
         * aplicarle fit/object-position/inner_scale y el llenado 100% del
         * bloque cuando se personaliza el tamaño — ver imageStyle. */
        kind?: 'container' | 'image' | 'text';
        /** Solo se usa cuando kind === 'image'. Sin src, se usa el slot
         * normal (compatibilidad con MenuItemVisual/MenuTextVisual, que
         * manejan su propio <img>/<component> por slot). */
        src?: string | null;
        alt?: string;
        /** Clase(s) del <img> por defecto (antes de personalizar tamaño) —
         * son las que traen el tope de max-width/proporción responsiva
         * original (tc-mp-title-img, tc-mp-subtitle-img, etc.). */
        imgClass?: string;
        /** true SOLO para adornos de sección (flores, curvas, texturas…) —
         * SIEMPRE position:absolute (ver `style`), nunca dependieron del
         * flujo de flex/grid (a diferencia de items/categorías) porque ya
         * viven en .tc-mp-decoration-layer (position:absolute+inset:0 sobre
         * el mismo origen que .tc-mp-content-layer/.tc-mp-customized-layer)
         * — por eso NUNCA se Teleportan (ver shouldTeleport): ya están en el
         * lugar correcto, solo cambian su matemática de posición (px -> %
         * cuando se personalizan, igual que cualquier otro elemento). */
        decoration?: boolean;
    }>(),
    {
        label: '',
        config: () => defaultElementConfig(),
        editable: false,
        selected: false,
        kind: 'container',
        src: null,
        alt: '',
        imgClass: '',
        decoration: false,
    },
);

const emit = defineEmits<{
    select: [elementKey: string];
    commit: [elementKey: string, config: StoredElementConfig];
}>();

const root = useTemplateRef<HTMLDivElement>('root');
const locked = computed(() => !!props.config.locked);
const interactive = computed(() => props.editable && !locked.value);

const isV2 = computed(() => isV2Config(props.config));
const isNormalized = computed(
    () =>
        isV2.value &&
        (props.config as ElementConfigV2).position_mode === 'normalized',
);

// ---------------------------------------------------------------------
// Positioning root: ancho real de .tc-mp-content-layer de la sección que
// contiene este elemento (ver useMenuPositioningRoot) — TODA la matemática
// de porcentajes (medir, convertir, arrastrar, renderizar) se hace contra
// este ancho, nunca contra window.innerWidth/el iframe/la barra lateral del
// admin/el zoom del editor.
// ---------------------------------------------------------------------
const positioningRoot = usePositioningRoot();
const teleportTarget = ref<HTMLElement | null>(null);

onMounted(() => {
    positioningRoot.attach(root.value);
    teleportTarget.value = positioningRoot.customizedLayerFor(root.value);
});


// Arranca en false a propósito, incluso si el config YA es 'normalized' al
// montar: el destino de Teleport solo puede resolverse una vez el nodo está
// en el DOM (closest() necesita un padre real) — el primer tick renderiza en
// su lugar natural (donde igual calcula left/top correctos: no hay ningún
// ancestro `position` intermedio entre un elemento de item/categoría y
// .tc-mp-content-layer en el CSS actual, así que el contenedor de referencia
// es el MISMO antes y después de Teleportar) y el siguiente tick ya mueve el
// nodo a su capa definitiva — mismo patrón de "corrección tras montar" que
// useViewportWidth ya usa para el ancho de viewport tras la hidratación SSR.
const shouldTeleport = computed(
    () => !props.decoration && isNormalized.value && !!teleportTarget.value,
);

/**
 * Hueco reservado en el lugar de flujo original — SOLO mientras dura la
 * sesión en la que el propio usuario saca un elemento del flujo a mano
 * (arrastre real vía startDrag, o nudge con flechas). Bug real reportado:
 * al arrastrar el TÍTULO de Bebidas, Teleport lo sacaba del árbol de
 * `.tc-mp-frame-inner` hacia `.tc-mp-customized-layer` sin dejar nada en su
 * lugar — el contenido de abajo (tabla de bebidas) subía para llenar el
 * hueco, y el punto bajo el cursor se corría en cada frame del propio
 * arrastre.
 *
 * Regresión real encontrada en el primer intento de este fix: capturar el
 * tamaño en un watcher genérico sobre `shouldTeleport` (cualquier transición
 * flujo->normalizado) también disparaba para CUALQUIER elemento que YA
 * cargaba con `position_mode:'normalized'` desde la base de datos — el
 * "primer tick en flujo" antes de resolver `teleportTarget` (ver comentario
 * de shouldTeleport) nunca lo pinta el navegador (mounted corre antes del
 * primer paint), así que no hay ningún hueco real que preservar ahí; pero el
 * watcher igual reservaba ese espacio "fantasma" para SIEMPRE. En secciones
 * con muchos elementos ya personalizados (Pancita, Birria…) esos huecos
 * fantasma se acumulaban y agrandaban el alto natural de toda la sección —
 * el fondo/marco crecía de más y el selector de alto manual ya no podía
 * bajar de ese mínimo inflado. Por eso `flowPlaceholderSize` ahora SOLO se
 * fija explícitamente desde startDrag/nudge (nunca desde un watcher pasivo)
 * — el único momento real en que un elemento visible en flujo, en ESTA
 * sesión, está a punto de dejar de estarlo.
 */
const flowPlaceholderSize = ref<{ width: number; height: number } | null>(
    null,
);

/** Llamar SOLO justo antes de commitear `position_mode:'normalized'` desde
 * un gesto real (startDrag/nudge) — si el elemento YA estaba normalizado no
 * hace nada (ya está fuera de flujo, no hay hueco nuevo que reservar). */
function captureFlowPlaceholderBeforeLeavingFlow() {
    if (!isNormalized.value && root.value) {
        const rect = root.value.getBoundingClientRect();
        flowPlaceholderSize.value = { width: rect.width, height: rect.height };
    }
}

watch(isNormalized, (normalized) => {
    if (!normalized) {
        flowPlaceholderSize.value = null;
    }
});

/** Máquina de estados de gestos — decidida UNA SOLA VEZ en pointerdown y
 * jamás reasignada a otro tipo después (ver startDrag/startResize):
 * 'pending-move' (recién presionado, aún no se sabe si el toque es un
 * simple clic/selección o un arrastre real) solo puede promoverse a 'move'
 * al superar el umbral de desplazamiento (ver MOVE_THRESHOLD_*) — nunca a
 * 'resize'. 'resize' se decide exclusivamente al presionar la manija (ver
 * startResize) y jamás toca x_pct/y_pct. */
type GestureKind = 'pending-move' | 'move' | 'resize' | 'rotate';

// Delta en curso (px REALES del documento — este componente siempre vive
// dentro del documento del iframe de vista previa, que nunca tiene un
// transform:scale aplicado a sí mismo, así que getBoundingClientRect() y
// clientX/clientY están siempre en el mismo sistema de coordenadas sin
// necesidad de dividir por ningún "scaleFactor" externo). `pointerId` filtra
// eventos de OTROS punteros (multi-touch) que lleguen a los listeners
// globales de document mientras este gesto está en curso.
const gesture = ref<{
    kind: GestureKind;
    pointerId: number;
    dx: number;
    dy: number;
} | null>(null);

// Umbral de desplazamiento para promover 'pending-move' -> 'move' — más alto
// en touch que en ratón porque un dedo se mueve más al posarse que un
// puntero fino; por debajo del umbral, soltar el puntero SOLO selecciona
// (ver startDrag/finish) sin emitir ningún commit de posición.
const MOVE_THRESHOLD_MOUSE = 4;
const MOVE_THRESHOLD_TOUCH = 8;

function moveThresholdFor(pointerType: string): number {
    return pointerType === 'touch' ? MOVE_THRESHOLD_TOUCH : MOVE_THRESHOLD_MOUSE;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function clampPct(value: number): number {
    return clamp(value, -500, 500);
}

// ---------------------------------------------------------------------
// Geometría en modo NO normalizado (V1 clásico en cualquier ancho, o V2 con
// position_mode:'flow' — recién creado o nunca movido de su lugar): x/y
// siempre son 0 en 'flow' (todavía no hay desplazamiento manual que
// aplicar), el resto es BYTE A BYTE el comportamiento histórico
// (translate(x px, y px) sobre position:relative, o position:absolute solo
// para adornos).
// ---------------------------------------------------------------------
const legacyX = computed(() =>
    isV2.value ? 0 : (props.config as ElementConfig).x,
);
const legacyY = computed(() =>
    isV2.value ? 0 : (props.config as ElementConfig).y,
);
const legacyWidth = computed(() =>
    isV2.value ? null : (props.config as ElementConfig).width,
);
const legacyHeight = computed(() =>
    isV2.value ? null : (props.config as ElementConfig).height,
);

// Con ancho personalizado, la imagen interna debe LLENAR ese ancho (ver
// imageStyle) — si no, rótulos como tc-mp-title-img (max-width:92%, sin
// width propio) se quedan en su tamaño intrínseco y arrastrar la manija de
// resize no mueve nada visualmente. También se activa durante un resize en
// curso (gesture), aunque el config aún no tenga tamaño propio, para que el
// PRIMER resize de un elemento aún no personalizado ya se vea en vivo
// mientras se arrastra, no solo al soltar.
//
// Rama V1-vs-V2 decidida por `isV2` (¿el formato guardado es %?), NUNCA por
// `isNormalized` (¿además se sacó del flujo con position:absolute?) — son
// ejes independientes: un resize PURO (nunca movido) guarda width_pct/
// height_pct en formato V2 pero deja position_mode:'flow' a propósito (ver
// startResize/finish más abajo, comentario "Un resize puro NO fuerza
// position:absolute"). Bug real encontrado y corregido: al condicionar esto
// por `isNormalized` en vez de `isV2`, un elemento V2 solo-redimensionado
// (jamás movido) caía SIEMPRE a la rama legacy — `legacyWidth`/`legacyHeight`
// devuelven `null` para CUALQUIER config V2 (ver definición arriba) — así
// que `hasCustomWidth` daba `false` aunque `width_pct` estuviera realmente
// guardado: el ancho se persistía correctamente (confirmado en el inspector
// y en la base de datos) pero JAMÁS se aplicaba visualmente al soltar el
// puntero, porque `sized`/`liveWidth` nunca lo veían. Este era el bug real
// detrás de "el redimensionamiento no se ve" para cualquier imagen que no
// hubiera sido movida antes con el ratón — la inmensa mayoría de los casos.
const hasCustomWidth = computed(() =>
    isV2.value
        ? (props.config as ElementConfigV2).width_pct !== null
        : legacyWidth.value !== null,
);
const baseWidthPx = computed<number | null>(() => {
    if (!hasCustomWidth.value) {
        return null;
    }

    return isV2.value
        ? pctToPx(
              (props.config as ElementConfigV2).width_pct as number,
              positioningRoot.width.value,
          )
        : legacyWidth.value;
});
const sized = computed(
    () => hasCustomWidth.value || gesture.value?.kind === 'resize',
);

const liveWidth = computed(() => {
    if (gesture.value?.kind !== 'resize') {
        return baseWidthPx.value;
    }

    const parentWidth =
        root.value?.parentElement?.getBoundingClientRect().width;
    const startWidthPx =
        baseWidthPx.value !== null
            ? baseWidthPx.value
            : ((
                  root.value?.firstElementChild as HTMLElement | null
              )?.getBoundingClientRect().width ?? parentWidth ?? 100);

    return Math.max(10, startWidthPx + gesture.value.dx);
});

// Proporcional (alto automático) mientras no haya un alto propio — refleja
// el checkbox "Proporcional" del inspector (toggleAutoHeight en Index.vue).
// En este modo el alto SIEMPRE lo decide la proporción intrínseca de la
// imagen (height:auto), nunca un valor arrastrado.
// Misma corrección que hasCustomWidth/baseWidthPx arriba: decidido por
// isV2, no por isNormalized.
const hasCustomHeight = computed(() =>
    isV2.value
        ? (props.config as ElementConfigV2).height_pct !== null
        : legacyHeight.value !== null,
);
const baseHeightPx = computed<number | null>(() => {
    if (!hasCustomHeight.value) {
        return null;
    }

    return isV2.value
        ? pctToPx(
              (props.config as ElementConfigV2).height_pct as number,
              positioningRoot.width.value,
          )
        : legacyHeight.value;
});
const proportional = computed(() => !hasCustomHeight.value);

// Espejo de liveWidth para el alto — pero SOLO cuando no es proporcional: en
// modo proporcional el alto nunca se arrastra (dy se ignora a propósito, ver
// startResize), permanece en 'auto' tanto en vivo como al guardar.
const liveHeight = computed(() => {
    if (baseHeightPx.value === null) {
        return null;
    }

    if (gesture.value?.kind !== 'resize') {
        return baseHeightPx.value;
    }

    return Math.max(10, baseHeightPx.value + gesture.value.dy);
});

// left/top en vivo — SOLO en modo normalizado: position:absolute contra el
// positioning-root, nunca transform:translate(%) (el % de translate() se
// calcularía respecto al tamaño del PROPIO elemento, no del root — ver
// spec). El delta de un arrastre en curso se suma directamente en px sobre
// la base ya convertida, sin volver a pasar por porcentaje hasta el commit.
const liveLeftTop = computed(() => {
    if (!isNormalized.value) {
        return null;
    }

    const c = props.config as ElementConfigV2;
    const rootWidth = positioningRoot.width.value;
    const dx = gesture.value?.kind === 'move' ? gesture.value.dx : 0;
    const dy = gesture.value?.kind === 'move' ? gesture.value.dy : 0;

    return {
        left: pctToPx(c.x_pct, rootWidth) + dx,
        top: pctToPx(c.y_pct, rootWidth) + dy,
    };
});

const style = computed(() => {
    const c = props.config;
    const transforms: string[] = [];

    if (!isNormalized.value) {
        const dx = gesture.value?.kind === 'move' ? gesture.value.dx : 0;
        const dy = gesture.value?.kind === 'move' ? gesture.value.dy : 0;
        const x = legacyX.value + dx;
        const y = legacyY.value + dy;

        if (x !== 0 || y !== 0) {
            transforms.push(`translate(${x}px, ${y}px)`);
        }
    }

    if (c.scale !== 1) {
        transforms.push(`scale(${c.scale})`);
    }

    if (c.rotation !== 0) {
        transforms.push(`rotate(${c.rotation}deg)`);
    }

    // position:absolute para adornos (SIEMPRE, ver prop `decoration`) o para
    // cualquier elemento ya normalizado (ver isNormalized) — el resto se
    // queda position:relative, exactamente igual que el editor histórico
    // (ver comentarios de MenuEditableElement previos a este rewrite sobre
    // por qué position:relative SIEMPRE, nunca condicionado a "¿tiene
    // transform?"). z-index explícito, nunca condicionado a la selección:
    // se intentó elevar el z-index del elemento seleccionado (para resolver
    // una colisión de la manija de resize con un hermano vecino, ver
    // .tc-mev-resize-hitarea más abajo) pero eso rompía Alt+clic — cada vez
    // que un adorno se selecciona saltaría al frente de
    // `elementsFromPoint()` (Menu.vue), así que el ciclo de Alt+clic quedaba
    // atrapado alternando para siempre entre los dos elementos más altos sin
    // alcanzar nunca el tercero (confirmado con Playwright: 8 Alt+clics
    // seguidos alternando decoration-2/decoration-1 sin llegar al título
    // tapado). La colisión de la manija se resolvió en su lugar reduciendo
    // el desborde del hit area (-6px en vez de -14px, ver más abajo).
    const out: Record<string, string | number> = {
        position: props.decoration || isNormalized.value ? 'absolute' : 'relative',
        zIndex: c.z_index,
    };

    if (isNormalized.value && liveLeftTop.value) {
        out.left = `${liveLeftTop.value.left}px`;
        out.top = `${liveLeftTop.value.top}px`;
    }

    if (transforms.length) {
        out.transform = transforms.join(' ');
    }

    if (liveWidth.value !== null) {
        // Varias plantillas (tc-mp-pozole-photo, tc-mp-hero-photo,
        // tc-mp-alt-photo, tc-mp-promo-hero…) traen su propio max-width en
        // calc(clamp(...)) para el tamaño responsivo por defecto. Una vez
        // personalizado, ese max-width seguiría ganando sobre este width en
        // línea (max-width topa a width sin importar especificidad) — el
        // usuario podía achicar pero nunca agrandar más allá de ese tope.
        // Anularlo aquí le da control real e ilimitado del tamaño.
        out.width = `${liveWidth.value}px`;
        out.maxWidth = 'none';
    }

    if (liveHeight.value !== null) {
        out.height = `${liveHeight.value}px`;
        out.maxHeight = 'none';
    }

    // Varias fotos de platillo son hijas de una fila flex compartida con el
    // bloque de precio. Sin flex-shrink:0, el algoritmo de flexbox las
    // encogía de vuelta a su tamaño "que quepa" en la fila en cuanto se
    // personalizaban — flex-shrink:0 fuerza a que el ancho/alto explícitos
    // de arriba se respeten siempre. Irrelevante una vez Teleported (ya no
    // vive dentro de esa fila), pero inofensivo dejarlo puesto.
    if (liveWidth.value !== null || liveHeight.value !== null) {
        out.flexShrink = '0';
    }

    if (c.opacity !== null && c.opacity !== undefined && c.opacity !== 1) {
        out.opacity = String(c.opacity);
    }

    return out;
});

// Estilo del <img> interno (solo kind==='image' con src) — deliberadamente
// SEPARADO del estilo del wrapper: el wrapper puede tener scale/rotation/
// z-index que no deben aplicarse dos veces a la imagen, y esta necesita sus
// propios ejes (fit/object-position/inner_scale) que no tienen sentido en
// ningún otro tipo de elemento. Antes de personalizar (sized === false) se
// devuelve un objeto vacío a propósito: el diseño responsivo original
// (clases tc-mp-title-img/tc-mp-subtitle-img/tc-mp-tagline-img con su
// max-width/breakpoint propio) sigue mandando sin que ningún estilo en
// línea lo pise. En cuanto se personaliza, el estilo en línea generado aquí
// SIEMPRE gana sobre cualquier regla de esas clases.
const imageStyle = computed(() => {
    if (props.kind !== 'image' || !props.src || !sized.value) {
        return undefined;
    }

    const style: Record<string, string> = {
        width: '100%',
        maxWidth: '100%',
    };

    if (proportional.value) {
        style.height = 'auto';
    } else {
        style.height = '100%';
        style.objectFit = props.config.fit ?? 'contain';
        style.objectPosition = `${props.config.object_x ?? 50}% ${props.config.object_y ?? 50}%`;
    }

    const innerScale = props.config.inner_scale ?? 1;

    if (innerScale !== 1) {
        style.transform = `scale(${innerScale})`;
    }

    return style;
});

// Fuera del lienzo horizontalmente (ver botón "Traer a la vista" en
// Index.vue, que hace la corrección real) — solo tiene sentido para
// elementos ya normalizados, cuyo x_pct/width_pct SON directamente su
// posición real (nada que medir del DOM).
const isOffCanvas = computed(() => {
    if (!isNormalized.value) {
        return false;
    }

    const c = props.config as ElementConfigV2;
    const w = c.width_pct ?? 20;
    const visibleFraction =
        Math.min(c.x_pct + w, 100) - Math.max(c.x_pct, 0);

    return visibleFraction < w * 0.1;
});

/**
 * Config V2 "actual" a partir de la cual construir un commit — si YA es V2
 * se usa tal cual (nunca se vuelve a medir el DOM, ver upgradeV1ToV2); si es
 * V1 (o no existe todavía), se mide el rect REAL del elemento y del
 * positioning-root EN ESTE INSTANTE (antes de aplicar ningún delta de
 * gesto) y se convierte — así el primer movimiento/redimensión nunca salta:
 * la posición base capturada es exactamente la que se ve en pantalla justo
 * antes de empezar a arrastrar.
 */
function currentConfigAsV2(
    positionMode: ElementPositionMode,
): ElementConfigV2 {
    if (isV2Config(props.config)) {
        return props.config;
    }

    // root/rootRect ya deberían existir siempre en este punto (solo se
    // llama en respuesta a un gesto sobre un nodo ya montado e interactivo)
    // — un rect degenerado 0x0/1px de ancho es un fallback defensivo, nunca
    // el camino esperado, que como mucho produce un x_pct/y_pct de 0.
    const elRect = root.value?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    };
    const rootRect = positioningRoot.measureRootRect(root.value) ?? {
        left: 0,
        top: 0,
        width: 1,
        height: 1,
    };

    return upgradeV1ToV2(props.config, elRect, rootRect, positionMode);
}

/** true si el pointerdown procede de la manija de resize — comprobado tanto
 * por closest() (regla 1) como por composedPath() (regla 1, defensa
 * adicional por si el nodo llega retargeted, p. ej. a través de un
 * Teleport) — en cualquiera de los dos casos, startDrag debe abandonar de
 * inmediato: la manija ya maneja su propio pointerdown de forma exclusiva
 * (ver @pointerdown.stop.prevent="startResize" en el template), esto es
 * defensa en profundidad, no la única barrera. */
function originatesFromResizeHandle(event: PointerEvent): boolean {
    if ((event.target as HTMLElement | null)?.closest?.('[data-mev-resize-handle]')) {
        return true;
    }

    return event
        .composedPath()
        .some(
            (node) =>
                node instanceof HTMLElement &&
                node.hasAttribute('data-mev-resize-handle'),
        );
}

function startDrag(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    // Regla 7: ignora botones secundarios (clic derecho) y punteros no
    // primarios (un segundo dedo en multi-touch) — nunca inician un gesto.
    if (event.button !== 0 || !event.isPrimary) {
        return;
    }

    // Regla 1: un pointerdown que procede de la manija de resize jamás
    // inicia un gesto de movimiento.
    if (originatesFromResizeHandle(event)) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const pointerId = event.pointerId;
    const threshold = moveThresholdFor(event.pointerType);
    // Regla 8: mantiene los eventos dirigidos a este puntero aunque salga
    // físicamente del elemento durante el arrastre.
    try {
        (event.currentTarget as Element | null)?.setPointerCapture?.(pointerId);
    } catch {
        // Algunos navegadores/entornos rechazan la captura para un puntero
        // que no reconocen como "activo" en ese instante exacto (p. ej.
        // eventos sintéticos en pruebas automatizadas) — no debe abortar el
        // resto del gesto: los listeners de document siguen funcionando
        // igual, la captura solo ayuda a que el arrastre siga funcionando
        // si el puntero sale físicamente del elemento.
    }

    // Medido ANTES de que exista cualquier gesto en curso — captura la
    // posición real tal como se ve en pantalla en este instante, sin
    // contaminar con el propio arrastre que está a punto de empezar (ver
    // comentario de currentConfigAsV2).
    const baseline = currentConfigAsV2('flow');
    const rootWidth = positioningRoot.width.value;
    const startX = event.clientX;
    const startY = event.clientY;
    const startScrollY = (document.scrollingElement ?? document.documentElement)
        .scrollTop;
    let lastClientX = event.clientX;
    let lastClientY = event.clientY;
    let autoScrollFrame = 0;

    // Regla 3: arranca en 'pending-move' — todavía nada se mueve
    // visualmente (los computed de arriba solo reaccionan a kind==='move').
    gesture.value = { kind: 'pending-move', pointerId, dx: 0, dy: 0 };

    function applyDelta() {
        if (gesture.value?.pointerId !== pointerId) {
            return;
        }

        const scroller = document.scrollingElement ?? document.documentElement;
        const scrolled = scroller.scrollTop - startScrollY;
        const dx = lastClientX - startX;
        const dy = lastClientY - startY + scrolled;

        if (gesture.value.kind === 'pending-move') {
            // Regla 3+5: promueve a 'move' solo al superar el umbral —
            // jamás a 'resize'. Bajo el umbral no pasa nada (sigue pending).
            if (Math.hypot(dx, dy) < threshold) {
                return;
            }

            gesture.value = { kind: 'move', pointerId, dx, dy };
            return;
        }

        if (gesture.value.kind === 'move') {
            gesture.value = { kind: 'move', pointerId, dx, dy };
        }
    }

    // Auto-scroll cuando el puntero se acerca al borde superior/inferior del
    // viewport MIENTRAS se arrastra — sin esto es imposible mover un adorno
    // a una sección que hoy está fuera de la vista, porque no hay forma de
    // desplazar la página con el puntero ya capturado en el arrastre. La
    // posición se recalcula en cada frame (no solo en pointermove) para que
    // el elemento siga avanzando aunque el puntero esté quieto sobre el borde.
    const EDGE = 56;
    const MAX_SPEED = 16;

    function autoScrollTick() {
        const scroller = document.scrollingElement ?? document.documentElement;
        const vh = window.innerHeight;
        let speed = 0;

        if (lastClientY < EDGE) {
            speed = -MAX_SPEED * (1 - lastClientY / EDGE);
        } else if (lastClientY > vh - EDGE) {
            speed = MAX_SPEED * (1 - (vh - lastClientY) / EDGE);
        }

        if (speed !== 0) {
            scroller.scrollTop += speed;
            applyDelta();
        }

        autoScrollFrame = requestAnimationFrame(autoScrollTick);
    }
    autoScrollFrame = requestAnimationFrame(autoScrollTick);

    const move = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) {
            return;
        }

        lastClientX = e.clientX;
        lastClientY = e.clientY;
        applyDelta();
    };

    // Regla 9+10: pointerup COMMITEA (solo si de verdad se promovió a
    // 'move'); pointercancel SIEMPRE descarta sin guardar nada, sin importar
    // cuánto se haya desplazado ya.
    function finish(e: PointerEvent, shouldCommit: boolean) {
        if (e.pointerId !== pointerId) {
            return;
        }

        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', cancel);
        cancelAnimationFrame(autoScrollFrame);

        try {
            (event.currentTarget as Element | null)?.releasePointerCapture?.(
                pointerId,
            );
        } catch {
            // El navegador ya pudo haber liberado la captura por su cuenta
            // (p. ej. el puntero se desconectó) — no es un error real.
        }

        const wasMove = gesture.value?.kind === 'move';
        const dx = gesture.value?.dx ?? 0;
        const dy = gesture.value?.dy ?? 0;
        gesture.value = null;

        // Regla 4: sin promoción a 'move' (toque/clic corto sin superar el
        // umbral) nunca commitea, solo seleccionó (ya emitido arriba).
        // pointercancel (regla 10) tampoco commitea nunca.
        if (!shouldCommit || !wasMove) {
            return;
        }

        // Un arrastre siempre implica reposicionar a mano — a diferencia de
        // un resize puro (ver startResize), SIEMPRE escapa del flujo aquí.
        // El elemento SIGUE en su posición de flujo real en este instante
        // (el commit todavía no se aplicó) — último momento seguro para
        // medir el hueco a reservar.
        captureFlowPlaceholderBeforeLeavingFlow();
        emit('commit', props.elementKey, {
            ...baseline,
            position_mode: 'normalized',
            x_pct: clampPct(baseline.x_pct + pxToPct(dx, rootWidth)),
            y_pct: clampPct(baseline.y_pct + pxToPct(dy, rootWidth)),
        });
    }

    const up = (e: PointerEvent) => finish(e, true);
    const cancel = (e: PointerEvent) => finish(e, false);

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
}

function startResize(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    // Regla 7: igual que startDrag, ignora botones secundarios/punteros no
    // primarios.
    if (event.button !== 0 || !event.isPrimary) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

    const pointerId = event.pointerId;
    try {
        (event.currentTarget as Element | null)?.setPointerCapture?.(pointerId);
    } catch {
        // Algunos navegadores/entornos rechazan la captura para un puntero
        // que no reconocen como "activo" en ese instante exacto (p. ej.
        // eventos sintéticos en pruebas automatizadas) — no debe abortar el
        // resto del gesto: los listeners de document siguen funcionando
        // igual, la captura solo ayuda a que el arrastre siga funcionando
        // si el puntero sale físicamente del elemento.
    }

    const baseline = currentConfigAsV2('flow');
    const rootWidth = positioningRoot.width.value;
    const startEl = root.value?.firstElementChild as HTMLElement | null;
    const startWidthPx =
        baseline.width_pct !== null
            ? pctToPx(baseline.width_pct, rootWidth)
            : (startEl?.getBoundingClientRect().width ?? 100);
    const startHeightPx =
        baseline.height_pct !== null
            ? pctToPx(baseline.height_pct, rootWidth)
            : (startEl?.getBoundingClientRect().height ?? 100);
    const startX = event.clientX;
    const startY = event.clientY;

    // Regla 2: decidido EXCLUSIVAMENTE aquí, al presionar la manija — nunca
    // cambia a otro kind durante el resto del gesto (regla 5: jamás se
    // promueve a 'move'; regla 6: `next` de abajo solo copia baseline.x_pct/
    // y_pct sin modificarlos, nunca los mueve).
    gesture.value = { kind: 'resize', pointerId, dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) {
            return;
        }

        gesture.value = {
            kind: 'resize',
            pointerId,
            dx: e.clientX - startX,
            dy: e.clientY - startY,
        };
    };

    // Regla 9+10: igual que en startDrag — pointerup commitea, pointercancel
    // siempre descarta.
    function finish(e: PointerEvent, shouldCommit: boolean) {
        if (e.pointerId !== pointerId) {
            return;
        }

        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', cancel);

        try {
            (event.currentTarget as Element | null)?.releasePointerCapture?.(
                pointerId,
            );
        } catch {
            // Ver comentario equivalente en startDrag/finish.
        }

        const dx = gesture.value?.dx ?? 0;
        const dy = gesture.value?.dy ?? 0;
        gesture.value = null;

        if (!shouldCommit || (dx === 0 && dy === 0)) {
            return;
        }

        // Un resize puro NO fuerza position:absolute — se queda en el mismo
        // position_mode que ya tenía (flow sigue siendo flow, un elemento ya
        // normalizado sigue normalizado): solo cambia el FORMATO guardado a
        // % (nunca px persistidos, ver spec), la posición natural de flujo
        // sigue decidiendo dónde queda mientras no se mueva también a mano.
        // x_pct/y_pct heredan de `...baseline` sin modificar (regla 6).
        const next: ElementConfigV2 = {
            ...baseline,
            width_pct: clampPct(pxToPct(Math.max(10, startWidthPx + dx), rootWidth)),
        };

        // El alto solo se arrastra (dy) cuando el elemento YA es "no
        // proporcional" (baseline.height_pct !== null, ver checkbox
        // "Proporcional" del inspector) — en modo proporcional el alto se
        // queda en null (automático) sin importar cuánto se mueva dy.
        if (baseline.height_pct !== null) {
            next.height_pct = clampPct(
                pxToPct(Math.max(10, startHeightPx + dy), rootWidth),
            );
        }

        emit('commit', props.elementKey, next);
    }

    const up = (e: PointerEvent) => finish(e, true);
    const cancel = (e: PointerEvent) => finish(e, false);

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', cancel);
}

function nudge(event: KeyboardEvent) {
    if (!interactive.value) {
        return;
    }

    const keys: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
    };

    const delta = keys[event.key];

    if (!delta) {
        return;
    }

    event.preventDefault();
    // Sin esto, la tecla de flecha además de nudgear ESTE elemento burbujea
    // hasta el @keydown="nudge" de cualquier ANCESTRO MenuEditableElement
    // (p. ej. item-N:container envolviendo item-N:price) y lo nudgea TAMBIÉN
    // — bug real encontrado probando el arrastre repetido: cada tecla movía
    // el precio Y su contenedor a la vez, y el contenedor (mucho más grande,
    // con su propia matemática de %) terminaba dominando visualmente. Igual
    // que startDrag/startResize ya hacen stopPropagation() en pointerdown.
    event.stopPropagation();
    emit('select', props.elementKey);

    const step = event.shiftKey ? 10 : 1;
    const baseline = currentConfigAsV2('flow');
    const rootWidth = positioningRoot.width.value;

    // Igual que un arrastre con el puntero: nudge SIEMPRE reposiciona a
    // mano, así que siempre escapa del flujo. Medir el hueco a reservar
    // ANTES del commit — ver comentario equivalente en startDrag/finish.
    captureFlowPlaceholderBeforeLeavingFlow();
    emit('commit', props.elementKey, {
        ...baseline,
        position_mode: 'normalized',
        x_pct: clampPct(
            baseline.x_pct + pxToPct(delta[0] * step, rootWidth),
        ),
        y_pct: clampPct(
            baseline.y_pct + pxToPct(delta[1] * step, rootWidth),
        ),
    });
}

function selectFromFocus() {
    if (props.editable) {
        emit('select', props.elementKey);
    }
}

// La raíz de esta plantilla es un <Teleport> (necesario para poder mover
// elementos normalizados a .tc-mp-customized-layer) — Vue NO reenvía los
// atributos "fallthrough" (class/style/etc. que un padre pasa sin declararlos
// como prop) a través de un <Teleport> de la misma forma que a un elemento
// normal, incluso con disabled:true (caso de items/categorías en flujo y de
// TODOS los adornos, que nunca se teleportan). Confirmado empíricamente vía
// Playwright: `class="tc-mp-photo"` (MenuItemVisual.vue) y
// `class="tc-mp-decoration"` (Menu.vue) NUNCA llegaban al div real
// (outerHTML solo mostraba tc-mev/tc-mev--image) — eso rompía en silencio
// tanto el ancho responsivo por defecto de fotos de platillo (`.tc-mp-photo
// img{width:100%}` nunca aplicaba) como `pointer-events:auto` de adornos en
// modo editable (`.tc-mp--editable .tc-mp-decoration` nunca aplicaba, dejando
// los adornos inertes a los clics). Fix: inheritAttrs:false + v-bind="$attrs"
// explícito en el div real — Vue SÍ fusiona correctamente una clase recibida
// por $attrs con la class/:class ya declarada en el mismo elemento.
defineOptions({ inheritAttrs: false });

defineExpose({ root });
</script>

<template>
    <!-- Oculto SOLO en la vista resuelta actual (config.hidden, discreto por
         breakpoint — ver ElementConfig/DISCRETE_FIELDS en types.ts): se saca
         del DOM por completo, en editor Y público por igual, en vez de
         display:none — mismo criterio que ya usaban los adornos vía
         visibleDecorations() en Menu.vue, generalizado aquí para que
         cualquier elemento (categoría/item/adorno) lo herede sin duplicar la
         condición en cada *Page.vue. Recuperarlo: la lista lateral de
         "Elementos de la sección"/platillo en Index.vue sigue listando el
         elemento y permite reseleccionarlo aunque no esté en el DOM del
         lienzo (igual que ya pasa con adornos ocultos). -->
    <!-- Reserva el hueco que el elemento ocupaba en flujo normal mientras
         vive Teleportado en la capa personalizada — ver flowPlaceholderSize.
         Nunca se renderiza para adornos (nunca viven en flujo, ver prop
         `decoration`) ni mientras el gesto de arrastre sigue en curso dentro
         del propio flujo (shouldTeleport recién se activa AL COMMITEAR el
         primer movimiento, no durante el arrastre en sí). -->
    <div
        v-if="shouldTeleport && flowPlaceholderSize"
        class="tc-mev-flow-placeholder"
        :style="{
            width: `${flowPlaceholderSize.width}px`,
            height: `${flowPlaceholderSize.height}px`,
        }"
        aria-hidden="true"
    />
    <Teleport
        v-if="!config.hidden"
        :to="teleportTarget ?? 'body'"
        :disabled="!shouldTeleport"
    >
        <div
            ref="root"
            v-bind="$attrs"
            class="tc-mev"
            :class="{
                'tc-mev--editable': editable,
                'tc-mev--selected': editable && selected,
                'tc-mev--locked': editable && locked,
                'tc-mev--sized': sized,
                'tc-mev--image': kind === 'image',
            }"
            :style="style"
            :data-element-key="elementKey"
            :tabindex="interactive ? 0 : undefined"
            :aria-label="editable ? label || elementKey : undefined"
            @pointerdown="startDrag"
            @keydown="nudge"
            @focus="selectFromFocus"
        >
            <img
                v-if="kind === 'image' && src"
                :src="src"
                :alt="alt"
                :class="imgClass"
                :style="imageStyle"
                :draggable="editable ? false : undefined"
            />
            <slot v-else />
            <span
                v-if="editable && selected"
                class="tc-mev-label"
                aria-hidden="true"
                >{{ label || elementKey }}{{ locked ? ' 🔒' : '' }}</span
            >
            <span
                v-if="editable && selected && isOffCanvas"
                class="tc-mev-offcanvas"
                aria-hidden="true"
                >Fuera del lienzo</span
            >
            <!-- Área táctil ampliada (28×28, ver spec) restringida a la
                 esquina inferior derecha — el indicador VISUAL de adentro se
                 queda en 12×12 (ver .tc-mev-handle). data-mev-resize-handle
                 es el marcador exclusivo que closest()/composedPath() buscan
                 en startDrag para abandonar de inmediato (regla 1); .stop
                 .prevent aquí evita ADEMÁS que el pointerdown llegue a
                 burbujear hasta el @pointerdown="startDrag" del wrapper. -->
            <div
                v-if="editable && selected && !locked"
                data-mev-resize-handle
                class="tc-mev-resize-hitarea"
                @pointerdown.stop.prevent="startResize"
            >
                <span class="tc-mev-handle" aria-hidden="true" />
            </div>
        </div>
    </Teleport>
</template>

<style scoped>
/* Ver flowPlaceholderSize arriba — invisible pero SIGUE ocupando su tamaño
   en el flujo normal (nunca display:none, que no reservaría nada). flex-
   shrink:0 es necesario dentro de filas flex (p.ej. .tc-mp-hero-row) para
   que un padre con poco espacio no lo comprima en vez de encoger a sus
   hermanos reales, que es justo el reflow que este placeholder existe para
   evitar. pointer-events:none porque nunca debe ser el objetivo de ningún
   gesto (el elemento real, ya Teleportado, es quien recibe los clics). */
.tc-mev-flow-placeholder {
    visibility: hidden;
    flex-shrink: 0;
    pointer-events: none;
}

/* A propósito no fija display/position: el host (imagen, título, bloque de
   precio…) ya trae el display que necesita — imponer uno propio pisaría
   flex/grid del layout público. transform funciona en cualquier caja sin
   necesitar position:relative; z-index se activa solo cuando aplica. */
.tc-mev--editable {
    cursor: grab;
    outline-offset: 2px;
    /* Sin esto, arrastrar sobre texto/imagen dispara la selección nativa del
       navegador (resaltado azul) a mitad de gesto, que compite con el
       arrastre real y puede sentirse como si el elemento "no se dejara"
       mover. touch-action:none evita además que el navegador interprete el
       gesto como scroll táctil en vez de arrastre en pantallas táctiles. */
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
}

/* El wrapper editable (arriba) es quien debe recibir SIEMPRE el pointerdown
   de arrastre — la imagen interior no debe interceptar nada (ni robar el
   target del evento hacia un hijo que no tiene su propia lógica de gesto).
   Solo aplica al <img> propio de kind="image"; el resto de contenido por
   slot no se ve afectado. */
.tc-mev--editable > img {
    pointer-events: none;
}

.tc-mev--editable:hover {
    outline: 1.5px dashed rgba(109, 76, 255, 0.55);
}

.tc-mev--selected {
    outline: 2px solid var(--tc-blue, #144e8f) !important;
    cursor: grabbing;
    position: relative;
}

.tc-mev--locked.tc-mev--selected {
    outline-color: #9ca3af !important;
    cursor: not-allowed;
}

.tc-mev-label {
    position: absolute;
    top: -22px;
    left: 0;
    background: var(--tc-blue, #144e8f);
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 999;
    pointer-events: none;
}

.tc-mev-offcanvas {
    position: absolute;
    top: -22px;
    right: 0;
    background: #b91c1c;
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    padding: 3px 6px;
    border-radius: 4px;
    white-space: nowrap;
    z-index: 999;
    pointer-events: none;
}

/* Hit area real (28×28) — deliberadamente NO una capa transparente sobre
   toda la imagen: right/bottom negativos la acercan a la esquina inferior
   derecha, sin invadir el centro/bordes/zonas transparentes del elemento,
   que deben seguir arrastrando (mover).
   Desborde de solo -6px (no -14px, mitad del tamaño del hit area) —
   bug real encontrado con Playwright: con -14px el hit area se centraba
   EXACTO en la esquina (14px hacia cada lado), así que su mitad exterior
   caía sistemáticamente en el `gap` entre la foto y el bloque de texto
   vecino en filas flex compactas (.tc-mp-dessert-row/.tc-mp-alt-row, ambas
   con gap:14px — un desborde igual al gap completo garantiza la colisión).
   El punto CENTRAL del hit area — exactamente donde un test (o un usuario)
   apunta al arrastrar — terminaba geométricamente en el borde/fuera de la
   caja de la imagen, así que el navegador resolvía el hit-test contra el
   contenedor/hermano de al lado en vez de contra la propia manija.
   Confirmado con document.elementsFromPoint() en el centro exacto del hit
   area: devolvía item-N:container, nunca item-N:image. Con -6px, el 78% del
   área (22 de 28px) queda dentro de la propia caja del elemento — sigue
   siendo un objetivo táctil amplio y cómodo, pero ya no desborda lo
   suficiente para alcanzar sistemáticamente el gap típico (14px+) de estas
   filas. */
.tc-mev-resize-hitarea {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: nwse-resize;
    touch-action: none;
    z-index: 999;
}

/* Indicador visual — se queda en 12×12, centrado dentro del hit area de
   arriba; pointer-events:none porque el pointerdown lo maneja el hit area
   contenedor, no este span. */
.tc-mev-handle {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--tc-blue, #144e8f);
    border: 2px solid #fff;
    pointer-events: none;
}
</style>
