export const PERMISSION_LABELS: Record<string, string> = {
    'dashboard.view': 'Ver dashboard',
    'menu.view': 'Ver platillos',
    'menu.create': 'Registrar platillos',
    'menu.update': 'Editar platillos',
    'menu.delete': 'Eliminar platillos',
    'categories.view': 'Ver categorías',
    'categories.create': 'Registrar categorías',
    'categories.update': 'Editar categorías',
    'categories.delete': 'Eliminar categorías',
    'users.view': 'Ver usuarios',
    'users.create': 'Registrar usuarios',
    'users.update': 'Editar usuarios',
    'users.delete': 'Eliminar usuarios',
    'roles.view': 'Ver roles',
    'roles.create': 'Registrar roles',
    'roles.update': 'Editar roles',
    'roles.delete': 'Eliminar roles',
    'settings.view': 'Ver configuración',
    'settings.update': 'Editar configuración',
    'jobs.view': 'Ver bolsa de trabajo',
    'jobs.update': 'Editar bolsa de trabajo',
    'modules.view': 'Ver módulos',
    'modules.update': 'Editar módulos',
    'reports.view': 'Ver reportes',
    'reports.export': 'Exportar reportes',
};

export const GROUP_LABELS: Record<string, string> = {
    dashboard:  'Dashboard',
    menu:       'Platillos',
    categories: 'Categorías',
    users:      'Usuarios',
    roles:      'Roles',
    settings:   'Configuración',
    jobs:       'Bolsa de trabajo',
    modules:    'Módulos',
    reports:    'Reportes',
};

export function permissionLabel(permission: string): string {
    return PERMISSION_LABELS[permission] ?? permission;
}

export function permissionGroupLabel(group: string): string {
    return GROUP_LABELS[group] ?? group;
}

export function usePermissionLabels() {
    return { permissionLabel, permissionGroupLabel };
}
