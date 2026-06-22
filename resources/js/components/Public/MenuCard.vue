<script setup lang="ts">
defineProps<{
    item: {
        id: number
        name: string
        description?: string
        price: number | string
        image_url?: string
        is_featured?: boolean
    }
}>();
</script>

<template>
    <div class="tc-menu-card tc-card-hover">
        <!-- Image -->
        <div class="tc-menu-card-img-wrap">
            <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                class="tc-menu-card-img"
                loading="lazy"
                decoding="async"
            />
            <div v-else class="tc-menu-card-placeholder">
                <svg class="tc-menu-card-placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                        d="M12 8c-1.5 0-4 1-4 4s2.5 4 4 4 4-1 4-4-2.5-4-4-4zM3 12h1m17 0h1M12 3v1m0 17v1M5.6 5.6l.7.7m12.1-.7-.7.7M5.6 18.4l.7-.7m12.1.7-.7-.7" />
                </svg>
                <span class="tc-menu-card-placeholder-text font-display">Tres Cantares</span>
            </div>

            <!-- Featured badge -->
            <span v-if="item.is_featured" class="tc-menu-card-badge font-display">
                ✦ ESPECIAL
            </span>

            <!-- Price overlay bottom -->
            <div class="tc-menu-card-price-strip">
                <span class="font-display tc-menu-card-price">${{ Number(item.price).toFixed(2) }}</span>
            </div>
        </div>

        <!-- Content -->
        <div class="tc-menu-card-body">
            <h3 class="tc-menu-card-name font-display">{{ item.name }}</h3>
            <p v-if="item.description" class="tc-menu-card-desc font-body">{{ item.description }}</p>
        </div>
    </div>
</template>
