<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { defaultElementConfig } from './types';
import type { ElementConfig } from './types';

const props = withDefaults(
    defineProps<{
        elementKey: string;
        label?: string;
        config?: ElementConfig;
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
         * este componente les fija position:absolute de forma PERMANENTE
         * (no condicionada a si están seleccionados). Antes de esto, el
         * elemento vivía siempre en position:relative salvo mientras estaba
         * seleccionado (un parche en app.css lo forzaba a absolute solo con
         * `.tc-mev--selected` + !important) — al deseleccionarlo volvía a
         * relative y cae al flujo normal del documento en vez de flotar en
         * su x/y guardada, apareciendo "movido" o detrás de otro contenido.
         * Ver también .tc-mp-decoration-layer en app.css: la capa de
         * adornos completa ya vive en su propio stacking context por
         * encima del contenido, así que esta bandera solo necesita resolver
         * el posicionamiento DENTRO de esa capa, nunca el apilamiento
         * frente a título/foto/precio. */
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
    commit: [elementKey: string, config: ElementConfig];
}>();

const root = useTemplateRef<HTMLDivElement>('root');
const locked = computed(() => !!props.config.locked);
const interactive = computed(() => props.editable && !locked.value);

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

// Con ancho personalizado, la imagen interna debe LLENAR ese ancho (ver
// imageStyle) — si no, rótulos como tc-mp-title-img (max-width:92%, sin
// width propio) se quedan en su tamaño intrínseco y arrastrar la manija de
// resize no mueve nada visualmente. También se activa durante un resize en
// curso (gesture), aunque config.width siga en null, para que el PRIMER
// resize de un elemento aún no personalizado ya se vea en vivo mientras se
// arrastra, no solo al soltar.
const sized = computed(
    () => props.config.width !== null || gesture.value?.kind === 'resize',
);

// Proporcional (alto automático) mientras config.height sea null — refleja
// el checkbox "Proporcional" del inspector (toggleAutoHeight en Index.vue).
// En este modo el alto SIEMPRE lo decide la proporción intrínseca de la
// imagen (height:auto), nunca un valor arrastrado; el contenedor envuelve
// lo que resulte, sin dejar un rectángulo vacío.
const proportional = computed(() => props.config.height === null);

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

const liveWidth = computed(() => {
    const base = props.config.width;

    if (gesture.value?.kind !== 'resize') {
        return base;
    }

    const parentWidth =
        root.value?.parentElement?.getBoundingClientRect().width;

    if (!parentWidth) {
        return base;
    }

    const baseWidthPx =
        base !== null
            ? base
            : ((
                  root.value?.firstElementChild as HTMLElement | null
              )?.getBoundingClientRect().width ?? parentWidth);

    return Math.max(10, baseWidthPx + gesture.value.dx);
});

// Espejo de liveWidth para el alto — pero SOLO cuando no es proporcional:
// en modo proporcional el alto nunca se arrastra (dy se ignora a propósito,
// ver startResize), permanece en 'auto' tanto en vivo como al guardar.
const liveHeight = computed(() => {
    const base = props.config.height;

    if (base === null) {
        return null;
    }

    if (gesture.value?.kind !== 'resize') {
        return base;
    }

    return Math.max(10, base + gesture.value.dy);
});

const style = computed(() => {
    const c = props.config;
    const dx = gesture.value?.kind === 'move' ? gesture.value.dx : 0;
    const dy = gesture.value?.kind === 'move' ? gesture.value.dy : 0;
    const x = c.x + dx;
    const y = c.y + dy;

    const transforms: string[] = [];

    if (x !== 0 || y !== 0) {
        transforms.push(`translate(${x}px, ${y}px)`);
    }

    if (c.scale !== 1) {
        transforms.push(`scale(${c.scale})`);
    }

    if (c.rotation !== 0) {
        transforms.push(`rotate(${c.rotation}deg)`);
    }

    // SIEMPRE position:relative (o absolute para adornos, ver `decoration`
    // prop) + z-index explícito (nunca condicionado a "¿tiene transform?" o
    // "¿z_index !== 1?") — sin esto, un elemento recién creado en x:0,y:0
    // (sin transform) queda SIN posicionar, y CSS pinta los hermanos sin
    // posicionar ANTES que cualquier hermano posicionado (con transform o
    // z-index propio) sin importar el orden en el DOM (ver painting order,
    // CSS 2.1 Apéndice E, pasos 3 vs. 6). position:relative sin offsets no
    // cambia el layout — solo habilita z-index y hace que el ORDEN EN EL DOM
    // (o z_index si se personalizó) decida el apilamiento de forma consistente
    // DENTRO de la capa de contenido (ver .tc-mp-content-layer en app.css).
    //
    // Los adornos (`decoration === true`) usan SIEMPRE position:absolute,
    // sin importar si están seleccionados — antes esto dependía de un
    // parche CSS (`.tc-mp-decoration.tc-mev--selected{position:absolute
    // !important}`) que solo aplicaba mientras el adorno tenía la clase de
    // selección; al seleccionar cualquier OTRO elemento el adorno perdía
    // position:absolute y caía al flujo normal del documento (bug real,
    // confirmado con getComputedStyle: el mismo adorno medía y=-1320px
    // seleccionado y y=1742px apenas se seleccionaba otra cosa). Fijarlo
    // aquí, en la única fuente de verdad del estilo del elemento, lo hace
    // permanente para editor Y público sin depender de ninguna clase.
    const out: Record<string, string | number> = {
        position: props.decoration ? 'absolute' : 'relative',
        zIndex: c.z_index,
    };

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

    // Varias fotos de platillo (tc-mp-pozole-photo, tc-mp-hero-photo,
    // tc-mp-alt-photo…) son hijos de una fila flex compartida con el bloque
    // de precio (tc-mp-pozole-main y equivalentes). Sin flex-shrink:0, el
    // algoritmo de flexbox las encogía de vuelta a su tamaño "que quepa" en
    // la fila en cuanto se personalizaban — max-width:none de arriba no
    // basta porque el encogimiento por flex-shrink no depende de max-width,
    // depende del espacio disponible en el eje principal del flex padre.
    // flex-shrink:0 fuerza a que el ancho/alto explícitos de arriba se
    // respeten siempre, incluso si eso desborda la fila (el padre puede
    // seguir envolviendo/scrolleando, como ya hacen los adornos).
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
// SIEMPRE gana sobre cualquier regla de esas clases (mayor especificidad
// que cualquier selector de clase) — así ninguna regla CSS puede volver a
// limitar la imagen una vez que el usuario definió un tamaño.
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

function currentConfigFromDom(): ElementConfig {
    if (
        props.config.x !== 0 ||
        props.config.y !== 0 ||
        props.config.width !== null
    ) {
        return { ...props.config };
    }

    // Sin personalizar aún: el offset 0,0 ya representa su posición natural
    // de flujo — no hace falta medir nada, basta con partir de la config
    // por defecto (igual que hoy se ve, sin salto visual al empezar a mover).
    return { ...defaultElementConfig(), ...props.config };
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

    const baseline = currentConfigFromDom();
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

        emit('commit', props.elementKey, {
            ...baseline,
            x: clamp(baseline.x + dx, -20000, 20000),
            y: clamp(baseline.y + dy, -20000, 20000),
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

    const baseline = currentConfigFromDom();
    const startEl = root.value?.firstElementChild as HTMLElement | null;
    const startWidth =
        baseline.width ?? startEl?.getBoundingClientRect().width ?? 100;
    const startHeight =
        baseline.height ?? startEl?.getBoundingClientRect().height ?? 100;
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

        const next: ElementConfig = {
            ...baseline,
            width: Math.max(10, startWidth + dx),
        };

        // El alto solo se arrastra (dy) cuando el elemento YA es "no
        // proporcional" (baseline.height !== null, ver checkbox
        // "Proporcional" del inspector) — en modo proporcional el alto se
        // queda en null (automático) sin importar cuánto se mueva dy, para
        // que la imagen conserve su proporción intrínseca real.
        if (baseline.height !== null) {
            next.height = Math.max(10, startHeight + dy);
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
    const baseline = currentConfigFromDom();

    emit('commit', props.elementKey, {
        ...baseline,
        x: clamp(baseline.x + delta[0] * step, -20000, 20000),
        y: clamp(baseline.y + delta[1] * step, -20000, 20000),
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
    <div
        v-if="!config.hidden"
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
        <div
            v-if="editable && selected && !locked"
            data-mev-handle
            class="tc-mev-handle"
            @pointerdown="startResize"
        />
    </div>
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
