<script setup lang="ts">
defineProps<{
    label?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    placeholder?: string;
    options: { value: string | number; label: string }[];
    id?: string;
}>();

const model = defineModel<string | number>();
</script>

<template>
    <div class="tc-field">
        <label v-if="label" :for="id">
            {{ label }}
            <span v-if="required" class="text-[var(--tc-pink)] ml-0.5">*</span>
        </label>
        <select
            :id="id"
            v-model="model"
            class="tc-select"
            :class="{ 'border-[var(--tc-pink)]': error }"
            :required="required"
            v-bind="$attrs"
        >
            <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
            <option
                v-for="opt in options"
                :key="opt.value"
                :value="opt.value"
            >
                {{ opt.label }}
            </option>
        </select>
        <p v-if="error" class="text-xs text-[var(--tc-pink)] mt-0.5">{{ error }}</p>
        <p v-else-if="hint" class="text-xs text-gray-400 mt-0.5">{{ hint }}</p>
    </div>
</template>
