// El ancho REAL y continuo del viewport (px), no un bucket discreto — cada
// elemento resuelve a qué vista pertenece (ver MenuDevice/resolveMenuDevice)
// según este número exacto y adapta esa composición proporcionalmente a él
// (ver resolveElementConfig: selección de composición, nunca interpolación
// entre vistas distintas). Sigue llamándose "MenuBreakpoint" únicamente para
// no tener que tocar el prop `breakpoint` que todas las plantillas de página
// (PozolePage, BirriaPage, etc.) ya reciben y reenvían tal cual a
// itemElementFor/categoryElementFor.
export type MenuBreakpoint = number;

/** Las tres vistas configurables que ve el administrador — todo lo demás
 * (los seis breakpoints de Tailwind sm/md/lg/xl/2xl que sigue usando el CSS
 * estructural) es invisible para él. */
export type MenuDevice = 'mobile' | 'tablet' | 'desktop';

export const MENU_DEVICE_ORDER: MenuDevice[] = ['mobile', 'tablet', 'desktop'];

/** Anchos de referencia (px) de cada vista — deben coincidir exactamente con
 * el tamaño real del iframe del editor para que "lo que ves es lo que hay". */
export const MENU_DEVICE_WIDTH: Record<MenuDevice, number> = {
    mobile: 390,
    tablet: 768,
    desktop: 1440,
};

export const MENU_DEVICE_LABELS: Record<MenuDevice, string> = {
    mobile: 'Móvil',
    tablet: 'Tablet',
    desktop: 'Escritorio',
};

/** Rango de ancho REAL (viewport o lienzo) que corresponde a cada vista —
 * fijo e independiente del ancho de anclaje de cada composición (390/768/
 * 1440): un teléfono de 593px sigue siendo Móvil (nunca "cae" en Tablet
 * solo por estar más cerca de 768 que de 390 en línea recta). A propósito
 * NO son los puntos medios entre anclas (390+768)/2=579 y (768+1440)/2=1104
 * que usaba la versión anterior — esos puntos medios fueron exactamente el
 * bug reportado: un teléfono de 593px (Galaxy S20 Ultra y similares) ya
 * caía en Tablet, perdiendo la altura/composición Móvil pese a seguir
 * siendo, a todos los efectos de diseño, un teléfono. Estos umbrales
 * coinciden con los rangos que el propio negocio define para el admin
 * (Móvil <640, Tablet 640-1023, Escritorio ≥1024) y son los ÚNICOS que usa
 * todo el sistema — tanto para elegir qué composición completa mostrar
 * (ver resolveElementConfig) como para decidir en qué vista persistir un
 * arrastre hecho dentro del iframe del editor (que siempre carga a un ancho
 * EXACTO de 390/768/1440, así que esto resuelve siempre a la vista
 * correspondiente a esa ancla, nunca a una zona ambigua). */
export function resolveMenuDevice(width: number): MenuDevice {
    if (width < 640) {
        return 'mobile';
    }

    if (width < 1024) {
        return 'tablet';
    }

    return 'desktop';
}

/** Configuración de posición/tamaño/tipografía/imagen de UN elemento en UN
 * breakpoint. Todos los campos de texto/imagen son opcionales — solo se
 * usan cuando el elemento los soporta (ver ElementKind). */
export interface ElementConfig {
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    scale: number;
    rotation: number;
    z_index: number;
    locked?: boolean;
    /** Oculto SOLO en la vista resuelta actual (mobile/tablet/desktop) — a
     * diferencia de is_active del modelo (oculta en TODAS las vistas), esto
     * permite p. ej. un adorno visible únicamente en Escritorio. Discreto:
     * nunca se "mezcla" a medias entre dos vistas. */
    hidden?: boolean;
    /** 0-1, interpolable — pensado sobre todo para adornos decorativos. */
    opacity?: number | null;
    // Texto
    font_size?: number | null;
    line_height?: number | null;
    letter_spacing?: number | null;
    align?: 'left' | 'center' | 'right' | null;
    max_width?: number | null;
    color?: string | null;
    // Imagen
    fit?: 'contain' | 'cover' | null;
    object_x?: number | null;
    object_y?: number | null;
    inner_scale?: number | null;
}

export function defaultElementConfig(): ElementConfig {
    // Siempre un objeto nuevo — nunca una referencia compartida: en SSR el
    // proceso de Node vive entre requests, así que una sola instancia mutada
    // por accidente en cualquier parte contaminaría el render de todos los
    // elementos sin personalizar del resto de peticiones.
    return {
        x: 0,
        y: 0,
        width: null,
        height: null,
        scale: 1,
        rotation: 0,
        z_index: 1,
    };
}

/** 'flow' = sigue dependiendo del flujo natural de flex/grid (como TODO
 * elemento hoy, V1 o V2 recién creado); 'normalized' = ya se movió/redimensionó
 * a mano al menos una vez, position:absolute permanente dentro de
 * .tc-mp-customized-layer, fuera del flujo por completo (ver
 * MenuEditableElement.vue). */
export type ElementPositionMode = 'flow' | 'normalized';

/**
 * Formato V2 — coordenadas normalizadas contra el ANCHO real renderizado del
 * "positioning root" de la sección (.tc-mp-content-layer), nunca contra
 * window.innerWidth/el iframe/el propio ancho del elemento. Reemplaza x/y/
 * width/height en px del V1 (ver ElementConfig) — el resto de campos
 * (tipografía, imagen, capa) se conservan sin cambio, nunca necesitaron ser
 * porcentuales para dejar de "congelarse" fuera del rango 390-1440
 * configurado (ver resolveElementConfig: la extrapolación proporcional ya
 * los cubre igual que a x_pct/y_pct).
 */
export interface ElementConfigV2 {
    coordinate_version: 2;
    position_mode: ElementPositionMode;
    /** % del ANCHO del root (0-100 típico, puede salir de rango si el
     * elemento está parcial o totalmente fuera del lienzo). */
    x_pct: number;
    /** También en % del ANCHO del root (NUNCA del alto) — a propósito,
     * conserva la escala uniforme de la composición entre teléfonos. */
    y_pct: number;
    width_pct: number | null;
    height_pct: number | null;
    scale: number;
    rotation: number;
    z_index: number;
    locked?: boolean;
    hidden?: boolean;
    opacity?: number | null;
    // Mismos campos no geométricos que ElementConfig — sin cambio de forma.
    font_size?: number | null;
    line_height?: number | null;
    letter_spacing?: number | null;
    align?: 'left' | 'center' | 'right' | null;
    max_width?: number | null;
    color?: string | null;
    fit?: 'contain' | 'cover' | null;
    object_x?: number | null;
    object_y?: number | null;
    inner_scale?: number | null;
}

export function defaultElementConfigV2(): ElementConfigV2 {
    return {
        coordinate_version: 2,
        position_mode: 'flow',
        x_pct: 0,
        y_pct: 0,
        width_pct: null,
        height_pct: null,
        scale: 1,
        rotation: 0,
        z_index: 1,
    };
}

/** Cualquier configuración guardada — V1 (px, formato histórico, ver
 * ElementConfig) o V2 (%, ver ElementConfigV2). Un config es V1 SIEMPRE que
 * no tenga `coordinate_version === 2` — "clave ausente" es el marcador
 * permanente e inambiguo de V1 tanto aquí como en el backend
 * (MenuEditorController::configRules), nunca se reescribe una fila V1 para
 * "marcarla" como tal. */
export type StoredElementConfig = ElementConfig | ElementConfigV2;

export function isV2Config(
    config: StoredElementConfig | null | undefined,
): config is ElementConfigV2 {
    return !!config && (config as ElementConfigV2).coordinate_version === 2;
}

/** Forma mínima de un DOMRect que necesitan las conversiones de abajo —
 * permite pasar un objeto plano en pruebas unitarias sin depender de un DOM
 * real. */
export interface RectLike {
    left: number;
    top: number;
    width: number;
    height: number;
}

/** Guardado contra rootWidthPx <= 0 / no finito (el root aún no tiene layout,
 * p. ej. antes del primer paint) — 0 en vez de NaN/Infinity, nunca debe
 * propagar un valor no numérico al style calculado. */
export function pxToPct(px: number, rootWidthPx: number): number {
    if (!Number.isFinite(rootWidthPx) || rootWidthPx <= 0) {
        return 0;
    }

    return (px / rootWidthPx) * 100;
}

export function pctToPx(pct: number, rootWidthPx: number): number {
    if (!Number.isFinite(rootWidthPx) || rootWidthPx <= 0) {
        return 0;
    }

    return (pct / 100) * rootWidthPx;
}

/**
 * Único punto que traduce una medición REAL del DOM (rect del elemento +
 * rect del positioning-root) a porcentajes — fórmula exacta del spec: ambos
 * ejes (x Y y) se dividen entre el ANCHO del root, nunca su alto.
 */
export function measuredRectToNormalized(
    elementRect: RectLike,
    rootRect: RectLike,
): { x_pct: number; y_pct: number; width_pct: number; height_pct: number } {
    return {
        x_pct: pxToPct(elementRect.left - rootRect.left, rootRect.width),
        y_pct: pxToPct(elementRect.top - rootRect.top, rootRect.width),
        width_pct: pxToPct(elementRect.width, rootRect.width),
        height_pct: pxToPct(elementRect.height, rootRect.width),
    };
}

/** Inversa de measuredRectToNormalized — alimenta el style calculado de
 * MenuEditableElement (left/top/width/height reales) a partir del ancho real
 * medido del root en ESE momento (vía ResizeObserver, nunca el viewport). */
export function normalizedToPx(
    config: Pick<ElementConfigV2, 'x_pct' | 'y_pct' | 'width_pct' | 'height_pct'>,
    rootWidthPx: number,
): { left: number; top: number; width: number | null; height: number | null } {
    return {
        left: pctToPx(config.x_pct, rootWidthPx),
        top: pctToPx(config.y_pct, rootWidthPx),
        width:
            config.width_pct !== null
                ? pctToPx(config.width_pct, rootWidthPx)
                : null,
        height:
            config.height_pct !== null
                ? pctToPx(config.height_pct, rootWidthPx)
                : null,
    };
}

/**
 * Construye un ElementConfigV2 a partir de una medición real del DOM,
 * conservando los campos no geométricos de la config V1 previa (o los
 * valores por defecto si el elemento nunca se había personalizado).
 * Idempotente por construcción: si `baseline` YA es V2, se devuelve tal cual
 * — nunca se vuelve a medir ni se divide porcentaje-sobre-porcentaje (cubierto
 * también por una prueba unitaria explícita, ver types.spec.ts).
 */
export function upgradeV1ToV2(
    baseline: StoredElementConfig | null | undefined,
    elementRect: RectLike,
    rootRect: RectLike,
    positionMode: ElementPositionMode,
): ElementConfigV2 {
    if (isV2Config(baseline)) {
        return baseline;
    }

    const v1 = baseline as ElementConfig | null | undefined;
    const measured = measuredRectToNormalized(elementRect, rootRect);

    return {
        coordinate_version: 2,
        position_mode: positionMode,
        x_pct: measured.x_pct,
        y_pct: measured.y_pct,
        // Solo hereda un tamaño personalizado si el V1 YA tenía uno propio
        // (width/height !== null) — si no, se queda "automático" (null),
        // igual que hoy, en vez de fijar el tamaño intrínseco medido.
        width_pct: v1?.width != null ? measured.width_pct : null,
        height_pct: v1?.height != null ? measured.height_pct : null,
        scale: v1?.scale ?? 1,
        rotation: v1?.rotation ?? 0,
        z_index: v1?.z_index ?? 1,
        opacity: v1?.opacity ?? null,
        locked: v1?.locked,
        hidden: v1?.hidden,
        font_size: v1?.font_size ?? null,
        line_height: v1?.line_height ?? null,
        letter_spacing: v1?.letter_spacing ?? null,
        align: v1?.align ?? null,
        max_width: v1?.max_width ?? null,
        color: v1?.color ?? null,
        fit: v1?.fit ?? null,
        object_x: v1?.object_x ?? null,
        object_y: v1?.object_y ?? null,
        inner_scale: v1?.inner_scale ?? null,
    };
}

/** Un elemento tiene como máximo tres configuraciones guardadas (una por
 * MenuDevice) — cualquier ancho se resuelve a UNA sola de estas tres
 * composiciones completas (ver resolveElementConfig), nunca mezclando dos, y
 * nunca se guarda un cuarto/quinto/sexto valor. `_legacy_breakpoints` es un
 * respaldo de solo lectura que deja la migración de datos del formato
 * anterior (base/sm/md/lg/xl/2xl) — el código público nunca lo lee. */
export type ElementSettings = Partial<Record<MenuDevice, StoredElementConfig>> & {
    _legacy_breakpoints?: unknown;
};

/**
 * Campos en px reales que deben escalar proporcionalmente al convertir entre
 * el ancho REAL en que se editó/renderiza un elemento y el ancho de
 * referencia (ancla) 1440px que es lo único que se persiste — ver
 * toAnchorCoordinates/fromAnchorCoordinates. object_x/object_y son
 * porcentajes (no px), scale/inner_scale son multiplicadores sin unidad,
 * rotation son grados: ninguno de esos depende del ancho de viewport, así
 * que quedan fuera de esta lista a propósito.
 */
const SCALABLE_PX_FIELDS = [
    'x',
    'y',
    'width',
    'height',
    'font_size',
    'letter_spacing',
    'max_width',
] as const satisfies readonly (keyof ElementConfig)[];

/** Genérico en T para aceptar tanto ElementConfig (V1: x/y/width/height
 * escalan) como ElementConfigV2 (ninguno de sus campos está en
 * SCALABLE_PX_FIELDS salvo los no-geométricos heredados como font_size/
 * letter_spacing/max_width — así que en V2 esto escala SOLO tipografía, un
 * no-op deliberado para x_pct/y_pct/width_pct/height_pct, que ya son
 * resolución-independientes por diseño). */
function scaleConfigByRatio<T extends ElementConfig | ElementConfigV2>(
    config: T,
    ratio: number,
): T {
    if (ratio === 1 || !Number.isFinite(ratio)) {
        return config;
    }

    const out = { ...config } as T;

    for (const field of SCALABLE_PX_FIELDS) {
        const value = (config as unknown as Record<string, unknown>)[field] as
            | number
            | null
            | undefined;

        if (value !== null && value !== undefined) {
            (out as unknown as Record<string, number>)[field] = value * ratio;
        }
    }

    return out;
}

/**
 * Convierte una config medida en un viewport REAL (`editedAtWidth` — p. ej.
 * 1909px, el ancho real de la ventana del administrador al editar la vista
 * Escritorio) al equivalente en el ancla de referencia (`anchorWidth`,
 * 1440px por defecto) que es lo único que se persiste. Inverso exacto de
 * fromAnchorCoordinates: toAnchorCoordinates(fromAnchorCoordinates(c, w), w)
 * === c (salvo error de punto flotante), la propiedad que garantizan las
 * pruebas de ida y vuelta render→editar→guardar→render.
 */
export function toAnchorCoordinates<T extends ElementConfig | ElementConfigV2>(
    config: T,
    editedAtWidth: number,
    anchorWidth: number = MENU_DEVICE_WIDTH.desktop,
): T {
    return scaleConfigByRatio(config, anchorWidth / editedAtWidth);
}

/**
 * Inverso de toAnchorCoordinates: expande la config guardada en el ancla de
 * referencia (1440px) al ancho REAL objetivo — usado tanto por el iframe del
 * editor (Escritorio puede mostrarse a cualquier ancho real de pantalla,
 * p. ej. 1909px) como por /menu público para cualquier visitante con un
 * monitor más ancho que 1440px, para que la geometría personalizada no se
 * quede "congelada" en px absolutos mientras crece el espacio disponible.
 */
export function fromAnchorCoordinates<T extends ElementConfig | ElementConfigV2>(
    config: T,
    targetWidth: number,
    anchorWidth: number = MENU_DEVICE_WIDTH.desktop,
): T {
    return scaleConfigByRatio(config, targetWidth / anchorWidth);
}

interface DeviceAnchor {
    device: MenuDevice;
    width: number;
    config: StoredElementConfig;
}

/** true si `config` trae su PROPIA posición (x/y o x_pct/y_pct como número
 * real) — falso para un objeto "huérfano" como `{ z_index: 3 }`, que suele
 * quedar así porque el admin subió/bajó una capa en esa vista sin llegar a
 * mover/redimensionar nada ahí. Usado exclusivamente por `completeAnchor`
 * para decidir si una ancla necesita respaldo de otra — nunca cambia lo que
 * se GUARDA, solo lo que se usa para resolver. */
function hasOwnPosition(config: StoredElementConfig): boolean {
    const c = config as unknown as Record<string, unknown>;

    return (
        (typeof c.x_pct === 'number' && typeof c.y_pct === 'number') ||
        (typeof c.x === 'number' && typeof c.y === 'number')
    );
}

/**
 * Completa una ancla "huérfana" (sin posición propia, ver `hasOwnPosition`)
 * adoptando la geometría COMPLETA del ancla real más cercana (por distancia
 * en px de ancho, no por orden de dispositivo — Tablet está más cerca de
 * Móvil que de Escritorio en px, aunque ambos estén a "un paso" en
 * MENU_DEVICE_ORDER), y conservando encima cualquier campo que la propia
 * ancla huérfana SÍ traiga explícito (z_index, hidden, locked, opacity…).
 * Caso real confirmado en producción: un adorno con Móvil V2 completo,
 * ninguna configuración Tablet y Escritorio = `{ z_index: 3 }` — antes de
 * este fix, interpolar Móvil↔Escritorio "parcial" convertía width_pct/
 * height_pct en `null` en cuanto el viewport pasaba de 390px, sin importar
 * que Escritorio no tuviera NADA de posición propia que mezclar. Con el
 * respaldo, esa ancla "parcial" termina siendo geométricamente idéntica a
 * Móvil (solo con su z_index propio encima), así que interpolar contra ella
 * en cualquier punto intermedio no mueve ni redimensiona nada — el mismo
 * resultado que si Escritorio no tuviera ninguna configuración.
 * Si NINGUNA otra ancla tiene posición propia tampoco (caso degenerado), se
 * devuelve la ancla huérfana tal cual — el spread contra los valores por
 * defecto que ya hace `resolveElementConfig` sigue aplicando después.
 *
 * La geometría prestada se re-escala primero al ancho de referencia de LA
 * PROPIA ancla huérfana (`fromAnchorCoordinates`, no-op para % — ver
 * SCALABLE_PX_FIELDS) antes de adoptarla: sin esto, unos px V1 prestados de
 * un donante con un ancho de referencia distinto (p. ej. Escritorio
 * huérfano prestándose de Tablet) quedarían etiquetados con el ancho de
 * Escritorio (1440) pero conservando magnitudes pensadas para 768 — al
 * escalar después por `viewportWidth/1440` en `resolveElementConfig`, el
 * resultado saldría equivocado por un factor 1440/768. Para % esto es un
 * no-op exacto (ya son resolución-independientes), así que aplicarlo siempre
 * es seguro. */
function completeAnchor(
    anchor: DeviceAnchor,
    others: DeviceAnchor[],
): StoredElementConfig {
    if (hasOwnPosition(anchor.config)) {
        return anchor.config;
    }

    const nearest = [...others]
        .filter((o) => hasOwnPosition(o.config))
        .sort(
            (a, b) =>
                Math.abs(a.width - anchor.width) -
                Math.abs(b.width - anchor.width),
        )[0];

    if (!nearest) {
        return anchor.config;
    }

    const borrowed = fromAnchorCoordinates(
        nearest.config,
        anchor.width,
        nearest.width,
    );

    return { ...borrowed, ...anchor.config };
}

function anchorsOf(
    settings: ElementSettings | null | undefined,
): DeviceAnchor[] {
    const raw: DeviceAnchor[] = [];

    for (const device of MENU_DEVICE_ORDER) {
        const config = settings?.[device];

        if (config) {
            raw.push({ device, width: MENU_DEVICE_WIDTH[device], config });
        }
    }

    return raw.map((anchor) => ({
        ...anchor,
        config: completeAnchor(
            anchor,
            raw.filter((a) => a.device !== anchor.device),
        ),
    }));
}

function defaultConfigFor(config: StoredElementConfig): StoredElementConfig {
    return isV2Config(config) ? defaultElementConfigV2() : defaultElementConfig();
}

/**
 * Calcula la configuración real de un elemento para un ancho de viewport
 * arbitrario mediante SELECCIÓN DE COMPOSICIÓN, nunca interpolación entre
 * vistas distintas: se resuelve primero a qué dispositivo pertenece
 * `viewportWidth` (ver resolveMenuDevice — Móvil <640, Tablet 640-1023,
 * Escritorio ≥1024), se toma la composición COMPLETA guardada para ese
 * dispositivo (o, si no existe, la del dispositivo con ancla más cercana —
 * ver `anchorsOf`/`completeAnchor`, que ya hacían este respaldo para anclas
 * "huérfanas" con solo `{z_index:3}` y ahora también cubre un dispositivo
 * enteramente ausente) y se adapta proporcionalmente al ancho REAL del
 * lienzo (`viewportWidth`) contra el ancho de referencia de la composición
 * elegida.
 *
 * Esto reemplaza la versión anterior, que interpolaba linealmente entre las
 * dos anclas configuradas más cercanas — el bug de raíz reportado en
 * producción: una composición editorial (título/foto/precio/adornos) no
 * puede "morfearse" elemento por elemento entre Móvil y Tablet porque cada
 * uno sigue una trayectoria distinta y termina encimándose a mitad de
 * camino. Peor aún cuando una vista era V1 (px, semántica de FLUJO: x/y son
 * un desplazamiento relativo al lugar natural del elemento, nunca una
 * posición absoluta) y la otra V2 (%, semántica ABSOLUTA contra el ancho del
 * root): la función anterior convertía el x/y de flujo V1 a un x_pct/y_pct
 * absoluto vía `x/anchorWidth*100` para poder "mezclarlo" con la otra ancla
 * — una conversión matemáticamente inválida (un desplazamiento relativo no
 * es una posición absoluta) que hacía saltar el elemento a un lugar
 * arbitrario en cuanto el viewport se movía un solo px fuera del ancla pura
 * (390→391px). Con selección de composición esto es estructuralmente
 * imposible: SIEMPRE se usa una sola ancla completa, nunca se mezclan dos
 * versiones ni dos dispositivos en el mismo resultado.
 *
 * Consecuencia directa: `position_mode` nunca cambia a mitad de un rango de
 * dispositivo (solo puede cambiar en los saltos discretos 640/1024, donde
 * cambia la composición completa) y un ancla V1 conserva su semántica de
 * flujo sin conversión alguna hasta que se migra de verdad contra el DOM
 * (ver upgradeV1ToV2) — nunca vía este resolver.
 *
 * La escala proporcional (`fromAnchorCoordinates`) es un no-op sobre
 * x_pct/y_pct/width_pct/height_pct (ya son resolución-independientes por
 * diseño — pctToPx hace el trabajo real al renderizar contra el ancho REAL
 * medido del root), pero SÍ sigue escalando los campos en px heredados
 * (x/y/width/height en V1, font_size/letter_spacing/max_width en ambos).
 */
export function resolveElementConfig(
    settings: ElementSettings | null | undefined,
    viewportWidth: number,
): StoredElementConfig {
    const anchors = anchorsOf(settings);

    if (anchors.length === 0) {
        return defaultElementConfig();
    }

    const device = resolveMenuDevice(viewportWidth);
    const deviceWidth = MENU_DEVICE_WIDTH[device];

    // Dispositivo resuelto sin ancla propia (nunca configurado, a diferencia
    // de una ancla "huérfana" con solo `{z_index:3}` que ya cubre
    // `completeAnchor` dentro de `anchorsOf`) — hereda la composición
    // COMPLETA del dispositivo con ancla más cercana por distancia en su
    // propio ancho de referencia (390/768/1440), nunca por la posición
    // exacta de `viewportWidth` dentro del rango: así todo el rango del
    // dispositivo ausente usa SIEMPRE la misma composición prestada, en vez
    // de cambiar de una anchor a otra según en qué punto exacto cae el
    // visitante (lo que rompería "una composición completa y coherente por
    // rango" tan pronto como hubiera más de un candidato cerca).
    const chosen =
        anchors.find((a) => a.device === device) ??
        [...anchors].sort(
            (a, b) =>
                Math.abs(a.width - deviceWidth) - Math.abs(b.width - deviceWidth),
        )[0];

    const resolved = { ...defaultConfigFor(chosen.config), ...chosen.config };

    return viewportWidth === chosen.width
        ? resolved
        : fromAnchorCoordinates(resolved, viewportWidth, chosen.width);
}

export function hasOwnElementConfig(
    settings: ElementSettings | null | undefined,
    device: MenuDevice,
): boolean {
    return !!settings?.[device];
}

export type ItemElementKey =
    | 'container'
    | 'image'
    | 'name'
    | 'description'
    | 'price'
    | 'price_label'
    | 'price_secondary'
    | 'price_secondary_label'
    | 'presentation'
    | 'ingredients'
    | 'choice_label'
    | 'badge'
    | 'caption_image';

export type CategoryElementKey =
    | 'title'
    | 'subtitle'
    | 'tagline'
    | 'tagline_sub'
    | 'title_image'
    | 'subtitle_image'
    | 'tagline_image'
    | 'image';

export type ItemLayoutSettings = Partial<
    Record<ItemElementKey, ElementSettings>
>;

export type CategoryVisualSettings = Partial<
    Record<CategoryElementKey, ElementSettings>
>;

export interface MenuItemData {
    id: number;
    name: string;
    slug: string;
    zone: string | null;
    description?: string | null;
    price: number | string;
    price_label?: string | null;
    price_secondary?: number | string | null;
    price_secondary_label?: string | null;
    presentation?: string | null;
    choice_label?: string | null;
    /** Cuando es true, `choice_label` ya llega en null desde el backend (ver
     * MenuItem::toPublicArray) — el texto sigue guardado, solo se deja de
     * renderizar. Mismo mecanismo que `image_hidden` pero para este bloque. */
    choice_label_hidden?: boolean;
    ingredients?: string | null;
    /** Igual que `choice_label_hidden`, pero para el bloque de ingredientes. */
    ingredients_hidden?: boolean;
    badge?: string | null;
    image_url?: string | null;
    alt_text?: string | null;
    caption_image_url?: string | null;
    image_position_x?: number | null;
    image_position_y?: number | null;
    image_scale?: number | string | null;
    image_fit?: string | null;
    image_align?: string | null;
    visual_size?: string | null;
    layout_settings?: ItemLayoutSettings | null;
    is_active?: boolean;
    is_featured?: boolean;
    /** Oculta SOLO la fotografía (conserva nombre/descripción/precio) — ver
     * MenuItem::getImageUrlAttribute(). Cuando es true, image_url ya llega
     * en null desde el backend; el campo se manda para que el admin sepa
     * distinguir "sin foto" de "foto oculta temporalmente". */
    image_hidden?: boolean;
    previous_image?: string | null;
    sort_order: number;
}

/** Adorno de sección (flor, curva, textura…) — no pertenece a ningún
 * platillo. `visual_settings` es el MISMO shape ElementSettings que ya usan
 * categorías/platillos; la clave estable es `decoration-{id}:image`. */
export interface MenuDecorationData {
    id: number;
    menu_category_id: number;
    name: string;
    /** 'image' (de siempre) o 'text' — un bloque de texto libre sin ningún
     * platillo/imagen detrás (nombre manual, precio a mano, promo…). */
    kind: 'image' | 'text';
    text_content?: string | null;
    alt_text?: string | null;
    is_active: boolean;
    sort_order: number;
    visual_settings?: ElementSettings | null;
    image_url?: string | null;
    element_key: string;
}

export interface MenuCategoryData {
    id: number;
    name: string;
    slug: string;
    layout: string;
    description?: string | null;
    subtitle?: string | null;
    tagline?: string | null;
    tagline_sub?: string | null;
    image_url?: string | null;
    image_mobile_url?: string | null;
    title_image_url?: string | null;
    subtitle_image_url?: string | null;
    tagline_image_url?: string | null;
    color?: string | null;
    color_secondary?: string | null;
    background_position?: string | null;
    show_in_nav?: boolean;
    visual_settings?: CategoryVisualSettings | null;
    /** Alto MÍNIMO forzado a mano de la sección completa, por vista — null
     * (o vista ausente) = automático, crece con el contenido como siempre.
     * Nunca es un tope: si el contenido real es más alto, se sale
     * visualmente, nunca se recorta. Ver sectionHeightFor() más abajo. */
    section_height?: Partial<Record<MenuDevice, number | null>> | null;
    items: MenuItemData[];
    decorations?: MenuDecorationData[];
}

/**
 * Alto mínimo forzado de una sección para un ancho de viewport dado — el
 * admin fija a mano un valor en px por dispositivo (ver
 * `startSectionResize`/`persistSectionHeight` en Public/Menu.vue, siempre
 * arrastrado con el lienzo mostrado exactamente al ancho de referencia de
 * esa vista), pero se CONSUME como una razón `alto guardado / ancho de
 * referencia de SU dispositivo`, igual que cualquier otra medida en px del
 * sistema — nunca como un número fijo independiente del ancho real. Esto es
 * lo que hace que la altura "acompañe" el escalado del resto de la
 * composición dentro del rango de un mismo dispositivo (p. ej. Móvil a
 * 320px vs 390px vs 593px), en vez de quedar fija en px sin relación con
 * cuánto se encogió o creció el lienzo.
 *
 * Si el dispositivo resuelto (ver resolveMenuDevice) no tiene una altura
 * propia guardada, hereda la del dispositivo con altura MÁS CERCANO por
 * ancho de referencia — nunca `null` solo porque falta esa vista concreta:
 * bug real que esto corrige, una categoría con altura fijada en Móvil pero
 * nunca en Tablet perdía el forzado de altura completo en cualquier ancho
 * ≥640px, aunque Tablet estuviera mucho más cerca geométricamente de Móvil
 * que de Escritorio. Solo si NINGÚN dispositivo tiene una altura guardada el
 * resultado es `null` (automático, crece con el contenido como siempre).
 */
export function sectionHeightFor(
    category: Pick<MenuCategoryData, 'section_height'>,
    viewportWidth: MenuBreakpoint,
): number | null {
    const heights = category.section_height;

    if (!heights) {
        return null;
    }

    const owners = MENU_DEVICE_ORDER.filter(
        (d) => typeof heights[d] === 'number',
    ).map((d) => ({
        device: d,
        width: MENU_DEVICE_WIDTH[d],
        height: heights[d] as number,
    }));

    if (owners.length === 0) {
        return null;
    }

    const device = resolveMenuDevice(viewportWidth);
    const deviceWidth = MENU_DEVICE_WIDTH[device];

    const chosen =
        owners.find((o) => o.device === device) ??
        [...owners].sort(
            (a, b) =>
                Math.abs(a.width - deviceWidth) - Math.abs(b.width - deviceWidth),
        )[0];

    return (chosen.height / chosen.width) * viewportWidth;
}

/**
 * Convierte un alto MEDIDO en un ancho real de edición (`editedAtWidth` — p.
 * ej. 1909px, el ancho real de la ventana al arrastrar la manija de una
 * sección en Escritorio) al equivalente anclado al ancho de referencia de su
 * dispositivo (`MENU_DEVICE_WIDTH[device]`, 1440 para Escritorio), que es lo
 * único que `sectionHeightFor` sabe interpretar — esa función SIEMPRE divide
 * el alto guardado entre el ancho de referencia del dispositivo (nunca entre
 * el ancho real en que se editó), así que persistir un alto sin este ancla
 * previo produce doble-escalado o alturas "congeladas" incorrectas en
 * cualquier ancho real de escritorio distinto de 1440 (bug real corregido:
 * editar a 1909px guardaba el alto CRUDO medido en 1909px bajo la clave
 * 'desktop', y al re-renderizar a 1909px `sectionHeightFor` lo dividía entre
 * 1440 y volvía a multiplicar por 1909 — un escalado espurio de 1909/1440
 * que nunca debió aplicarse porque el alto YA estaba en unidades de 1909px).
 * Para Móvil/Tablet, `editedAtWidth` siempre coincide exactamente con su
 * ancla (390/768 — el iframe del editor carga a ese ancho fijo), así que
 * esto es un no-op ahí; solo Escritorio (ancho real variable) necesita la
 * conversión.
 */
export function sectionHeightToAnchor(
    measuredHeight: number,
    editedAtWidth: number,
    device: MenuDevice,
): number {
    const anchorWidth = MENU_DEVICE_WIDTH[device];

    if (!Number.isFinite(editedAtWidth) || editedAtWidth <= 0) {
        return Math.round(measuredHeight);
    }

    return Math.round(measuredHeight * (anchorWidth / editedAtWidth));
}

/** Config visual de UN adorno para un ancho de viewport — misma selección de
 * composición que categoryElementFor/itemElementFor (ver
 * resolveElementConfig), aplicado directamente sobre su ElementSettings
 * propio (un adorno no tiene "elementos" internos, ES el elemento). */
export function decorationElementFor(
    decoration: Pick<MenuDecorationData, 'visual_settings'>,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(decoration.visual_settings, breakpoint);
}

export function money(value: number | string | null | undefined): string {
    return Number(value ?? 0).toLocaleString('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

export function byZone(items: MenuItemData[], zone: string): MenuItemData[] {
    return items.filter((i) => i.zone === zone);
}

export function itemElementFor(
    item: Pick<MenuItemData, 'layout_settings'>,
    key: ItemElementKey,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(item.layout_settings?.[key], breakpoint);
}

export function categoryElementFor(
    category: Pick<MenuCategoryData, 'visual_settings'>,
    key: CategoryElementKey,
    breakpoint: MenuBreakpoint,
): StoredElementConfig {
    return resolveElementConfig(category.visual_settings?.[key], breakpoint);
}

export const ITEM_ELEMENT_LABELS: Record<ItemElementKey, string> = {
    container: 'Contenedor',
    image: 'Imagen',
    name: 'Nombre',
    description: 'Descripción',
    price: 'Precio',
    price_label: 'Etiqueta de precio',
    price_secondary: 'Precio secundario',
    price_secondary_label: 'Etiqueta de precio secundario',
    presentation: 'Presentación',
    ingredients: 'Ingredientes',
    choice_label: 'Etiqueta de elección',
    badge: 'Insignia',
    caption_image: 'Imagen de leyenda',
};

export const CATEGORY_ELEMENT_LABELS: Record<CategoryElementKey, string> = {
    title: 'Título',
    subtitle: 'Subtítulo',
    tagline: 'Tagline',
    tagline_sub: 'Tagline secundario',
    title_image: 'Imagen de título',
    subtitle_image: 'Imagen de subtítulo',
    tagline_image: 'Imagen de tagline',
    image: 'Imagen de sección',
};

type CategoryElementPresence = (category: MenuCategoryData) => boolean;

/**
 * Qué claves de categoría EXISTEN REALMENTE en el DOM para cada layout —
 * espejo deliberado de los v-if de cada *Page.vue (PozolePage.vue,
 * PancitaPage.vue, etc.). Única fuente de verdad para el editor visual: sin
 * esto, la barra lateral no puede saber (solo con `title_image_url`/
 * `subtitle`/`tagline` presentes en los datos) si la plantilla concreta de
 * ESTA categoría realmente renderiza ese elemento — p. ej. Destilados no
 * tiene NINGÚN título editable y Postres solo muestra su `subtitle` de
 * texto cuando NO hay título gráfico. Un título/subtítulo con imagen y su
 * variante de texto son SIEMPRE mutuamente excluyentes (si..si-no en la
 * plantilla), así que nunca aparecen ambos a la vez — eso es justo lo que
 * elimina el control fantasma "Imagen de título" cuando en realidad se
 * renderizó el <h2> de texto, y viceversa.
 */
const CATEGORY_LAYOUT_ELEMENTS: Record<
    string,
    Partial<Record<CategoryElementKey, CategoryElementPresence>>
> = {
    portada: {},
    pozole: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        subtitle_image: (c) => !!c.subtitle_image_url,
    },
    pancita: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline: (c) => !!c.tagline,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    birria: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline: (c) => !!c.tagline,
    },
    fusiones: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
    },
    comal: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
    },
    postres: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        subtitle: (c) => !c.title_image_url && !!c.subtitle,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    bebidas_promo: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        image: (c) => !!c.image_url,
        subtitle_image: (c) => !!c.subtitle_image_url,
    },
    bebidas_tabla: {
        title: (c) => !c.title_image_url,
        title_image: (c) => !!c.title_image_url,
        tagline_image: (c) => !!c.tagline_image_url,
    },
    destilados: {
        tagline_image: (c) => !!c.tagline_image_url,
    },
    promo_full_image: {
        image: (c) => !!c.image_url,
    },
};

/** GridPage.vue — layout de reserva para cualquier `layout` no listado arriba. */
const DEFAULT_LAYOUT_ELEMENTS: Partial<
    Record<CategoryElementKey, CategoryElementPresence>
> = {
    title: (c) => !c.title_image_url,
    title_image: (c) => !!c.title_image_url,
};

/** Orden de aparición en la barra lateral del editor. */
const CATEGORY_ELEMENT_ORDER: CategoryElementKey[] = [
    'title',
    'title_image',
    'subtitle',
    'subtitle_image',
    'tagline',
    'tagline_image',
    'image',
];

/**
 * Claves de categoría que existen REALMENTE en el DOM para esta categoría
 * concreta, según su layout y sus datos — nunca un control fantasma, nunca
 * falta uno que sí se renderiza. Reemplaza cualquier heurística ad-hoc
 * basada solo en "¿este campo de dato existe?" (ver CATEGORY_LAYOUT_ELEMENTS).
 */
export function categoryElementKeysFor(
    category: MenuCategoryData,
): CategoryElementKey[] {
    const rules =
        CATEGORY_LAYOUT_ELEMENTS[category.layout] ?? DEFAULT_LAYOUT_ELEMENTS;

    return CATEGORY_ELEMENT_ORDER.filter(
        (key) => rules[key]?.(category) ?? false,
    );
}
