<script setup lang="ts">
import { usePermissions } from '@/composables/usePermissions';

const props = defineProps<{
    permission?: string;
    role?: string;
    any?: string[];
}>();

const { can, hasRole, canAny } = usePermissions();

function isAllowed(): boolean {
    if (props.permission) return can(props.permission);
    if (props.role) return hasRole(props.role);
    if (props.any) return canAny(...props.any);
    return true;
}
</script>

<template>
    <slot v-if="isAllowed()" />
</template>
