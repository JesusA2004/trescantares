<script setup lang="ts">
withDefaults(
    defineProps<{
        primaryColor?: string;
        secondaryColor?: string;
    }>(),
    {
        primaryColor: '#144E8F',
        secondaryColor: '#DB3465',
    },
);
</script>

<template>
    <div class="tc-mp-frame">
        <div class="tc-mp-frame-inner">
            <svg
                class="tc-mp-corner tc-mp-corner--tl"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M4 22C4 12 12 4 22 4"
                    :stroke="primaryColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                />
                <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
            </svg>
            <svg
                class="tc-mp-corner tc-mp-corner--tr"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M4 22C4 12 12 4 22 4"
                    :stroke="primaryColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                />
                <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
            </svg>
            <svg
                class="tc-mp-corner tc-mp-corner--bl"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M4 22C4 12 12 4 22 4"
                    :stroke="primaryColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                />
                <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
            </svg>
            <svg
                class="tc-mp-corner tc-mp-corner--br"
                viewBox="0 0 40 40"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M4 22C4 12 12 4 22 4"
                    :stroke="primaryColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                />
                <circle cx="30" cy="6" r="2.6" :fill="secondaryColor" />
                <circle cx="36" cy="12" r="2" :fill="primaryColor" />
                <circle cx="6" cy="30" r="2" :fill="secondaryColor" />
            </svg>

            <slot />
        </div>
    </div>
</template>
