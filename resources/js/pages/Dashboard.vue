<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Filter,
    Globe,
    LayoutDashboard,
    Search,
    Star,
    Tag,
    TrendingUp,
    Users,
    UtensilsCrossed,
    X,
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import AdminStatCard from '@/components/admin/AdminStatCard.vue';
import AdminAreaChart from '@/components/admin/charts/AdminAreaChart.vue';
import AdminBarChart from '@/components/admin/charts/AdminBarChart.vue';
import AdminDonutChart from '@/components/admin/charts/AdminDonutChart.vue';
import { dashboard } from '@/routes';

defineOptions({
    layout: {
        breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
    },
});

const props = defineProps<{
    stats: {
        totalItems: number;
        activeItems: number;
        inactiveItems: number;
        featuredItems: number;
        totalCategories: number;
        activeCategories: number;
        totalUsers: number;
        activeModules: number;
        totalModules: number;
    };
    alerts: {
        itemsWithoutImage: number;
        itemsWithoutPrice: number;
        categoriesEmpty: number;
    };
    byCategory: { name: string; total: number; active: number }[];
    recentItems: {
        id: number;
        name: string;
        category: string | null;
        price: number;
        is_active: boolean;
        is_featured: boolean;
        image_url: string | null;
        updated_at: string;
    }[];
    recentUsers: {
        id: number;
        name: string;
        email: string;
        roles: string[];
        created_at: string;
    }[];
    dailyActivity: { label: string; count: number }[];
}>();

// ── Filtros reactivos ─────────────────────────────
const filterStatus = ref<'all' | 'active' | 'inactive'>('all');
const filterFeatured = ref<'all' | 'yes' | 'no'>('all');
const filterCatSearch = ref('');

function clearFilters() {
    filterStatus.value = 'all';
    filterFeatured.value = 'all';
    filterCatSearch.value = '';
}

const hasActiveFilters = computed(
    () => filterStatus.value !== 'all' || filterFeatured.value !== 'all' || filterCatSearch.value !== '',
);

const filteredItems = computed(() =>
    props.recentItems.filter((item) => {
        if (filterStatus.value === 'active' && !item.is_active) return false;
        if (filterStatus.value === 'inactive' && item.is_active) return false;
        if (filterFeatured.value === 'yes' && !item.is_featured) return false;
        if (filterFeatured.value === 'no' && item.is_featured) return false;
        return true;
    }),
);

const barData = computed(() => {
    const q = filterCatSearch.value.trim().toLowerCase();
    const list = q ? props.byCategory.filter((c) => c.name.toLowerCase().includes(q)) : props.byCategory;
    return list.map((c) => ({ label: c.name, value: c.total, subValue: c.active }));
});

const donutSegments = computed(() => {
    const active = filterStatus.value === 'inactive' ? 0 : props.stats.activeItems;
    const inactive = filterStatus.value === 'active' ? 0 : props.stats.inactiveItems;
    return [
        { label: 'Activos', value: active, color: '#6D4CFF' },
        { label: 'Inactivos', value: inactive, color: '#F87171' },
    ].filter((s) => s.value > 0);
});

const roleColors: Record<string, string> = {
    'super-admin': 'tc-badge-purple',
    admin: 'tc-badge-blue',
    editor: 'tc-badge-green',
    rrhh: 'tc-badge-yellow',
    viewer: 'tc-badge-gray',
};
function roleClass(r: string) { return roleColors[r] ?? 'tc-badge-gray'; }

const hasAlerts = computed(
    () => props.alerts.itemsWithoutImage > 0 || props.alerts.itemsWithoutPrice > 0 || props.alerts.categoriesEmpty > 0,
);
</script>

<template>
    <Head title="Dashboard" />

    <div class="space-y-5">

        <AdminPageHeader title="Dashboard" description="Resumen del sistema Tres Cantares">
            <template #label>Panel principal</template>
            <template #actions>
                <a href="/" target="_blank" class="tc-btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                    <Globe class="w-3.5 h-3.5" />
                    Ver Sitio
                </a>
            </template>
        </AdminPageHeader>

        <!-- Alertas -->
        <div v-if="hasAlerts" class="space-y-2">
            <div v-if="alerts.itemsWithoutImage > 0" class="tc-alert-warning">
                <AlertTriangle class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                    <strong>{{ alerts.itemsWithoutImage }}</strong> platillo{{ alerts.itemsWithoutImage > 1 ? 's' : '' }} activo{{ alerts.itemsWithoutImage > 1 ? 's' : '' }} sin imagen.
                    <Link href="/admin/menu-items" class="underline ml-1 font-semibold">Revisar →</Link>
                </span>
            </div>
            <div v-if="alerts.itemsWithoutPrice > 0" class="tc-alert-warning">
                <AlertTriangle class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                    <strong>{{ alerts.itemsWithoutPrice }}</strong> platillo{{ alerts.itemsWithoutPrice > 1 ? 's' : '' }} sin precio.
                    <Link href="/admin/menu-items" class="underline ml-1 font-semibold">Revisar →</Link>
                </span>
            </div>
            <div v-if="alerts.categoriesEmpty > 0" class="tc-alert-warning">
                <AlertTriangle class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                    <strong>{{ alerts.categoriesEmpty }}</strong> categoría{{ alerts.categoriesEmpty > 1 ? 's' : '' }} sin platillos.
                    <Link href="/admin/categories" class="underline ml-1 font-semibold">Revisar →</Link>
                </span>
            </div>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            <AdminStatCard label="Total platillos" :value="stats.totalItems" :icon="UtensilsCrossed" color="blue" href="/admin/menu-items" />
            <AdminStatCard label="Platillos activos" :value="stats.activeItems" :icon="CheckCircle2" color="green" href="/admin/menu-items" />
            <AdminStatCard label="Destacados" :value="stats.featuredItems" :icon="Star" color="yellow" href="/admin/menu-items" />
            <AdminStatCard label="Categorías" :value="stats.totalCategories" :icon="Tag" color="pink" href="/admin/categories" />
            <AdminStatCard label="Cat. activas" :value="stats.activeCategories" :icon="BookOpen" color="green" href="/admin/categories" />
            <AdminStatCard label="Usuarios" :value="stats.totalUsers" :icon="Users" color="blue" href="/admin/users" />
            <AdminStatCard label="Módulos activos" :value="stats.activeModules" :icon="LayoutDashboard" color="pink" href="/admin/modules" />
            <AdminStatCard label="Sin imagen" :value="alerts.itemsWithoutImage" :icon="AlertTriangle" color="yellow" href="/admin/menu-items" />
        </div>

        <!-- Activity area chart -->
        <div class="tc-admin-card p-5">
            <div class="flex items-center justify-between mb-3">
                <h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                    <TrendingUp class="w-4 h-4" style="color:#6D4CFF" />
                    Actividad del menú — últimos 14 días
                </h3>
                <span class="text-xs text-gray-400">actualizaciones</span>
            </div>
            <AdminAreaChart :data="dailyActivity" color="#6D4CFF" gradient-from="#6D4CFF" />
        </div>

        <!-- Filtros -->
        <div class="tc-admin-card p-4">
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest flex-shrink-0">
                    <Filter class="w-3.5 h-3.5" />
                    Filtros
                </div>
                <select v-model="filterStatus" class="tc-toolbar-select">
                    <option value="all">Todos los estados</option>
                    <option value="active">Solo activos</option>
                    <option value="inactive">Solo inactivos</option>
                </select>
                <select v-model="filterFeatured" class="tc-toolbar-select">
                    <option value="all">Todos</option>
                    <option value="yes">Solo destacados</option>
                    <option value="no">Sin destacar</option>
                </select>
                <div class="tc-toolbar-search" style="flex:1; min-width:150px; max-width:260px">
                    <Search class="w-3.5 h-3.5 flex-shrink-0" />
                    <input v-model="filterCatSearch" placeholder="Filtrar en gráfica…" />
                </div>
                <button
                    v-if="hasActiveFilters"
                    type="button"
                    class="tc-btn-ghost border border-gray-200 text-xs py-1.5 px-2.5 flex items-center gap-1"
                    @click="clearFilters"
                >
                    <X class="w-3 h-3" />
                    Limpiar
                </button>
            </div>
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Bar chart — categorías -->
            <div class="lg:col-span-2 tc-admin-card p-5">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <BarChart3 class="w-4 h-4 text-[var(--tc-blue)]" />
                        Platillos por categoría
                        <span v-if="filterCatSearch" class="tc-badge tc-badge-blue text-[10px]">filtrado</span>
                    </h3>
                    <span class="text-xs text-gray-400 tabular-nums">{{ barData.length }} cat.</span>
                </div>
                <AdminBarChart
                    :data="barData"
                    color-from="#6D4CFF"
                    color-to="#5B8CFF"
                    :show-sub-value="true"
                    sub-label="activos"
                >
                    <template #empty>
                        <div class="flex flex-col items-center py-10 text-gray-300">
                            <Tag class="w-8 h-8 mb-2" />
                            <span class="text-sm text-gray-400">
                                Sin resultados{{ filterCatSearch ? ` para "${filterCatSearch}"` : '' }}
                            </span>
                        </div>
                    </template>
                </AdminBarChart>
            </div>

            <!-- Donut — estados -->
            <div class="tc-admin-card p-5 flex flex-col">
                <h3 class="font-semibold text-gray-700 text-sm mb-5 flex items-center gap-2">
                    Estado del menú
                    <span v-if="filterStatus !== 'all'" class="tc-badge tc-badge-blue text-[10px]">filtrado</span>
                </h3>
                <div class="flex-1 flex items-center justify-center">
                    <AdminDonutChart
                        :segments="donutSegments"
                        :total="stats.totalItems"
                        center-label="platillos"
                        :size="150"
                        :stroke-width="20"
                    />
                </div>
            </div>
        </div>

        <!-- Tables -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

            <!-- Platillos recientes (filtrados) -->
            <div class="tc-admin-card overflow-hidden">
                <div class="flex items-center justify-between px-5 pt-4 pb-0">
                    <h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <UtensilsCrossed class="w-4 h-4 text-[var(--tc-blue)]" />
                        Platillos recientes
                        <span
                            v-if="hasActiveFilters && filteredItems.length !== recentItems.length"
                            class="tc-badge tc-badge-blue text-[10px]"
                        >
                            {{ filteredItems.length }}/{{ recentItems.length }}
                        </span>
                    </h3>
                    <Link href="/admin/menu-items" class="text-xs text-[var(--tc-blue)] hover:underline font-medium">Ver todos →</Link>
                </div>
                <div class="divide-y divide-[#f3ede0] dark:divide-white/[0.08] mt-3">
                    <div
                        v-for="item in filteredItems"
                        :key="item.id"
                        class="flex items-center gap-3 px-5 py-3 hover:bg-[#f7f7f8] dark:hover:bg-[#262626] transition-colors group"
                    >
                        <div class="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-[#f0e8d8] flex-shrink-0">
                            <img v-if="item.image_url" :src="item.image_url" :alt="item.name"
                                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <UtensilsCrossed class="w-4 h-4 text-gray-300" />
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1">
                                <p class="text-sm font-medium text-gray-800 truncate">{{ item.name }}</p>
                                <Star v-if="item.is_featured" class="w-3 h-3 text-yellow-400 flex-shrink-0" />
                            </div>
                            <p class="text-xs text-gray-400 truncate">{{ item.category ?? '—' }}</p>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="text-sm font-bold text-gray-700 tabular-nums">${{ Number(item.price).toFixed(2) }}</p>
                            <span class="tc-badge text-[10px]" :class="item.is_active ? 'tc-badge-green' : 'tc-badge-red'">
                                {{ item.is_active ? 'Activo' : 'Inactivo' }}
                            </span>
                        </div>
                    </div>
                    <div v-if="filteredItems.length === 0" class="px-5 py-12 text-center">
                        <UtensilsCrossed class="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p class="text-sm text-gray-400">Sin resultados con los filtros aplicados.</p>
                    </div>
                </div>
            </div>

            <!-- Usuarios recientes -->
            <div class="tc-admin-card overflow-hidden">
                <div class="flex items-center justify-between px-5 pt-4 pb-0">
                    <h3 class="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <Users class="w-4 h-4 text-[var(--tc-blue)]" />
                        Usuarios recientes
                    </h3>
                    <Link href="/admin/users" class="text-xs text-[var(--tc-blue)] hover:underline font-medium">Ver todos →</Link>
                </div>
                <div class="divide-y divide-[#f3ede0] dark:divide-white/[0.08] mt-3">
                    <div
                        v-for="user in recentUsers"
                        :key="user.id"
                        class="flex items-center gap-3 px-5 py-3 hover:bg-[#f7f7f8] dark:hover:bg-[#262626] transition-colors"
                    >
                        <div
                            class="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                            style="background: linear-gradient(135deg, #6D4CFF, #5B8CFF)"
                        >
                            {{ user.name.charAt(0).toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-800 truncate">{{ user.name }}</p>
                            <p class="text-xs text-gray-400 truncate">{{ user.email }}</p>
                        </div>
                        <div class="flex flex-col items-end gap-1 flex-shrink-0">
                            <span
                                v-for="role in user.roles.slice(0, 1)"
                                :key="role"
                                class="tc-badge text-[10px]"
                                :class="roleClass(role)"
                            >
                                {{ role }}
                            </span>
                            <span class="text-[10px] text-gray-400 tabular-nums">{{ user.created_at }}</span>
                        </div>
                    </div>
                    <div v-if="recentUsers.length === 0" class="px-5 py-12 text-center">
                        <Users class="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p class="text-sm text-gray-400">No hay usuarios registrados.</p>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
