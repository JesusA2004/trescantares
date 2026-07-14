<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';

export interface MenuNavItem {
    id: number | null;
    label: string;
    fullLabel: string;
}

defineProps<{
    items: MenuNavItem[];
    activeId: number | null;
}>();

const emit = defineEmits<{ navigate: [number | null] }>();

// `mounted` solo pasa a true en el cliente, después de completar la
// hidratación (onMounted nunca se ejecuta en el servidor). El <Teleport>
// del drawer se renderiza exclusivamente cuando mounted === true: así el
// árbol SSR y el primer render del cliente (ambos con mounted === false,
// sin ningún nodo de Teleport) son idénticos y no hay mismatch de
// hidratación. El resto del componente (nav de escritorio y pestaña móvil)
// no depende de ninguna API de navegador y puede renderizarse igual en
// servidor y cliente, así que se muestra siempre — solo el CSS (@media)
// decide cuál se ve.
const mounted = ref(false);
const drawerOpen = ref(false);
const drawerRef = ref<HTMLElement>();
const tabRef = ref<HTMLButtonElement>();

function select(id: number | null) {
    emit('navigate', id);
    drawerOpen.value = false;
}

function openDrawer() {
    drawerOpen.value = true;
}

function closeDrawer() {
    drawerOpen.value = false;
    tabRef.value?.focus();
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && drawerOpen.value) {
        closeDrawer();
    }
}

watch(drawerOpen, (open) => {
    if (!mounted.value) {
        return;
    }

    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
        nextTick(() => {
            drawerRef.value?.querySelector<HTMLElement>('button')?.focus();
        });
    }
});

onMounted(() => {
    mounted.value = true;
    window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown);
    document.body.style.overflow = '';
});
</script>

<template>
    <!-- Escritorio: navegación lateral discreta, tipo menú de videojuego -->
    <nav class="tc-mp-sidenav" aria-label="Secciones del menú">
        <button
            v-for="item in items"
            :key="item.id ?? 'inicio'"
            type="button"
            class="tc-mp-sidenav-item"
            :class="{ 'tc-mp-sidenav-item--active': item.id === activeId }"
            :aria-label="item.fullLabel"
            :aria-current="item.id === activeId ? 'true' : undefined"
            @click="select(item.id)"
        >
            <span class="tc-mp-sidenav-dot" aria-hidden="true" />
            <span>{{ item.label }}</span>
        </button>
    </nav>

    <!-- Móvil / tablet: pestaña vertical que abre un drawer delgado -->
    <button
        ref="tabRef"
        type="button"
        class="tc-mp-navtab"
        aria-label="Abrir menú de secciones"
        aria-haspopup="true"
        :aria-expanded="drawerOpen"
        @click="openDrawer"
    >
        Menú
    </button>

    <Teleport v-if="mounted" to="body">
        <Transition name="tc-mp-navdrawer-overlay">
            <div
                v-if="drawerOpen"
                class="tc-mp-navdrawer-overlay"
                @click="closeDrawer"
            />
        </Transition>
        <Transition name="tc-mp-navdrawer">
            <div
                v-if="drawerOpen"
                ref="drawerRef"
                class="tc-mp-navdrawer"
                role="dialog"
                aria-modal="true"
                aria-label="Secciones del menú"
            >
                <button
                    v-for="item in items"
                    :key="item.id ?? 'inicio'"
                    type="button"
                    class="tc-mp-navdrawer-item"
                    :class="{
                        'tc-mp-navdrawer-item--active': item.id === activeId,
                    }"
                    @click="select(item.id)"
                >
                    {{ item.fullLabel }}
                </button>
            </div>
        </Transition>
    </Teleport>
</template>
