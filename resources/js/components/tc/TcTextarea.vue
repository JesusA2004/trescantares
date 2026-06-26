<script setup lang="ts">
defineProps<{
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    placeholder?: string;
    rows?: number;
    id?: string;
}>();

const model = defineModel<string>();
</script>

<template>
    <div class="tc-field">
        <label v-if="label" :for="id">
            {{ label }}
            <span v-if="required" class="text-[var(--tc-pink)] ml-0.5">*</span>
        </label>
        <textarea
            :id="id"
            v-model="model"
            class="tc-textarea"
            :class="{ 'border-[var(--tc-pink)]': error }"
            :rows="rows ?? 4"
            :placeholder="placeholder"
            :required="required"
            v-bind="$attrs"
        />
        <p v-if="error" class="text-xs text-[var(--tc-pink)] mt-0.5">{{ error }}</p>
        <p v-else-if="hint" class="text-xs text-gray-400 mt-0.5">{{ hint }}</p>
    </div>
</template>
