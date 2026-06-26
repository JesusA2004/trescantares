<script setup lang="ts">
defineProps<{
    active: boolean;
    activeLabel?: string;
    inactiveLabel?: string;
}>();
</script>

<template>
    <span
        class="tc-badge"
        :class="active ? 'tc-badge-green' : 'tc-badge-red'"
    >
        {{ active ? (activeLabel ?? 'Activo') : (inactiveLabel ?? 'Inactivo') }}
    </span>
</template>
