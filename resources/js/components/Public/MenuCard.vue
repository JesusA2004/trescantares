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
    <article class="tc-mcard">
        <!-- Image -->
        <div class="tc-mcard-img-wrap">
            <img
                v-if="item.image_url"
                :src="item.image_url"
                :alt="item.name"
                class="tc-mcard-img"
                loading="lazy"
                decoding="async"
            />
            <div v-else class="tc-mcard-no-img">
                <span class="font-display tc-mcard-no-img-label">Tres Cantares</span>
            </div>
            <!-- Featured ribbon -->
            <span v-if="item.is_featured" class="tc-mcard-featured font-display">✦ ESPECIAL</span>
        </div>

        <!-- Body -->
        <div class="tc-mcard-body">
            <!-- Ornamento superior -->
            <div class="tc-mcard-ornament">
                <span class="tc-mcard-orn-line"></span>
                <span class="tc-mcard-orn-star">✦</span>
                <span class="tc-mcard-orn-line"></span>
            </div>

            <h3 class="tc-mcard-name font-display">{{ item.name }}</h3>
            <p v-if="item.description" class="tc-mcard-desc font-body">{{ item.description }}</p>

            <div v-if="Number(item.price) > 0" class="tc-mcard-price-wrap">
                <span class="tc-mcard-price font-display">${{ Number(item.price).toFixed(2) }}</span>
            </div>
        </div>
    </article>
</template>
