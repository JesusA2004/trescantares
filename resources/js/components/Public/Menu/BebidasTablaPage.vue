<script setup lang="ts">
import { computed } from 'vue';
import MenuEditableElement from './MenuEditableElement.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import { byZone, categoryElementFor, money } from './types';
import type {
    ElementConfig,
    MenuBreakpoint,
    MenuCategoryData,
    MenuItemData,
} from './types';

const props = withDefaults(
    defineProps<{
        category: MenuCategoryData;
        breakpoint: MenuBreakpoint;
        editable?: boolean;
        selectedKey?: string | null;
    }>(),
    {
        editable: false,
        selectedKey: null,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: ElementConfig];
}>();

function onCommit(key: string, config: ElementConfig) {
    emit('commit', key, config);
}

function onSelect(key: string) {
    emit('select', key);
}

const topTable = computed(() => byZone(props.category.items, 'top_table'));
const conAlcohol = computed(() => byZone(props.category.items, 'con_alcohol'));
const cerveza = computed(() => byZone(props.category.items, 'cerveza'));
const sinAlcohol = computed(() => byZone(props.category.items, 'sin_alcohol'));
const complementos = computed(() =>
    byZone(props.category.items, 'complementos'),
);
const calientes = computed(() => byZone(props.category.items, 'calientes'));

function rowLabel(item: MenuItemData): string {
    return item.name;
}
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
    >
        <MenuEditableElement
            :element-key="`category-${category.id}:title`"
            label="Título Bebidas"
            :config="categoryElementFor(category, 'title', breakpoint)"
            :editable="editable"
            :selected="selectedKey === `category-${category.id}:title`"
            @select="onSelect"
            @commit="onCommit"
        >
            <img
                v-if="category.title_image_url"
                :src="category.title_image_url"
                :alt="category.name"
                class="tc-mp-title-img"
            />
            <h2
                v-else
                class="tc-mp-title-text"
                :style="{
                    color: category.color ?? undefined,
                    '--tc-mp-h': category.color ?? undefined,
                }"
            >
                {{ category.name }}
            </h2>
        </MenuEditableElement>

        <div v-if="topTable.length" class="mt-4">
            <div class="tc-mp-table-head">
                <span>Litros</span>
                <span>Medio litro</span>
            </div>
            <div
                v-for="item in topTable"
                :key="item.id"
                class="tc-mp-table-row"
            >
                <span class="tc-mp-table-row-name">{{ rowLabel(item) }}</span>
                <span class="tc-mp-table-row-prices">
                    <span>${{ money(item.price) }}</span>
                    <span v-if="item.price_secondary"
                        >${{ money(item.price_secondary) }}</span
                    >
                    <span v-else>&nbsp;</span>
                </span>
            </div>
        </div>

        <div v-if="conAlcohol.length" class="tc-mp-table-group mt-5">
            <p class="tc-mp-table-group-title">Con alcohol</p>
            <div class="tc-mp-table-columns tc-mp-table-columns--split">
                <div
                    v-for="item in conAlcohol"
                    :key="item.id"
                    class="tc-mp-table-row"
                >
                    <span class="tc-mp-table-row-name">{{ item.name }}</span>
                    <span class="tc-mp-table-row-prices"
                        ><span>${{ money(item.price) }}</span></span
                    >
                </div>
            </div>
        </div>

        <div class="tc-mp-table-columns tc-mp-table-columns--2 mt-2">
            <div>
                <div class="tc-mp-table-group">
                    <p class="tc-mp-table-group-title">Cerveza</p>
                    <div
                        v-for="item in cerveza"
                        :key="item.id"
                        class="tc-mp-table-row"
                    >
                        <span class="tc-mp-table-row-name">{{
                            item.name
                        }}</span>
                        <span class="tc-mp-table-row-prices"
                            ><span>${{ money(item.price) }}</span></span
                        >
                    </div>
                </div>
                <div class="tc-mp-table-group">
                    <p class="tc-mp-table-group-title">Sin alcohol</p>
                    <div
                        v-for="item in sinAlcohol"
                        :key="item.id"
                        class="tc-mp-table-row"
                    >
                        <span class="tc-mp-table-row-name">{{
                            item.name
                        }}</span>
                        <span class="tc-mp-table-row-prices"
                            ><span>${{ money(item.price) }}</span></span
                        >
                    </div>
                </div>
            </div>
            <div>
                <div class="tc-mp-table-group">
                    <p class="tc-mp-table-group-title">Complementos</p>
                    <div
                        v-for="item in complementos"
                        :key="item.id"
                        class="tc-mp-table-row"
                    >
                        <span class="tc-mp-table-row-name">{{
                            item.name
                        }}</span>
                        <span class="tc-mp-table-row-prices"
                            ><span>${{ money(item.price) }}</span></span
                        >
                    </div>
                </div>
                <div class="tc-mp-table-group">
                    <p class="tc-mp-table-group-title">Calientes</p>
                    <div
                        v-for="item in calientes"
                        :key="item.id"
                        class="tc-mp-table-row"
                    >
                        <span class="tc-mp-table-row-name">{{
                            item.name
                        }}</span>
                        <span class="tc-mp-table-row-prices"
                            ><span>${{ money(item.price) }}</span></span
                        >
                    </div>
                </div>
                <MenuEditableElement
                    v-if="category.tagline_image_url"
                    :element-key="`category-${category.id}:tagline_image`"
                    label="Mesa y momento"
                    :config="
                        categoryElementFor(
                            category,
                            'tagline_image',
                            breakpoint,
                        )
                    "
                    :editable="editable"
                    :selected="
                        selectedKey === `category-${category.id}:tagline_image`
                    "
                    @select="onSelect"
                    @commit="onCommit"
                >
                    <img
                        :src="category.tagline_image_url"
                        :alt="category.tagline_sub ?? ''"
                        class="mx-auto mt-2.5 block w-full max-w-[200px]"
                    />
                </MenuEditableElement>
            </div>
        </div>
    </MenuPageFrame>
</template>
