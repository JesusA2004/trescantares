<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = defineProps<{
    segments: {
        label: string;
        value: number;
        color: string;
    }[];
    total?: number;
    centerLabel?: string;
    size?: number;
    strokeWidth?: number;
}>();

const mounted = ref(false);
onMounted(() => {
    setTimeout(() => { mounted.value = true; }, 80);
});

const sz = computed(() => props.size ?? 156);
const sw = computed(() => props.strokeWidth ?? 22);
const r = computed(() => (sz.value - sw.value) / 2);
const circ = computed(() => 2 * Math.PI * r.value);
const cx = computed(() => sz.value / 2);
const cy = computed(() => sz.value / 2);

const total = computed(() => {
    if (props.total !== undefined && props.total > 0) return props.total;
    return props.segments.reduce((s, seg) => s + seg.value, 0) || 1;
});

interface Arc {
    label: string;
    value: number;
    color: string;
    pct: number;
    dash: number;
    gap: number;
    offset: number;
}

const arcs = computed((): Arc[] => {
    let cum = 0;
    return props.segments.map((seg) => {
        const pct = total.value > 0 ? seg.value / total.value : 0;
        const dash = mounted.value ? pct * circ.value : 0;
        const gap = circ.value - dash;
        const startAngle = circ.value * 0.25;
        const offset = startAngle - cum * circ.value;
        cum += pct;
        return { ...seg, pct, dash, gap, offset };
    });
});

const hoveredIdx = ref<number | null>(null);
</script>

<template>
    <div class="donut-wrap">

        <!-- SVG Donut -->
        <div class="donut-chart-area">
            <svg
                :width="sz"
                :height="sz"
                :viewBox="`0 0 ${sz} ${sz}`"
                class="donut-svg"
            >
                <!-- Defs: gradients per segment -->
                <defs>
                    <radialGradient
                        v-for="(seg, i) in segments"
                        :id="`dg-${i}`"
                        :key="`grad-${i}`"
                        cx="50%" cy="50%" r="50%"
                    >
                        <stop offset="0%" :stop-color="seg.color" stop-opacity="0.85" />
                        <stop offset="100%" :stop-color="seg.color" stop-opacity="1" />
                    </radialGradient>
                </defs>

                <!-- Background track -->
                <circle
                    :cx="cx" :cy="cy" :r="r"
                    fill="none"
                    stroke="#f3ede0"
                    :stroke-width="sw"
                />
                <!-- Inner glow ring -->
                <circle
                    :cx="cx" :cy="cy" :r="r"
                    fill="none"
                    stroke="rgba(255,255,255,.4)"
                    :stroke-width="sw - 6"
                />

                <!-- Segments -->
                <circle
                    v-for="(arc, i) in arcs"
                    :key="arc.label"
                    :cx="cx" :cy="cy" :r="r"
                    fill="none"
                    :stroke="arc.color"
                    :stroke-width="hoveredIdx === i ? sw + 4 : sw"
                    stroke-linecap="round"
                    :stroke-dasharray="`${arc.dash} ${arc.gap}`"
                    :stroke-dashoffset="arc.offset"
                    :opacity="hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1"
                    style="transition: stroke-dasharray .72s cubic-bezier(.4,0,.2,1), stroke-dashoffset .72s cubic-bezier(.4,0,.2,1), stroke-width .18s ease, opacity .18s ease"
                    class="donut-segment"
                    @mouseenter="hoveredIdx = i"
                    @mouseleave="hoveredIdx = null"
                />

                <!-- Center background circle -->
                <circle
                    :cx="cx" :cy="cy" :r="r - sw / 2 - 2"
                    fill="white"
                    fill-opacity="0.92"
                />

                <!-- Center text -->
                <text
                    :x="cx" :y="cy - 8"
                    text-anchor="middle"
                    :font-size="sz * 0.148"
                    font-weight="800"
                    fill="#1a2e44"
                    font-family="sans-serif"
                    letter-spacing="-1"
                >{{ total }}</text>
                <text
                    :x="cx" :y="cy + 10"
                    text-anchor="middle"
                    :font-size="sz * 0.074"
                    fill="#9ca3af"
                    font-family="sans-serif"
                    font-weight="500"
                >{{ centerLabel ?? 'total' }}</text>

                <!-- Hover pct label -->
                <Transition name="donut-center">
                    <text
                        v-if="hoveredIdx !== null"
                        :x="cx" :y="cy + sz * 0.13"
                        text-anchor="middle"
                        :font-size="sz * 0.065"
                        :fill="segments[hoveredIdx]?.color ?? '#6b7280'"
                        font-family="sans-serif"
                        font-weight="700"
                    >{{ Math.round((arcs[hoveredIdx]?.pct ?? 0) * 100) }}%</text>
                </Transition>
            </svg>
        </div>

        <!-- Legend -->
        <div class="donut-legend">
            <div
                v-for="(seg, i) in segments"
                :key="seg.label"
                class="donut-legend-row"
                :class="{ 'is-hovered': hoveredIdx === i }"
                @mouseenter="hoveredIdx = i"
                @mouseleave="hoveredIdx = null"
            >
                <div class="donut-legend-dot-wrap">
                    <span class="donut-legend-dot" :style="{ background: seg.color }" />
                </div>
                <span class="donut-legend-label">{{ seg.label }}</span>
                <strong class="donut-legend-val">{{ seg.value }}</strong>
                <span class="donut-legend-pct">{{ total > 0 ? Math.round((seg.value / total) * 100) : 0 }}%</span>
            </div>
        </div>
    </div>
</template>

<style scoped>
.donut-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.25rem;
    width: 100%;
}
.donut-chart-area {
    position: relative;
    filter: drop-shadow(0 8px 24px rgba(20,78,143,.1));
}
.donut-svg {
    display: block;
    overflow: visible;
}
.donut-segment {
    cursor: pointer;
}
.donut-legend {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.donut-legend-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: default;
    transition: background .15s ease, transform .15s ease;
    border: 1px solid transparent;
}
.donut-legend-row.is-hovered {
    background: rgba(255,255,255,.7);
    border-color: rgba(210,175,100,.28);
    transform: translateX(3px);
}
.donut-legend-dot-wrap {
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}
.donut-legend-dot {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: block;
    box-shadow: 0 2px 6px rgba(0,0,0,.15);
    transition: transform .15s ease;
}
.donut-legend-row.is-hovered .donut-legend-dot {
    transform: scale(1.3);
}
.donut-legend-label {
    flex: 1;
    font-size: 0.8125rem;
    color: #6b7280;
    font-family: var(--tc-font-body, sans-serif);
    font-weight: 500;
}
.donut-legend-row.is-hovered .donut-legend-label {
    color: #1f2937;
    font-weight: 600;
}
.donut-legend-val {
    font-size: 0.9rem;
    font-weight: 800;
    color: #1a2e44;
    font-family: var(--tc-font-body, sans-serif);
}
.donut-legend-pct {
    font-size: 0.72rem;
    color: #9ca3af;
    font-family: var(--tc-font-body, sans-serif);
    width: 30px;
    text-align: right;
}
.donut-center-enter-active, .donut-center-leave-active {
    transition: opacity .15s ease;
}
.donut-center-enter-from, .donut-center-leave-to {
    opacity: 0;
}
</style>
