<script setup lang="ts">
defineProps<{
    label?: string;
    description?: string;
}>();

const model = defineModel<boolean>();
</script>

<template>
    <label class="tc-switch-wrap">
        <button
            type="button"
            class="tc-switch"
            :class="{ 'is-on': model }"
            @click="model = !model"
            :aria-pressed="model"
        />
        <div v-if="label || description">
            <span
                class="block text-sm font-medium text-gray-700"
                >{{ label }}</span
            >
            <span
                v-if="description"
                class="text-xs text-gray-500"
                >{{ description }}</span
            >
        </div>
    </label>
</template>
