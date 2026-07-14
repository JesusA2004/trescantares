import { ref } from 'vue';
import { useNotify } from '@/composables/useNotify';

export interface DragSortItem {
    id: number;
}

interface ZoneState<T extends DragSortItem> {
    key: string;
    items: T[];
    el: HTMLElement;
}

/**
 * Reorder / move items across one or more lists ("zones") using Pointer Events,
 * so it works with mouse, touch and pen without any external drag-and-drop library.
 *
 * `onCommit` must return a promise tied to the actual server request (resolve on
 * success, reject on failure) — `saving` stays true until it settles, and a
 * rejection reverts the zones to their pre-drag order and surfaces an error toast.
 */
export function useDragSort<T extends DragSortItem>(
    onCommit: (zones: Record<string, T[]>) => Promise<unknown>,
) {
    const zones = new Map<string, ZoneState<T>>();
    const dragging = ref<{ item: T; fromZone: string } | null>(null);
    const overZone = ref<string | null>(null);
    const overIndex = ref<number | null>(null);
    const saving = ref(false);

    function registerZone(key: string, items: T[], el: HTMLElement) {
        zones.set(key, { key, items, el });
    }

    function unregisterZone(key: string) {
        zones.delete(key);
    }

    function findTarget(
        clientX: number,
        clientY: number,
    ): { zone: string; index: number } | null {
        for (const [key, zone] of zones) {
            const rect = zone.el.getBoundingClientRect();

            if (
                clientX < rect.left - 40 ||
                clientX > rect.right + 40 ||
                clientY < rect.top ||
                clientY > rect.bottom
            ) {
                continue;
            }

            const rows = Array.from(
                zone.el.querySelectorAll<HTMLElement>('[data-drag-row]'),
            );
            let index = rows.length;

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i].getBoundingClientRect();
                const mid = r.top + r.height / 2;

                if (clientY < mid) {
                    index = i;
                    break;
                }
            }

            return { zone: key, index };
        }

        return null;
    }

    function start(item: T, fromZone: string, event: PointerEvent) {
        // Ignora un nuevo arrastre mientras el orden anterior sigue guardándose,
        // para no disparar solicitudes de reordenamiento simultáneas.
        if (saving.value) {
            return;
        }

        event.preventDefault();
        dragging.value = { item, fromZone };
        overZone.value = fromZone;
        const zone = zones.get(fromZone);
        overIndex.value = zone
            ? zone.items.findIndex((i) => i.id === item.id)
            : null;

        const beforeSnapshot: Record<string, T[]> = {};
        zones.forEach((z, key) => {
            beforeSnapshot[key] = [...z.items];
        });

        const move = (e: PointerEvent) => {
            const target = findTarget(e.clientX, e.clientY);

            if (!target || !dragging.value) {
                return;
            }

            overZone.value = target.zone;
            overIndex.value = target.index;

            const fromZoneState = zones.get(dragging.value.fromZone);
            const toZoneState = zones.get(target.zone);

            if (!fromZoneState || !toZoneState) {
                return;
            }

            const currentIndex = fromZoneState.items.findIndex(
                (i) => i.id === dragging.value!.item.id,
            );

            if (currentIndex === -1) {
                return;
            }

            if (dragging.value.fromZone === target.zone) {
                if (
                    currentIndex === target.index ||
                    currentIndex === target.index - 1
                ) {
                    return;
                }

                const [moved] = fromZoneState.items.splice(currentIndex, 1);
                const insertAt =
                    target.index > currentIndex
                        ? target.index - 1
                        : target.index;
                fromZoneState.items.splice(insertAt, 0, moved);
            } else {
                const [moved] = fromZoneState.items.splice(currentIndex, 1);
                toZoneState.items.splice(target.index, 0, moved);
                dragging.value.fromZone = target.zone;
            }
        };

        const up = () => {
            document.removeEventListener('pointermove', move);
            document.removeEventListener('pointerup', up);
            document.removeEventListener('pointercancel', up);
            dragging.value = null;
            overZone.value = null;
            overIndex.value = null;

            const afterSnapshot: Record<string, T[]> = {};
            zones.forEach((z, key) => {
                afterSnapshot[key] = [...z.items];
            });

            const idsOf = (snap: Record<string, T[]>) =>
                Object.entries(snap).map(([key, items]) => [
                    key,
                    items.map((i) => i.id),
                ]);
            const unchanged =
                JSON.stringify(idsOf(beforeSnapshot)) ===
                JSON.stringify(idsOf(afterSnapshot));

            if (unchanged) {
                return;
            }

            saving.value = true;

            Promise.resolve(onCommit(afterSnapshot))
                .catch(() => {
                    zones.forEach((z, key) => {
                        z.items.splice(
                            0,
                            z.items.length,
                            ...(beforeSnapshot[key] ?? z.items),
                        );
                    });
                    useNotify().error(
                        'No se pudo guardar el nuevo orden. Se restauró el orden anterior.',
                    );
                })
                .finally(() => {
                    saving.value = false;
                });
        };

        document.addEventListener('pointermove', move);
        document.addEventListener('pointerup', up);
        document.addEventListener('pointercancel', up);
    }

    return {
        registerZone,
        unregisterZone,
        start,
        dragging,
        overZone,
        overIndex,
        saving,
    };
}
