<script setup lang="ts">
import { computed, ref } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import {
    AlertCircle, BarChart3, CheckCircle2, Download, FileSpreadsheet, FileText,
    ImageOff, Star, Tag, TrendingUp, UtensilsCrossed,
} from 'lucide-vue-next';
import AdminStatCard from '@/components/admin/AdminStatCard.vue';
import AdminBarChart from '@/components/admin/charts/AdminBarChart.vue';
import AdminDonutChart from '@/components/admin/charts/AdminDonutChart.vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import Can from '@/components/admin/Can.vue';

const props = defineProps<{
    stats: {
        total_items: number;
        active_items: number;
        inactive_items: number;
        featured_items: number;
        without_image: number;
        without_price: number;
        total_categories: number;
        active_categories: number;
    };
    createdThisMonth: number;
    updatedThisMonth: number;
    byCategory: { id: number; name: string; total: number; active: number; featured: number; no_image: number }[];
    recentActivity: {
        id: number; name: string; category: string | null;
        price: string | number; is_active: boolean; is_featured: boolean;
        image_url: string | null; updated_at: string; updated_diff: string;
    }[];
    categories: { id: number; name: string }[];
    availableMonths: string[];
    filters: { month: string; category: string | null; status: string };
}>();

const filterMonth = ref(props.filters.month);
const filterCategory = ref(props.filters.category ?? '');
const filterStatus = ref(props.filters.status ?? 'all');

function applyFilters() {
    router.get('/admin/reports', {
        month: filterMonth.value,
        category: filterCategory.value || undefined,
        status: filterStatus.value !== 'all' ? filterStatus.value : undefined,
    }, { preserveState: true, preserveScroll: true });
}

function exportParams() {
    const params = new URLSearchParams();
    params.set('month', filterMonth.value);
    if (filterCategory.value) params.set('category', filterCategory.value);
    if (filterStatus.value !== 'all') params.set('status', filterStatus.value);
    return params.toString();
}

const barData = computed(() =>
    props.byCategory.map((c) => ({ label: c.name, value: c.total, subValue: c.active })),
);

const donutSegments = computed(() => [
    { label: 'Activos', value: props.stats.active_items, color: '#22c55e' },
    { label: 'Inactivos', value: props.stats.inactive_items, color: '#db3465' },
].filter((s) => s.value > 0));

function monthLabel(m: string): string {
    const [year, month] = m.split('-');
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${names[parseInt(month) - 1]} ${year}`;
}

function priceFormat(p: string | number): string {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(p));
}
</script>

<template>
    <Head title="Reportes" />

    <div class="tc-admin-page space-y-6">

        <AdminPageHeader title="Reportes del menú" description="Métricas y actividad de platillos y categorías">
            <template #label>Reportes</template>
            <template #actions>
                <Can permission="reports.export">
                    <a :href="`/admin/reports/export/excel?${exportParams()}`" class="tc-btn-secondary text-sm flex items-center gap-1.5">
                        <FileSpreadsheet class="w-3.5 h-3.5" />
                        Excel
                    </a>
                    <a :href="`/admin/reports/export/pdf?${exportParams()}`" class="tc-btn-primary text-sm flex items-center gap-1.5" target="_blank">
                        <FileText class="w-3.5 h-3.5" />
                        PDF
                    </a>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Filters bar -->
        <div class="tc-admin-card p-4">
            <div class="tc-report-filters">
                <div class="tc-report-filter">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1.5">Mes</label>
                    <select v-model="filterMonth" class="tc-report-select" @change="applyFilters">
                        <option v-for="m in availableMonths" :key="m" :value="m">{{ monthLabel(m) }}</option>
                    </select>
                </div>
                <div class="tc-report-filter">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1.5">Categoría</label>
                    <select v-model="filterCategory" class="tc-report-select" @change="applyFilters">
                        <option value="">Todas las categorías</option>
                        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                </div>
                <div class="tc-report-filter">
                    <label class="block text-xs font-semibold text-gray-500 dark:text-white/50 uppercase tracking-wide mb-1.5">Estado</label>
                    <select v-model="filterStatus" class="tc-report-select" @change="applyFilters">
                        <option value="all">Todos los estados</option>
                        <option value="active">Solo activos</option>
                        <option value="inactive">Solo inactivos</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-4">
            <AdminStatCard label="Total platillos" :value="stats.total_items" :icon="UtensilsCrossed" color="blue" />
            <AdminStatCard label="Platillos activos" :value="stats.active_items" :icon="CheckCircle2" color="green" />
            <AdminStatCard label="Destacados" :value="stats.featured_items" :icon="Star" color="yellow" />
            <AdminStatCard label="Categorías activas" :value="stats.active_categories" :icon="Tag" color="pink" />
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminStatCard label="Creados este mes" :value="createdThisMonth" :icon="TrendingUp" color="green" />
            <AdminStatCard label="Actualizados este mes" :value="updatedThisMonth" :icon="BarChart3" color="blue" />
            <AdminStatCard label="Sin imagen" :value="stats.without_image" :icon="ImageOff" color="yellow" />
            <AdminStatCard label="Sin precio" :value="stats.without_price" :icon="AlertCircle" color="pink" />
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div class="tc-admin-card p-5 xl:col-span-2">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6] mb-1">Platillos por categoría</h3>
                <p class="text-xs text-gray-400 dark:text-white/45 mb-4">Barras muestran total · La barra interna = activos</p>
                <AdminBarChart
                    :data="barData"
                    :show-sub-value="true"
                    sub-label="activos"
                />
            </div>

            <div class="tc-admin-card p-5">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6] mb-4">Estado del menú</h3>
                <AdminDonutChart
                    :segments="donutSegments"
                    :total="stats.total_items"
                    center-label="platillos"
                />
            </div>
        </div>

        <!-- Category breakdown table -->
        <div class="tc-admin-card overflow-hidden">
            <div class="px-5 py-4 border-b border-amber-100/60 dark:border-amber-400/15 bg-gradient-to-r from-amber-50/40 dark:from-amber-400/8 to-transparent">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6]">Desglose por categoría</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="tc-admin-table">
                    <thead>
                        <tr>
                            <th>Categoría</th>
                            <th class="text-center">Total</th>
                            <th class="text-center">Activos</th>
                            <th class="text-center">Destacados</th>
                            <th class="text-center">Sin imagen</th>
                            <th class="text-center">% activo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="cat in byCategory" :key="cat.id">
                            <td class="font-medium text-gray-900">{{ cat.name }}</td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-blue">{{ cat.total }}</span>
                            </td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-green">{{ cat.active }}</span>
                            </td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-yellow">{{ cat.featured }}</span>
                            </td>
                            <td class="text-center">
                                <span :class="cat.no_image > 0 ? 'tc-badge tc-badge-pink' : 'tc-badge tc-badge-green'">
                                    {{ cat.no_image }}
                                </span>
                            </td>
                            <td class="text-center">
                                <div class="flex items-center justify-center gap-1.5">
                                    <div class="w-16 h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            class="h-full rounded-full bg-green-400"
                                            :style="{ width: cat.total > 0 ? `${Math.round((cat.active / cat.total) * 100)}%` : '0%' }"
                                        />
                                    </div>
                                    <span class="text-xs text-gray-500">{{ cat.total > 0 ? Math.round((cat.active / cat.total) * 100) : 0 }}%</span>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="byCategory.length === 0">
                            <td colspan="6" class="text-center py-8 text-gray-400">Sin categorías</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent activity -->
        <div class="tc-admin-card overflow-hidden">
            <div class="px-5 py-4 border-b border-amber-100/60 dark:border-amber-400/15 bg-gradient-to-r from-amber-50/40 dark:from-amber-400/8 to-transparent flex items-center justify-between">
                <h3 class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6]">Actividad reciente del menú</h3>
                <span class="tc-badge tc-badge-gray">{{ recentActivity.length }} registros</span>
            </div>
            <div class="overflow-x-auto">
                <table class="tc-admin-table">
                    <thead>
                        <tr>
                            <th>Platillo</th>
                            <th class="hidden md:table-cell">Categoría</th>
                            <th class="hidden sm:table-cell text-right">Precio</th>
                            <th>Estado</th>
                            <th class="hidden lg:table-cell">Última actualización</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in recentActivity" :key="item.id">
                            <td>
                                <div class="flex items-center gap-2.5">
                                    <div class="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-amber-50 border border-amber-100">
                                        <img
                                            v-if="item.image_url"
                                            :src="item.image_url"
                                            :alt="item.name"
                                            class="w-full h-full object-cover"
                                        />
                                        <div v-else class="w-full h-full flex items-center justify-center">
                                            <UtensilsCrossed class="w-3.5 h-3.5 text-amber-300" />
                                        </div>
                                    </div>
                                    <div>
                                        <p class="font-medium text-gray-900 text-sm">{{ item.name }}</p>
                                        <span v-if="item.is_featured" class="tc-badge tc-badge-yellow text-[10px]">⭐ Destacado</span>
                                    </div>
                                </div>
                            </td>
                            <td class="hidden md:table-cell text-gray-500 text-sm">{{ item.category ?? '—' }}</td>
                            <td class="hidden sm:table-cell text-right font-semibold text-gray-700">{{ priceFormat(item.price) }}</td>
                            <td>
                                <span :class="item.is_active ? 'tc-badge tc-badge-green' : 'tc-badge tc-badge-gray'">
                                    {{ item.is_active ? 'Activo' : 'Inactivo' }}
                                </span>
                            </td>
                            <td class="hidden lg:table-cell text-xs text-gray-400">{{ item.updated_diff }}</td>
                        </tr>
                        <tr v-if="recentActivity.length === 0">
                            <td colspan="5" class="text-center py-8 text-gray-400">Sin actividad reciente</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

    </div>
</template>
