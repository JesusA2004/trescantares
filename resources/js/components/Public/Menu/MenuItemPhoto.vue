<script setup lang="ts">
import { computed } from 'vue';

interface PhotoItem {
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
}

const props = withDefaults(
    defineProps<{
        item: PhotoItem;
        cover?: boolean;
    }>(),
    {
        cover: false,
    },
);

const imgStyle = computed(() => {
    const zoom = Number(props.item.image_scale ?? 1);

    return {
        objectPosition: `${props.item.image_position_x ?? 50}% ${props.item.image_position_y ?? 50}%`,
        // image_scale es únicamente zoom/recorte interno de la imagen; el
        // tamaño real que ocupa en el layout lo da .tc-mp-photo--sm/md/lg
        // (ver wrapStyle/wrapClass) para no solapar elementos vecinos.
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
    <div
        class="tc-mp-photo"
        :class="[sizeClass, { 'tc-mp-photo--cover': fit === 'cover' }]"
        :style="wrapStyle"
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
    </div>
</template>
