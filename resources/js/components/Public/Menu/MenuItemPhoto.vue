<script setup lang="ts">
import { computed } from 'vue';

interface PhotoItem {
    image_url?: string | null;
    name: string;
    alt_text?: string | null;
    image_position_x?: number | null;
    image_position_y?: number | null;
    image_scale?: number | string | null;
    image_fit?: string | null;
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

const style = computed(() => ({
    objectPosition: `${props.item.image_position_x ?? 50}% ${props.item.image_position_y ?? 50}%`,
    transform: `scale(${Number(props.item.image_scale ?? 1)})`,
}));

const fit = computed(() => (props.cover ? 'cover' : (props.item.image_fit ?? 'contain')));
</script>

<template>
    <div class="tc-mp-photo" :class="{ 'tc-mp-photo--cover': fit === 'cover' }">
        <img
            v-if="item.image_url"
            :src="item.image_url"
            :alt="item.alt_text || item.name"
            loading="lazy"
            decoding="async"
            :style="style"
        />
    </div>
</template>
