import type { Component } from 'vue';
import BebidasPromoPage from './BebidasPromoPage.vue';
import BebidasTablaPage from './BebidasTablaPage.vue';
import BirriaPage from './BirriaPage.vue';
import ComalPage from './ComalPage.vue';
import DestiladosPage from './DestiladosPage.vue';
import FusionesPage from './FusionesPage.vue';
import GridPage from './GridPage.vue';
import PancitaPage from './PancitaPage.vue';
import PortadaPage from './PortadaPage.vue';
import PostresPage from './PostresPage.vue';
import PozolePage from './PozolePage.vue';
import type { MenuCategoryData } from './types';

export const layoutComponents: Record<string, Component> = {
    portada: PortadaPage,
    pozole: PozolePage,
    pancita: PancitaPage,
    birria: BirriaPage,
    fusiones: FusionesPage,
    comal: ComalPage,
    postres: PostresPage,
    bebidas_promo: BebidasPromoPage,
    bebidas_tabla: BebidasTablaPage,
    destilados: DestiladosPage,
};

export function layoutFor(category: Pick<MenuCategoryData, 'layout'>): Component {
    return layoutComponents[category.layout] ?? GridPage;
}
