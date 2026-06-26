<script setup lang="ts">
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

defineProps<{
    modelValue: string;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
}>();

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
    <Select :model-value="modelValue" @update:model-value="(v) => $emit('update:modelValue', v as string)">
        <SelectTrigger class="tc-jobs-input tc-select-trigger font-body">
            <SelectValue :placeholder="placeholder ?? 'Selecciona una opción'" />
        </SelectTrigger>
        <SelectContent class="tc-select-content font-body">
            <SelectItem
                v-for="opt in options" :key="opt.value" :value="opt.value"
                class="tc-select-item font-body"
            >
                {{ opt.label }}
            </SelectItem>
        </SelectContent>
    </Select>
</template>
