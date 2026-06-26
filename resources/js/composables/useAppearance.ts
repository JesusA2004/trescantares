import type { ComputedRef, Ref } from 'vue';
import { computed, onMounted, ref } from 'vue';
import type { Appearance, ResolvedAppearance } from '@/types';

export type { Appearance, ResolvedAppearance };

export type UseAppearanceReturn = {
    appearance: Ref<Appearance>;
    resolvedAppearance: ComputedRef<ResolvedAppearance>;
    updateAppearance: (value: Appearance) => void;
};

const APPEARANCE_KEY = 'appearance';
const VALID: Appearance[] = ['light', 'dark', 'system'];

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
}

function writeCookie(name: string, value: string): void {
    if (typeof document === 'undefined') return;
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

function getStoredAppearance(): Appearance {
    if (typeof window === 'undefined') return 'system';
    const local = localStorage.getItem(APPEARANCE_KEY);
    const cookie = getCookie(APPEARANCE_KEY);
    const raw = local || cookie || 'system';
    return VALID.includes(raw as Appearance) ? (raw as Appearance) : 'system';
}

function applyAppearance(value: Appearance): void {
    if (typeof window === 'undefined') return;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = value === 'dark' || (value === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
    document.documentElement.dataset.appearance = value;
}

// Module-level singleton — shared across all useAppearance() calls
const appearance = ref<Appearance>('system');

export function setAppearance(value: Appearance): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(APPEARANCE_KEY, value);
    writeCookie(APPEARANCE_KEY, value);
    applyAppearance(value);
    appearance.value = value;
}

export function initializeAppearance(): void {
    if (typeof window === 'undefined') return;
    const value = getStoredAppearance();
    applyAppearance(value);
    appearance.value = value;

    // .onchange prevents duplicate listeners if called more than once
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    media.onchange = () => {
        const current = getStoredAppearance();
        if (current === 'system') {
            applyAppearance('system');
        }
    };
}

// Backward-compat alias (app.ts calls initializeTheme)
export const initializeTheme = initializeAppearance;

const prefersDark = (): boolean => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function useAppearance(): UseAppearanceReturn {
    onMounted(() => {
        appearance.value = getStoredAppearance();
    });

    const resolvedAppearance = computed<ResolvedAppearance>(() =>
        appearance.value === 'system'
            ? (prefersDark() ? 'dark' : 'light')
            : appearance.value,
    );

    return {
        appearance,
        resolvedAppearance,
        updateAppearance: setAppearance,
    };
}
