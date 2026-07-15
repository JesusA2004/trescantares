<script setup lang="ts">
import { computed } from 'vue';
import MenuEditableElement from './MenuEditableElement.vue';
import { itemElementFor } from './types';
import type {
    ElementConfig,
    ItemLayoutSettings,
    MenuBreakpoint,
} from './types';

interface PhotoItem {
    id?: number;
    image_url?: string | null;
    name: string;
    alt_text?: string | null;
    caption_image_url?: string | null;
    image_position_x?: number | null;
    image_position_y?: number | null;
    image_scale?: number | string | null;
    image_fit?: string | null;
    image_align?: string | null;
    visual_size?: string | null;
    layout_settings?: ItemLayoutSettings | null;
}

const props = withDefaults(
    defineProps<{
        item: PhotoItem;
        cover?: boolean;
        breakpoint?: MenuBreakpoint;
        editable?: boolean;
        selectedKey?: string | null;
    }>(),
    {
        cover: false,
        breakpoint: 'lg',
        editable: false,
        selectedKey: null,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: ElementConfig];
}>();

// Solo los platillos reales (con id) tienen layout_settings — el hero de
// bebidas_promo, por ejemplo, pasa un objeto sintético sin id y se queda sin
// movimiento real (nada que mover: es la imagen de la categoría, no un item).
const elementKey = computed(() =>
    props.item.id ? `item-${props.item.id}:image` : 'item-none:image',
);
const isInteractive = computed(() => props.editable && !!props.item.id);
const config = computed(() =>
    itemElementFor(
        { layout_settings: props.item.layout_settings },
        'image',
        props.breakpoint,
    ),
);

const imgStyle = computed(() => {
    const zoom = Number(props.item.image_scale ?? 1);

    return {
        objectPosition: `${props.item.image_position_x ?? 50}% ${props.item.image_position_y ?? 50}%`,
        // image_scale/image_position_x/y son el encuadre interno de la
        // imagen (recorte dentro de su caja) — el movimiento real del
        // wrapper (.tc-mp-photo) lo maneja MenuEditableElement vía x/y/
        // width/height/scale/rotation/z_index.
        transform: `scale(${zoom})`,
    };
});

// image_align desplaza el bloque de la fotografía dentro de su contenedor
// (útil cuando la celda/columna es más ancha que la imagen, p. ej. en grids
// de escritorio); en móvil, dentro de filas ya centradas, no tiene efecto visible.
const wrapStyle = computed(() => {
    const align = props.item.image_align ?? 'center';

    if (align === 'left') {
        return { marginInlineEnd: 'auto' };
    }

    if (align === 'right') {
        return { marginInlineStart: 'auto' };
    }

    return {};
});

// visual_size cambia el ancho real reservado para la fotografía (vía la
// variable --tc-mp-size-mult que multiplican las reglas width/max-width de
// cada sección), no un transform — así el layout reserva el espacio real y
// no se solapa con lo que está al lado.
const sizeClass = computed(
    () => `tc-mp-photo--${props.item.visual_size ?? 'md'}`,
);

const fit = computed(() =>
    props.cover ? 'cover' : (props.item.image_fit ?? 'contain'),
);
</script>

<template>
    <MenuEditableElement
        :element-key="elementKey"
        :label="`${item.name} — imagen`"
        :config="config"
        :editable="isInteractive"
        :selected="selectedKey === elementKey"
        kind="image"
        class="tc-mp-photo"
        :class="[sizeClass, { 'tc-mp-photo--cover': fit === 'cover' }]"
        :style="wrapStyle"
        @select="emit('select', $event)"
        @commit="(k, c) => emit('commit', k, c)"
    >
        <img
            v-if="item.image_url"
            :src="item.image_url"
            :alt="item.alt_text || item.name"
            loading="lazy"
            decoding="async"
            :style="imgStyle"
        />
        <img
            v-if="item.caption_image_url"
            :src="item.caption_image_url"
            alt=""
            class="tc-mp-caption-img"
            loading="lazy"
        />
    </MenuEditableElement>
</template>
