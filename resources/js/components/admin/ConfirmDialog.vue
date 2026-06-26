<script setup lang="ts">
defineProps<{
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean;
}>();

const emit = defineEmits<{
    confirm: [];
    cancel: [];
}>();
</script>

<template>
    <Transition name="tc-overlay">
        <div class="tc-confirm-overlay" @click.self="emit('cancel')">
            <div class="tc-confirm-card">
                <p class="tc-confirm-title">{{ title }}</p>
                <p class="tc-confirm-desc">{{ description }}</p>
                <div class="flex gap-3 justify-end">
                    <button
                        class="tc-btn-secondary"
                        @click="emit('cancel')"
                    >
                        {{ cancelLabel ?? 'Cancelar' }}
                    </button>
                    <button
                        :class="danger !== false ? 'tc-btn-danger' : 'tc-btn-primary'"
                        @click="emit('confirm')"
                    >
                        {{ confirmLabel ?? 'Confirmar' }}
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.tc-overlay-enter-active,
.tc-overlay-leave-active {
    transition: opacity 0.2s ease;
}
.tc-overlay-enter-from,
.tc-overlay-leave-to {
    opacity: 0;
}
</style>
