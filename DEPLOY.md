# Despliegue en el VPS

## Puesta en marcha en un servidor limpio

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
npm run build:ssr   # solo si Inertia SSR está habilitado (config/inertia.php: ssr.enabled)

cp .env.example .env   # si no existe ya; completar credenciales reales de BD/mail/etc.
php artisan key:generate

php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\MenuSeeder --force
php artisan storage:link
php artisan optimize:clear
```

### Qué hace cada paso

- `php artisan migrate --force`: aplica el esquema y las migraciones de datos
  (incluida la que separa las imágenes de título/subtítulo/tagline de
  categoría de su variante de texto — ver
  `database/migrations/2026_07_16_000001_split_menu_category_title_image_settings.php`,
  no destructiva, conserva un respaldo por categoría bajo
  `_pre_title_image_split_backup` dentro de `visual_settings`).
- `php artisan db:seed --class=Database\Seeders\MenuSeeder --force`: importa
  las 10 categorías y 79 platillos oficiales del menú (equivalente a
  `php artisan menu:import-initial`) copiando los recursos gráficos
  versionados en `database/seeders/assets/menu/{design,titles,items}` hacia
  `storage/app/public/menu/...`. Es idempotente: si ya existen categorías o
  platillos oficiales, actualiza sus datos SIN pisar `layout_settings`/
  `visual_settings` que el equipo ya haya ajustado desde el editor visual.
  En un servidor COMPLETAMENTE nuevo (sin usuarios/roles todavía), corre en
  su lugar `php artisan db:seed --force` (sin `--class`): `MenuSeeder` ya
  forma parte de `DatabaseSeeder::run()` junto con `RolePermissionSeeder`,
  `SiteSettingSeeder`, `ModuleSeeder` y `AdminUserSeeder` — así el primer
  usuario admin también queda creado.
- `php artisan storage:link`: crea el symlink `public/storage` →
  `storage/app/public`, necesario para que las URLs `/storage/menu/...`
  respondan.
- `php artisan optimize:clear`: limpia cachés de config/rutas/vistas de un
  posible deploy anterior.

### Verificación tras el deploy

```bash
php artisan tinker --execute="echo App\Models\MenuCategory::count().' categorías, '.App\Models\MenuItem::count().' platillos'.PHP_EOL;"
curl -I https://tu-dominio/storage/menu/design/fondo.png
curl -I https://tu-dominio/menu
```

`MenuCategory::count()` debe ser `10` y `MenuItem::count()` debe ser `79`
(los valores oficiales del PDF del menú — ver `tests/Feature/MenuSeederTest.php`).

## Qué NO vive en GitHub

- `storage/app/public` — contenido real de storage, ignorado por
  `storage/app/public/.gitignore` (`*`). Se reconstruye en el deploy con
  `db:seed --class=MenuSeeder` (copia los originales versionados en
  `database/seeders/assets/menu/`).
- `public/storage` — symlink, se recrea con `php artisan storage:link`.
- `public/build` — build de Vite, se regenera con `npm run build`.

`database/seeders/assets/menu/{design,titles,items}` SÍ vive en GitHub — son
los 43 archivos originales (FONDO, Portada, títulos 01–13, fotos de
platillos) que `ImportMenuCommand`/`MenuSeeder` necesitan para reconstruir
`storage/` desde cero en cualquier servidor nuevo.

## Imágenes subidas desde el CRUD del admin (producción)

Las fotografías que el equipo suba después desde `/admin/menu-items` o
`/admin/categories` (reemplazar la foto de un platillo, subir un nuevo
gráfico de título, etc.) se guardan en `storage/app/public/...` como
cualquier archivo de producción — **no están versionadas en git ni se
recrean con el seeder**. Esas imágenes necesitan su propio respaldo:

- Backup periódico de `storage/app/public` en el VPS (o mover el disco
  `public` a un backend persistente/con réplica, p. ej. Amazon S3 vía
  `config/filesystems.php`, si el VPS no ofrece disco persistente entre
  despliegues/contenedores).
- Si se despliega con un pipeline que reconstruye el contenedor/directorio
  desde cero en cada release, `storage/app/public` DEBE vivir en un volumen
  persistente fuera de ese ciclo de vida — de lo contrario, cualquier imagen
  subida por el CRUD se perdería en el siguiente deploy.

## SSR de Inertia (opcional)

Si `config/inertia.php` tiene `ssr.enabled = true`, el proceso
`php artisan inertia:start-ssr` debe mantenerse corriendo (bajo supervisor/
systemd) apuntando al bundle recién construido en `bootstrap/ssr/app.js`.
Ese proceso sirve el bundle **en memoria** desde que arrancó — reconstruirlo
(`npm run build:ssr`) no tiene efecto hasta reiniciarlo.
