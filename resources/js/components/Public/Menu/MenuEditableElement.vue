<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
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

// Delta en curso (px REALES del documento — este componente siempre vive
// dentro del documento del iframe de vista previa, que nunca tiene un
// transform:scale aplicado a sí mismo, así que getBoundingClientRect() y
// clientX/clientY están siempre en el mismo sistema de coordenadas sin
// necesidad de dividir por ningún "scaleFactor" externo).
const gesture = ref<{
    kind: 'move' | 'resize' | 'rotate';
    dx: number;
    dy: number;
} | null>(null);

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
const hasCustomWidth = computed(() =>
    isNormalized.value
        ? (props.config as ElementConfigV2).width_pct !== null
        : legacyWidth.value !== null,
);
const baseWidthPx = computed<number | null>(() => {
    if (!hasCustomWidth.value) {
        return null;
    }

    return isNormalized.value
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
const hasCustomHeight = computed(() =>
    isNormalized.value
        ? (props.config as ElementConfigV2).height_pct !== null
        : legacyHeight.value !== null,
);
const baseHeightPx = computed<number | null>(() => {
    if (!hasCustomHeight.value) {
        return null;
    }

    return isNormalized.value
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
    // transform?"). z-index explícito, nunca condicionado.
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

function startDrag(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    if ((event.target as HTMLElement).closest('[data-mev-handle]')) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

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

    gesture.value = { kind: 'move', dx: 0, dy: 0 };

    function applyDelta() {
        const scroller = document.scrollingElement ?? document.documentElement;
        const scrolled = scroller.scrollTop - startScrollY;

        gesture.value = {
            kind: 'move',
            dx: lastClientX - startX,
            dy: lastClientY - startY + scrolled,
        };
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
        lastClientX = e.clientX;
        lastClientY = e.clientY;
        applyDelta();
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);
        cancelAnimationFrame(autoScrollFrame);

        lastClientX = e.clientX;
        lastClientY = e.clientY;

        const scroller = document.scrollingElement ?? document.documentElement;
        const dx = lastClientX - startX;
        const dy = lastClientY - startY + (scroller.scrollTop - startScrollY);
        gesture.value = null;

        if (dx === 0 && dy === 0) {
            return;
        }

        // Un arrastre siempre implica reposicionar a mano — a diferencia de
        // un resize puro (ver startResize), SIEMPRE escapa del flujo aquí.
        emit('commit', props.elementKey, {
            ...baseline,
            position_mode: 'normalized',
            x_pct: clampPct(baseline.x_pct + pxToPct(dx, rootWidth)),
            y_pct: clampPct(baseline.y_pct + pxToPct(dy, rootWidth)),
        });
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
}

function startResize(event: PointerEvent) {
    if (!interactive.value) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    emit('select', props.elementKey);

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
    gesture.value = { kind: 'resize', dx: 0, dy: 0 };

    const move = (e: PointerEvent) => {
        gesture.value = {
            kind: 'resize',
            dx: e.clientX - startX,
            dy: e.clientY - startY,
        };
    };

    const up = (e: PointerEvent) => {
        document.removeEventListener('pointermove', move);
        document.removeEventListener('pointerup', up);
        document.removeEventListener('pointercancel', up);

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        gesture.value = null;

        if (dx === 0 && dy === 0) {
            return;
        }

        // Un resize puro NO fuerza position:absolute — se queda en el mismo
        // position_mode que ya tenía (flow sigue siendo flow, un elemento ya
        // normalizado sigue normalizado): solo cambia el FORMATO guardado a
        // % (nunca px persistidos, ver spec), la posición natural de flujo
        // sigue decidiendo dónde queda mientras no se mueva también a mano.
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
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
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
    emit('select', props.elementKey);

    const step = event.shiftKey ? 10 : 1;
    const baseline = currentConfigAsV2('flow');
    const rootWidth = positioningRoot.width.value;

    // Igual que un arrastre con el puntero: nudge SIEMPRE reposiciona a
    // mano, así que siempre escapa del flujo.
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
    <Teleport
        v-if="!config.hidden"
        :to="teleportTarget ?? 'body'"
        :disabled="!shouldTeleport"
    >
        <div
            ref="root"
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
            <div
                v-if="editable && selected && !locked"
                data-mev-handle
                class="tc-mev-handle"
                @pointerdown="startResize"
            />
        </div>
    </Teleport>
</template>

<style scoped>
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

.tc-mev-handle {
    position: absolute;
    right: -6px;
    bottom: -6px;
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--tc-blue, #144e8f);
    border: 2px solid #fff;
    cursor: nwse-resize;
    z-index: 999;
}
</style>
