<script setup lang="ts">
import { Head, router } from '@inertiajs/vue3';
import {
    AlertCircle,
    BarChart3,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    FileText,
    ImageOff,
    Star,
    Tag,
    TrendingUp,
    UtensilsCrossed,
} from 'lucide-vue-next';
import { computed, ref } from 'vue';
import AdminPageHeader from '@/components/admin/AdminPageHeader.vue';
import AdminStatCard from '@/components/admin/AdminStatCard.vue';
import Can from '@/components/admin/Can.vue';
import AdminBarChart from '@/components/admin/charts/AdminBarChart.vue';
import AdminDonutChart from '@/components/admin/charts/AdminDonutChart.vue';

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
    byCategory: {
        id: number;
        name: string;
        total: number;
        active: number;
        featured: number;
        no_image: number;
    }[];
    recentActivity: {
        id: number;
        name: string;
        category: string | null;
        price: string | number;
        is_active: boolean;
        is_featured: boolean;
        image_url: string | null;
        updated_at: string;
        updated_diff: string;
    }[];
    categories: { id: number; name: string }[];
    availableMonths: string[];
    filters: { month: string; category: string | null; status: string };
}>();

const filterMonth = ref(props.filters.month);
const filterCategory = ref(props.filters.category ?? '');
const filterStatus = ref(props.filters.status ?? 'all');

function applyFilters() {
    router.get(
        '/admin/reports',
        {
            month: filterMonth.value,
            category: filterCategory.value || undefined,
            status:
                filterStatus.value !== 'all' ? filterStatus.value : undefined,
        },
        { preserveState: true, preserveScroll: true },
    );
}

function exportParams() {
    const params = new URLSearchParams();
    params.set('month', filterMonth.value);

    if (filterCategory.value) {
params.set('category', filterCategory.value);
}

    if (filterStatus.value !== 'all') {
params.set('status', filterStatus.value);
}

    return params.toString();
}

const barData = computed(() =>
    props.byCategory.map((c) => ({
        label: c.name,
        value: c.total,
        subValue: c.active,
    })),
);

const donutSegments = computed(() =>
    [
        { label: 'Activos', value: props.stats.active_items, color: '#22c55e' },
        {
            label: 'Inactivos',
            value: props.stats.inactive_items,
            color: '#db3465',
        },
    ].filter((s) => s.value > 0),
);

function monthLabel(m: string): string {
    const [year, month] = m.split('-');
    const names = [
        'Ene',
        'Feb',
        'Mar',
        'Abr',
        'May',
        'Jun',
        'Jul',
        'Ago',
        'Sep',
        'Oct',
        'Nov',
        'Dic',
    ];

    return `${names[parseInt(month) - 1]} ${year}`;
}

function priceFormat(p: string | number): string {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
    }).format(Number(p));
}
</script>

<template>
    <Head title="Reportes" />

    <div class="tc-admin-page space-y-6">
        <AdminPageHeader
            title="Reportes del menú"
            description="Métricas y actividad de platillos y categorías"
        >
            <template #label>Reportes</template>
            <template #actions>
                <Can permission="reports.export">
                    <a
                        :href="`/admin/reports/export/excel?${exportParams()}`"
                        class="tc-btn-secondary flex items-center gap-1.5 text-sm"
                    >
                        <FileSpreadsheet class="h-3.5 w-3.5" />
                        Excel
                    </a>
                    <a
                        :href="`/admin/reports/export/pdf?${exportParams()}`"
                        class="tc-btn-primary flex items-center gap-1.5 text-sm"
                        target="_blank"
                    >
                        <FileText class="h-3.5 w-3.5" />
                        PDF
                    </a>
                </Can>
            </template>
        </AdminPageHeader>

        <!-- Filters bar -->
        <div class="tc-admin-card p-4">
            <div class="tc-report-filters">
                <div class="tc-report-filter">
                    <label
                        class="mb-1.5 block text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-white/50"
                        >Mes</label
                    >
                    <select
                        v-model="filterMonth"
                        class="tc-report-select"
                        @change="applyFilters"
                    >
                        <option
                            v-for="m in availableMonths"
                            :key="m"
                            :value="m"
                        >
                            {{ monthLabel(m) }}
                        </option>
                    </select>
                </div>
                <div class="tc-report-filter">
                    <label
                        class="mb-1.5 block text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-white/50"
                        >Categoría</label
                    >
                    <select
                        v-model="filterCategory"
                        class="tc-report-select"
                        @change="applyFilters"
                    >
                        <option value="">Todas las categorías</option>
                        <option
                            v-for="c in categories"
                            :key="c.id"
                            :value="c.id"
                        >
                            {{ c.name }}
                        </option>
                    </select>
                </div>
                <div class="tc-report-filter">
                    <label
                        class="mb-1.5 block text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-white/50"
                        >Estado</label
                    >
                    <select
                        v-model="filterStatus"
                        class="tc-report-select"
                        @change="applyFilters"
                    >
                        <option value="all">Todos los estados</option>
                        <option value="active">Solo activos</option>
                        <option value="inactive">Solo inactivos</option>
                    </select>
                </div>
            </div>
        </div>

        <!-- KPI cards -->
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-4">
            <AdminStatCard
                label="Total platillos"
                :value="stats.total_items"
                :icon="UtensilsCrossed"
                color="blue"
            />
            <AdminStatCard
                label="Platillos activos"
                :value="stats.active_items"
                :icon="CheckCircle2"
                color="green"
            />
            <AdminStatCard
                label="Destacados"
                :value="stats.featured_items"
                :icon="Star"
                color="yellow"
            />
            <AdminStatCard
                label="Categorías activas"
                :value="stats.active_categories"
                :icon="Tag"
                color="pink"
            />
        </div>

        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AdminStatCard
                label="Creados este mes"
                :value="createdThisMonth"
                :icon="TrendingUp"
                color="green"
            />
            <AdminStatCard
                label="Actualizados este mes"
                :value="updatedThisMonth"
                :icon="BarChart3"
                color="blue"
            />
            <AdminStatCard
                label="Sin imagen"
                :value="stats.without_image"
                :icon="ImageOff"
                color="yellow"
            />
            <AdminStatCard
                label="Sin precio"
                :value="stats.without_price"
                :icon="AlertCircle"
                color="pink"
            />
        </div>

        <!-- Charts -->
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div class="tc-admin-card p-5 xl:col-span-2">
                <h3
                    class="mb-1 text-sm font-semibold text-gray-700 dark:text-[#fff7e6]"
                >
                    Platillos por categoría
                </h3>
                <p class="mb-4 text-xs text-gray-400 dark:text-white/45">
                    Barras muestran total · La barra interna = activos
                </p>
                <AdminBarChart
                    :data="barData"
                    :show-sub-value="true"
                    sub-label="activos"
                />
            </div>

            <div class="tc-admin-card p-5">
                <h3
                    class="mb-4 text-sm font-semibold text-gray-700 dark:text-[#fff7e6]"
                >
                    Estado del menú
                </h3>
                <AdminDonutChart
                    :segments="donutSegments"
                    :total="stats.total_items"
                    center-label="platillos"
                />
            </div>
        </div>

        <!-- Category breakdown table -->
        <div class="tc-admin-card overflow-hidden">
            <div
                class="border-b border-amber-100/60 bg-gradient-to-r from-amber-50/40 to-transparent px-5 py-4 dark:border-amber-400/15 dark:from-amber-400/8"
            >
                <h3
                    class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6]"
                >
                    Desglose por categoría
                </h3>
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
                            <td class="font-medium text-gray-900">
                                {{ cat.name }}
                            </td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-blue">{{
                                    cat.total
                                }}</span>
                            </td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-green">{{
                                    cat.active
                                }}</span>
                            </td>
                            <td class="text-center">
                                <span class="tc-badge tc-badge-yellow">{{
                                    cat.featured
                                }}</span>
                            </td>
                            <td class="text-center">
                                <span
                                    :class="
                                        cat.no_image > 0
                                            ? 'tc-badge tc-badge-pink'
                                            : 'tc-badge tc-badge-green'
                                    "
                                >
                                    {{ cat.no_image }}
                                </span>
                            </td>
                            <td class="text-center">
                                <div
                                    class="flex items-center justify-center gap-1.5"
                                >
                                    <div
                                        class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100 dark:bg-white/10"
                                    >
                                        <div
                                            class="h-full rounded-full bg-green-400"
                                            :style="{
                                                width:
                                                    cat.total > 0
                                                        ? `${Math.round((cat.active / cat.total) * 100)}%`
                                                        : '0%',
                                            }"
                                        />
                                    </div>
                                    <span class="text-xs text-gray-500"
                                        >{{
                                            cat.total > 0
                                                ? Math.round(
                                                      (cat.active / cat.total) *
                                                          100,
                                                  )
                                                : 0
                                        }}%</span
                                    >
                                </div>
                            </td>
                        </tr>
                        <tr v-if="byCategory.length === 0">
                            <td
                                colspan="6"
                                class="py-8 text-center text-gray-400"
                            >
                                Sin categorías
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Recent activity -->
        <div class="tc-admin-card overflow-hidden">
            <div
                class="flex items-center justify-between border-b border-amber-100/60 bg-gradient-to-r from-amber-50/40 to-transparent px-5 py-4 dark:border-amber-400/15 dark:from-amber-400/8"
            >
                <h3
                    class="text-sm font-semibold text-gray-700 dark:text-[#fff7e6]"
                >
                    Actividad reciente del menú
                </h3>
                <span class="tc-badge tc-badge-gray"
                    >{{ recentActivity.length }} registros</span
                >
            </div>
            <div class="overflow-x-auto">
                <table class="tc-admin-table">
                    <thead>
                        <tr>
                            <th>Platillo</th>
                            <th class="hidden md:table-cell">Categoría</th>
                            <th class="hidden text-right sm:table-cell">
                                Precio
                            </th>
                            <th>Estado</th>
                            <th class="hidden lg:table-cell">
                                Última actualización
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in recentActivity" :key="item.id">
                            <td>
                                <div class="flex items-center gap-2.5">
                                    <div
                                        class="h-8 w-8 flex-shrink-0 overflow-hidden rounded-lg border border-amber-100 bg-amber-50"
                                    >
                                        <img
                                            v-if="item.image_url"
                                            :src="item.image_url"
                                            :alt="item.name"
                                            class="h-full w-full object-cover"
                                        />
                                        <div
                                            v-else
                                            class="flex h-full w-full items-center justify-center"
                                        >
                                            <UtensilsCrossed
                                                class="h-3.5 w-3.5 text-amber-300"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p
                                            class="text-sm font-medium text-gray-900"
                                        >
                                            {{ item.name }}
                                        </p>
                                        <span
                                            v-if="item.is_featured"
                                            class="tc-badge tc-badge-yellow text-[10px]"
                                            >⭐ Destacado</span
                                        >
                                    </div>
                                </div>
                            </td>
                            <td
                                class="hidden text-sm text-gray-500 md:table-cell"
                            >
                                {{ item.category ?? '—' }}
                            </td>
                            <td
                                class="hidden text-right font-semibold text-gray-700 sm:table-cell"
                            >
                                {{ priceFormat(item.price) }}
                            </td>
                            <td>
                                <span
                                    :class="
                                        item.is_active
                                            ? 'tc-badge tc-badge-green'
                                            : 'tc-badge tc-badge-gray'
                                    "
                                >
                                    {{ item.is_active ? 'Activo' : 'Inactivo' }}
                                </span>
                            </td>
                            <td
                                class="hidden text-xs text-gray-400 lg:table-cell"
                            >
                                {{ item.updated_diff }}
                            </td>
                        </tr>
                        <tr v-if="recentActivity.length === 0">
                            <td
                                colspan="5"
                                class="py-8 text-center text-gray-400"
                            >
                                Sin actividad reciente
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
