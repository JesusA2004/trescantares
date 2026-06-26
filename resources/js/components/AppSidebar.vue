<script setup lang="ts">
import { Link, router, usePage } from '@inertiajs/vue3';
import {
    BarChart3,
    Boxes,
    Briefcase,
    Globe,
    LayoutDashboard,
    LogOut,
    Settings,
    ShieldCheck,
    Tag,
    Users,
    UtensilsCrossed,
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUrl } from '@/composables/useCurrentUrl';
import { usePermissions } from '@/composables/usePermissions';
import { logoTresCantares } from '@/lib/tres-cantares-assets';
import { logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

const open = ref(false);
const page = usePage();
const { isCurrentOrParentUrl } = useCurrentUrl();
const { can } = usePermissions();

const user = computed(() => (page.props as any).auth?.user ?? null);

// Enabled modules from props (shared via HandleInertiaRequests)
const enabledModules = computed<string[]>(() => (page.props as any).enabledModules ?? []);

function moduleEnabled(slug: string): boolean {
    return enabledModules.value.includes(slug);
}

const navGroups = computed(() => [
    {
        label: 'Principal',
        items: [
            { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view', module: 'dashboard' },
        ],
    },
    {
        label: 'Contenido',
        items: [
            { title: 'Categorías', href: '/admin/categories', icon: Tag, permission: 'categories.view', module: 'categories' },
            { title: 'Platillos', href: '/admin/menu-items', icon: UtensilsCrossed, permission: 'menu.view', module: 'menu' },
        ],
    },
    {
        label: 'Personas',
        items: [
            { title: 'Usuarios', href: '/admin/users', icon: Users, permission: 'users.view', module: 'users' },
            { title: 'Roles', href: '/admin/roles', icon: ShieldCheck, permission: 'roles.view', module: 'roles' },
        ],
    },
    {
        label: 'Operaciones',
        items: [
            { title: 'Reportes', href: '/admin/reports', icon: BarChart3, permission: 'reports.view', module: 'reports' },
            { title: 'Bolsa de Trabajo', href: '/admin/jobs', icon: Briefcase, permission: 'jobs.view', module: 'jobs' },
        ],
    },
    {
        label: 'Sistema',
        items: [
            { title: 'Módulos', href: '/admin/modules', icon: Boxes, permission: 'modules.view', module: 'modules' },
            { title: 'Configuración', href: '/admin/settings', icon: Settings, permission: 'settings.view', module: 'settings' },
        ],
    },
]);

// Filter: item is visible if user has permission AND module is enabled
function itemVisible(item: { permission: string; module: string }): boolean {
    return can(item.permission) && moduleEnabled(item.module);
}

// Filter groups to only those that have at least one visible item
const visibleGroups = computed(() =>
    navGroups.value
        .map((g) => ({ ...g, items: g.items.filter(itemVisible) }))
        .filter((g) => g.items.length > 0),
);

function handleLogout() {
    router.flushAll();
}
</script>

<template>
    <aside
        class="tc-msidebar"
        :class="{ 'tc-msidebar--open': open }"
        @mouseenter="open = true"
        @mouseleave="open = false"
    >
        <!-- Logo header -->
        <div class="tc-msidebar-header">
            <Link href="/dashboard" class="tc-msidebar-logo-link">
                <img :src="logoTresCantares" alt="TC" class="tc-msidebar-logo" style="filter: none;" />
                <Transition name="tc-sidebar-fade">
                    <div v-if="open" class="tc-msidebar-brand">
                        <span class="tc-msidebar-brand-name">Tres Cantares</span>
                        <span class="tc-msidebar-brand-sub">Panel administrativo</span>
                    </div>
                </Transition>
            </Link>
        </div>

        <!-- Nav -->
        <nav class="tc-msidebar-nav">
            <template v-for="(group, idx) in visibleGroups" :key="group.label">
                <div v-if="idx > 0" class="tc-msidebar-sep" />

                <Transition name="tc-sidebar-fade">
                    <span v-if="open" class="tc-msidebar-group-label">{{ group.label }}</span>
                </Transition>

                <div class="tc-msidebar-items">
                    <Link
                        v-for="item in group.items"
                        :key="item.href"
                        :href="item.href"
                        class="tc-msidebar-item"
                        :class="{ 'is-active': isCurrentOrParentUrl(item.href) }"
                    >
                        <component :is="item.icon" class="tc-msidebar-icon" />
                        <span v-if="open" class="tc-msidebar-item-label">{{ item.title }}</span>
                        <span v-else class="tc-msidebar-tooltip">{{ item.title }}</span>
                    </Link>
                </div>
            </template>
        </nav>

        <!-- Footer -->
        <div class="tc-msidebar-footer">
            <div class="tc-msidebar-sep" />

            <a href="/" target="_blank" rel="noopener" class="tc-msidebar-item tc-msidebar-item--muted">
                <Globe class="tc-msidebar-icon" />
                <span v-if="open" class="tc-msidebar-item-label">Ver sitio</span>
                <span v-else class="tc-msidebar-tooltip">Ver sitio</span>
            </a>

            <DropdownMenu>
                <DropdownMenuTrigger as-child>
                    <button type="button" class="tc-msidebar-user">
                        <div class="tc-msidebar-avatar">
                            {{ user?.name?.charAt(0)?.toUpperCase() ?? 'U' }}
                        </div>
                        <Transition name="tc-sidebar-fade">
                            <div v-if="open" class="tc-msidebar-user-info">
                                <span class="tc-msidebar-user-name">{{ user?.name }}</span>
                                <span class="tc-msidebar-user-email">{{ user?.email }}</span>
                            </div>
                        </Transition>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" :side-offset="10" align="end" class="min-w-52">
                    <div class="px-3 py-2 text-sm">
                        <p class="font-semibold text-gray-800 dark:text-[#fff7e6]">{{ user?.name }}</p>
                        <p class="text-xs text-gray-400 dark:text-white/55 truncate">{{ user?.email }}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem :as-child="true">
                        <Link :href="editProfile()" class="flex items-center gap-2 cursor-pointer">
                            <Settings class="w-4 h-4" />
                            Perfil
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem :as-child="true">
                        <Link
                            :href="logout()"
                            as="button"
                            class="flex items-center gap-2 cursor-pointer w-full text-red-600"
                            @click="handleLogout"
                        >
                            <LogOut class="w-4 h-4" />
                            Cerrar sesión
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </aside>
</template>
