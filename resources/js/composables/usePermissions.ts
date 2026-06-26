import { usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

export function usePermissions() {
    const page = usePage();

    const permissions = computed<string[]>(
        () => (page.props.auth as any)?.permissions ?? [],
    );

    const roles = computed<string[]>(
        () => (page.props.auth as any)?.roles ?? [],
    );

    function can(permission: string): boolean {
        if (roles.value.includes('super-admin')) return true;
        return permissions.value.includes(permission);
    }

    function hasRole(role: string): boolean {
        return roles.value.includes(role);
    }

    function canAny(...perms: string[]): boolean {
        return perms.some((p) => can(p));
    }

    function canAll(...perms: string[]): boolean {
        return perms.every((p) => can(p));
    }

    return { can, hasRole, canAny, canAll, permissions, roles };
}
