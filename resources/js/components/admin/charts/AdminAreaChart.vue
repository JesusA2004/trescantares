<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    data: { label: string; count: number }[];
    color?: string;
    gradientFrom?: string;
    gradientTo?: string;
}>();

const W = 480;
const H = 120;
const PAD_X = 8;
const PAD_Y = 12;
const CHART_W = W - PAD_X * 2;
const CHART_H = H - PAD_Y * 2;

const maxVal = computed(() => Math.max(...props.data.map((d) => d.count), 1));

function x(i: number): number {
    if (props.data.length <= 1) return PAD_X + CHART_W / 2;
    return PAD_X + (i / (props.data.length - 1)) * CHART_W;
}

function y(val: number): number {
    return PAD_Y + CHART_H - (val / maxVal.value) * CHART_H;
}

const linePath = computed(() =>
    props.data
        .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`)
        .join(' '),
);

const areaPath = computed(() => {
    const first = props.data[0];
    const last = props.data[props.data.length - 1];
    const n = props.data.length - 1;
    const bottom = (PAD_Y + CHART_H).toFixed(1);
    return `${linePath.value} L ${x(n).toFixed(1)} ${bottom} L ${PAD_X.toFixed(1)} ${bottom} Z`;
});

const colorMain = computed(() => props.color ?? '#6D4CFF');
const gradFrom = computed(() => props.gradientFrom ?? colorMain.value);
const gradTo = computed(() => props.gradientTo ?? 'transparent');
</script>

<template>
    <div class="w-full">
        <svg
            :viewBox="`0 0 ${W} ${H}`"
            class="w-full"
            :style="{ height: '90px' }"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" :stop-color="gradFrom" stop-opacity="0.25" />
                    <stop offset="100%" :stop-color="gradTo" stop-opacity="0" />
                </linearGradient>
            </defs>

            <!-- Area fill -->
            <path :d="areaPath" fill="url(#area-grad)" />

            <!-- Line -->
            <path
                :d="linePath"
                fill="none"
                :stroke="colorMain"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />

            <!-- Dots + tooltips -->
            <g v-for="(d, i) in data" :key="i">
                <circle
                    :cx="x(i)"
                    :cy="y(d.count)"
                    r="3.5"
                    fill="white"
                    :stroke="colorMain"
                    stroke-width="2"
                />
                <title>{{ d.label }}: {{ d.count }}</title>
            </g>
        </svg>

        <!-- X-axis labels — show only first, middle, last -->
        <div class="flex justify-between mt-1 px-1">
            <span class="text-[10px] text-gray-400 dark:text-white/55 tabular-nums">{{ data[0]?.label }}</span>
            <span class="text-[10px] text-gray-400 dark:text-white/55 tabular-nums">{{ data[Math.floor(data.length / 2)]?.label }}</span>
            <span class="text-[10px] text-gray-400 dark:text-white/55 tabular-nums">{{ data[data.length - 1]?.label }}</span>
        </div>
    </div>
</template>
