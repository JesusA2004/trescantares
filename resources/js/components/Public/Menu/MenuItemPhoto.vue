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

const SIZE_MULTIPLIER: Record<string, number> = { sm: 0.82, md: 1, lg: 1.2 };

const imgStyle = computed(() => {
    const sizeMult = SIZE_MULTIPLIER[props.item.visual_size ?? 'md'] ?? 1;
    const zoom = Number(props.item.image_scale ?? 1);

    return {
        objectPosition: `${props.item.image_position_x ?? 50}% ${props.item.image_position_y ?? 50}%`,
        transform: `scale(${zoom * sizeMult})`,
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

const fit = computed(() => (props.cover ? 'cover' : (props.item.image_fit ?? 'contain')));
</script>

<template>
    <div class="tc-mp-photo" :class="{ 'tc-mp-photo--cover': fit === 'cover' }" :style="wrapStyle">
        <img
            v-if="item.image_url"
            :src="item.image_url"
            :alt="item.alt_text || item.name"
            loading="lazy"
            decoding="async"
            :style="imgStyle"
        />
        <img v-if="item.caption_image_url" :src="item.caption_image_url" alt="" class="tc-mp-caption-img" loading="lazy" />
    </div>
</template>
