<script setup lang="ts">
defineProps<{
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    id?: string;
}>();

const model = defineModel<string | number>();
</script>

<template>
    <div class="tc-field">
        <label v-if="label" :for="id" class="tc-field-label">
            {{ label }}
            <span v-if="required" class="text-[var(--tc-pink)] ml-0.5">*</span>
        </label>
        <input
            :id="id"
            v-model="model"
            class="tc-input"
            :class="{ 'border-[var(--tc-pink)]': error }"
            :type="type ?? 'text'"
            :placeholder="placeholder"
            :disabled="disabled"
            :required="required"
            v-bind="$attrs"
        />
        <p v-if="error" class="text-xs text-[var(--tc-pink)] mt-0.5">{{ error }}</p>
        <p v-else-if="hint" class="text-xs text-gray-400 mt-0.5">{{ hint }}</p>
    </div>
</template>
