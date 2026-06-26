<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
    data: { label: string; value: number; subValue?: number }[];
    colorFrom?: string;
    colorTo?: string;
    showSubValue?: boolean;
    subLabel?: string;
}>();

const mounted = ref(false);
onMounted(() => {
    setTimeout(() => { mounted.value = true; }, 60);
});

const max = computed(() => Math.max(...props.data.map((d) => d.value), 1));
const from = computed(() => props.colorFrom ?? '#6D4CFF');
const to = computed(() => props.colorTo ?? '#5B8CFF');

const hoveredIdx = ref<number | null>(null);

function pct(v: number) {
    return mounted.value ? Math.max(Math.round((v / max.value) * 100), v > 0 ? 4 : 0) : 0;
}

function subPct(item: { value: number; subValue?: number }) {
    if (!item.subValue || item.value === 0) return 0;
    return Math.round((item.subValue / item.value) * 100);
}
</script>

<template>
    <div v-if="data.length === 0" class="flex flex-col items-center justify-center py-12 text-gray-300">
        <slot name="empty">
            <span class="text-sm text-gray-400">Sin datos</span>
        </slot>
    </div>
    <div v-else class="bar-chart">
        <div
            v-for="(item, i) in data"
            :key="item.label"
            class="bar-row"
            @mouseenter="hoveredIdx = i"
            @mouseleave="hoveredIdx = null"
        >
            <!-- Label -->
            <span class="bar-label" :title="item.label">{{ item.label }}</span>

            <!-- Track + bar -->
            <div class="bar-track">
                <div
                    class="bar-fill"
                    :style="{
                        width: `${pct(item.value)}%`,
                        background: `linear-gradient(90deg, ${from}, ${to})`,
                        opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.38 : 1,
                        transform: hoveredIdx === i ? 'scaleY(1.14)' : 'scaleY(1)',
                        boxShadow: hoveredIdx === i ? `0 4px 16px color-mix(in srgb, ${to} 40%, transparent)` : 'none',
                    }"
                />
                <!-- Sub-value overlay -->
                <div
                    v-if="showSubValue && item.subValue !== undefined && item.value > 0"
                    class="bar-sub"
                    :style="{
                        width: `${pct(item.value)}%`,
                        opacity: hoveredIdx === i ? 0.22 : 0,
                    }"
                />
                <!-- Tooltip -->
                <Transition name="bar-tip">
                    <div v-if="hoveredIdx === i" class="bar-tip">
                        <span class="bar-tip-val">{{ item.value }}</span>
                        <span v-if="showSubValue && item.subValue !== undefined" class="bar-tip-sub">
                            {{ item.subValue }} {{ subLabel ?? 'activos' }} · {{ subPct(item) }}%
                        </span>
                    </div>
                </Transition>
            </div>

            <!-- Value -->
            <span class="bar-num" :class="{ 'bar-num-active': hoveredIdx === i }">
                {{ item.value }}
            </span>
        </div>
    </div>
</template>

<style scoped>
.bar-chart {
    display: flex;
    flex-direction: column;
    gap: 11px;
}
.bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
}
.bar-label {
    font-size: 0.75rem;
    color: #6b7280;
    width: 100px;
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--tc-font-body, sans-serif);
    font-weight: 500;
    transition: color .15s ease;
}
.bar-row:hover .bar-label {
    color: #1f2937;
    font-weight: 600;
}
.bar-track {
    flex: 1;
    height: 26px;
    background: rgba(228,228,231,.8);
    border-radius: 999px;
    overflow: visible;
    position: relative;
    border: 1px solid rgba(0,0,0,.06);
}
.bar-fill {
    height: 100%;
    border-radius: 999px;
    transform-origin: left center;
    transition:
        width .72s cubic-bezier(.4,0,.2,1),
        opacity .18s ease,
        transform .18s ease,
        box-shadow .18s ease;
    min-width: 4px;
    position: relative;
}
.bar-sub {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    border-radius: 999px;
    background: rgba(255,255,255,.4);
    pointer-events: none;
    transition: width .72s cubic-bezier(.4,0,.2,1), opacity .18s ease;
}
.bar-tip {
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    transform: translateX(-50%);
    background: #1D1D1F;
    color: white;
    padding: 6px 12px;
    border-radius: 10px;
    font-size: 0.75rem;
    white-space: nowrap;
    pointer-events: none;
    z-index: 20;
    font-family: var(--tc-font-body, sans-serif);
    box-shadow: 0 8px 24px rgba(0,0,0,.28);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
    border: 1px solid rgba(255,255,255,.10);
}
.bar-tip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: #1D1D1F;
}
.bar-tip-val {
    font-weight: 800;
    font-size: 0.875rem;
}
.bar-tip-sub {
    font-size: 0.6875rem;
    opacity: .75;
    font-weight: 500;
}
.bar-num {
    font-size: 0.75rem;
    font-weight: 700;
    color: #9ca3af;
    width: 24px;
    text-align: right;
    flex-shrink: 0;
    font-family: var(--tc-font-body, sans-serif);
    transition: color .15s ease;
    tabular-nums: normal;
}
.bar-num-active {
    color: #1f2937;
}
.bar-tip-enter-active, .bar-tip-leave-active {
    transition: opacity .14s ease, transform .14s ease;
}
.bar-tip-enter-from, .bar-tip-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
}

/* ── Dark mode overrides ── */
:global(.dark) .bar-label {
    color: #8E8E8E;
}
:global(.dark) .bar-row:hover .bar-label {
    color: #F5F5F5;
}
:global(.dark) .bar-track {
    background: rgba(109,76,255,.08);
    border-color: rgba(109,76,255,.14);
}
:global(.dark) .bar-num {
    color: #8E8E8E;
}
:global(.dark) .bar-num-active {
    color: #F5F5F5;
}
:global(.dark) .bar-tip {
    background: #262626;
    border-color: #313131;
}
:global(.dark) .bar-tip::after {
    border-top-color: #262626;
}
</style>
