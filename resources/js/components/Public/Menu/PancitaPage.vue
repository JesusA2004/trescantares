<script setup lang="ts">
import { computed } from 'vue';
import MenuEditableElement from './MenuEditableElement.vue';
import MenuItemVisual from './MenuItemVisual.vue';
import MenuPageFrame from './MenuPageFrame.vue';
import MenuPriceVisual from './MenuPriceVisual.vue';
import MenuTextVisual from './MenuTextVisual.vue';
import { byZone, categoryElementFor, itemElementFor } from './types';
import type { ElementConfig, MenuBreakpoint, MenuCategoryData } from './types';

const props = withDefaults(
    defineProps<{
        category: MenuCategoryData;
        breakpoint: MenuBreakpoint;
        editable?: boolean;
        selectedKey?: string | null;
        backgroundUrl?: string | null;
    }>(),
    {
        editable: false,
        selectedKey: null,
        backgroundUrl: null,
    },
);

const emit = defineEmits<{
    select: [key: string];
    commit: [key: string, config: ElementConfig];
}>();

function onSelect(key: string) {
    emit('select', key);
}

function onCommit(key: string, config: ElementConfig) {
    emit('commit', key, config);
}

const main = computed(() => byZone(props.category.items, 'main')[0]);
const options = computed(() => byZone(props.category.items, 'option'));
const footer = computed(() => byZone(props.category.items, 'footer')[0]);
</script>

<template>
    <MenuPageFrame
        :primary-color="category.color ?? undefined"
        :secondary-color="category.color_secondary ?? undefined"
        :background-url="backgroundUrl"
    >
        <div class="tc-mp-grid--pancita">
            <MenuEditableElement
                v-if="category.title_image_url"
                :element-key="`category-${category.id}:title_image`"
                label="Título Pancita"
                :config="
                    categoryElementFor(category, 'title_image', breakpoint)
                "
                :editable="editable"
                :selected="
                    selectedKey === `category-${category.id}:title_image`
                "
                kind="image"
                :src="category.title_image_url"
                :alt="category.name"
                img-class="tc-mp-title-img"
                @select="onSelect"
                @commit="onCommit"
            />
            <MenuEditableElement
                v-else
                :element-key="`category-${category.id}:title`"
                label="Título Pancita"
                :config="categoryElementFor(category, 'title', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `category-${category.id}:title`"
                kind="text"
                @select="onSelect"
                @commit="onCommit"
            >
                <h2
                    class="tc-mp-title-text"
                    :style="{
                        color: category.color ?? undefined,
                        '--tc-mp-h': category.color ?? undefined,
                    }"
                >
                    {{ category.name }}
                </h2>
            </MenuEditableElement>

            <MenuEditableElement
                v-if="main"
                :element-key="`item-${main.id}:container`"
                :label="`${main.name} — contenedor`"
                :config="itemElementFor(main, 'container', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `item-${main.id}:container`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-pancita-hero">
                    <div class="tc-mp-pancita-main">
                        <MenuItemVisual
                            :item="main"
                            class="tc-mp-pancita-main-photo"
                            :breakpoint="breakpoint"
                            :editable="editable"
                            :selected-key="selectedKey"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                    </div>

                    <div class="tc-mp-pancita-price">
                        <MenuPriceVisual
                            :element-key="`item-${main.id}:price`"
                            :label="`${main.name} — precio`"
                            :config="itemElementFor(main, 'price', breakpoint)"
                            :value="main.price"
                            :editable="editable"
                            :selected-key="selectedKey"
                            class="tc-mp-price tc-mp-price--xl"
                            :style="{
                                color: category.color_secondary ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        />
                        <MenuTextVisual
                            v-if="main.choice_label"
                            :element-key="`item-${main.id}:choice_label`"
                            :label="`${main.name} — elección`"
                            :config="
                                itemElementFor(main, 'choice_label', breakpoint)
                            "
                            :editable="editable"
                            :selected-key="selectedKey"
                            as="p"
                            class="tc-mp-choice"
                            :style="{
                                color: category.color ?? undefined,
                                '--tc-mp-h': category.color ?? undefined,
                            }"
                            @select="onSelect"
                            @commit="onCommit"
                        >
                            {{ main.choice_label }}
                        </MenuTextVisual>
                    </div>
                </div>
            </MenuEditableElement>

            <div v-if="options.length" class="tc-mp-options-grid">
                <div
                    v-for="opt in options"
                    :key="opt.id"
                    class="tc-mp-option-item"
                >
                    <MenuItemVisual
                        :item="opt"
                        class="tc-mp-option-photo"
                        :breakpoint="breakpoint"
                        :editable="editable"
                        :selected-key="selectedKey"
                        @select="onSelect"
                        @commit="onCommit"
                    />
                    <MenuTextVisual
                        :element-key="`item-${opt.id}:name`"
                        :label="`${opt.name} — nombre`"
                        :config="itemElementFor(opt, 'name', breakpoint)"
                        :editable="editable"
                        :selected-key="selectedKey"
                        as="p"
                        class="tc-mp-option-label"
                        @select="onSelect"
                        @commit="onCommit"
                    >
                        {{ opt.name }}
                    </MenuTextVisual>
                </div>
            </div>

            <MenuEditableElement
                v-if="category.tagline"
                :element-key="`category-${category.id}:tagline`"
                label="Caldo ilimitado"
                :config="categoryElementFor(category, 'tagline', breakpoint)"
                :editable="editable"
                :selected="selectedKey === `category-${category.id}:tagline`"
                @select="onSelect"
                @commit="onCommit"
            >
                <div class="tc-mp-pancita-tagline">
                    <p
                        class="tc-mp-tagline-text"
                        :style="{
                            color: category.color_secondary ?? undefined,
                        }"
                    >
                        {{ category.tagline }}
                    </p>
                    <p
                        v-if="category.tagline_sub"
                        class="tc-mp-ingredients"
                        :style="{
                            color: category.color ?? undefined,
                            '--tc-mp-h': category.color ?? undefined,
                        }"
                    >
                        {{ category.tagline_sub }}
                    </p>
                </div>
            </MenuEditableElement>

            <div v-if="footer" class="tc-mp-footer-row">
                <MenuEditableElement
                    v-if="category.tagline_image_url"
                    :element-key="`category-${category.id}:tagline_image`"
                    label="Textos gráficos tortillas"
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
                    kind="image"
                    :src="category.tagline_image_url"
                    :alt="category.tagline_sub ?? footer.name"
                    img-class="w-[55%]"
                    @select="onSelect"
                    @commit="onCommit"
                />

                <MenuItemVisual
                    :item="footer"
                    class="tc-mp-footer-photo"
                    :breakpoint="breakpoint"
                    :editable="editable"
                    :selected-key="selectedKey"
                    @select="onSelect"
                    @commit="onCommit"
                />
            </div>
        </div>
    </MenuPageFrame>
</template>
