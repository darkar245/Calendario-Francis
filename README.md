# Calendario de Adviento para Francis

Página web romántica con 24 regalos, panel privado de administración y progreso guardado en Supabase. El diseño está en español y usa bordó, verde oscuro, crema y dorado.

## 1. Crear el proyecto en Supabase
1. Entra en https://supabase.com/ y crea un proyecto.
2. Abre **SQL Editor** y ejecuta todo el archivo `supabase-schema.sql`.
3. En **Project Settings > API** copia Project URL y la clave `anon` / `publishable`.
4. Abre `app.js` y reemplaza:
   - `PEGA_AQUI_TU_PROJECT_URL`
   - `PEGA_AQUI_TU_ANON_PUBLIC_KEY`

La clave pública/anon se puede usar en el navegador porque las tablas están protegidas por RLS. **Nunca pongas la `service_role` key en app.js.**

## 2. Crear las cuentas
1. En Supabase abre **Authentication > Users > Add user**.
2. Crea tu usuario con tu correo y contraseña.
3. Para Francis, crea un usuario con un alias/correo que controles tú (no su correo personal) y marca **Auto Confirm User**. No envíes invitación ni compartas el correo. Su contraseña será el código secreto que ella escribirá en la página.
4. En `app.js`, configura `FRANCIS_LOGIN_EMAIL` con exactamente ese mismo alias/correo.
5. Copia el UUID de TU cuenta (no el de Francis).
6. En SQL Editor ejecuta:
   ```sql
   insert into public.advent_admins(user_id)
   values ('PEGA-AQUI-TU-UUID');
   ```
Solo tu cuenta tendrá el panel de administración. Francis solo verá y abrirá regalos. El formulario público le pide únicamente su código; el correo alias queda configurado internamente en `app.js`. No pongas contraseñas ni claves secretas en ese archivo.

## 3. Probar en tu computadora
Para que los módulos JavaScript funcionen, sirve la carpeta mediante un servidor local. En VS Code instala **Live Server**, abre `index.html` y pulsa **Open with Live Server**. También puedes usar:
```bash
python -m http.server 8000
```
Luego visita `http://localhost:8000`.

## 4. Publicar gratis en Netlify
1. Sube la carpeta completa a un repositorio privado de GitHub, o arrastra la carpeta a Netlify Drop.
2. En Netlify, publica el sitio. No necesita comando de build ni carpeta de salida: el directorio publicado es la raíz del proyecto.
3. Comparte el enlace público con Francis.

## 5. Administrar los regalos
Ingresa con tu cuenta de administrador. Verás el panel privado y podrás editar número, fecha, título, mensaje, URL de imagen y URL de video. Puedes usar enlaces públicos de imágenes (por ejemplo, una imagen alojada en un servicio de almacenamiento). No uses rutas locales de tu PC.

## Cómo funciona el desbloqueo y el progreso
- Cada regalo se desbloquea en su fecha `unlock_date`, usando la fecha de Paraguay (`America/Asuncion`).
- Los días anteriores quedan disponibles si ella no los abrió en su fecha.
- Los días futuros permanecen bloqueados.
- Al abrir una sorpresa se guarda en `advent_opens` vinculada a la cuenta de Francis. El progreso se conserva al cerrar sesión o cambiar de dispositivo.
- El código secreto es la contraseña del usuario de Francis en Supabase Auth; Supabase guarda su hash. No lo escribas en el código fuente ni lo publiques en GitHub.

## Nota antes de usar
La plantilla inicial configura las fechas del **1 al 24 de diciembre de 2026**. Si quieres usar otro año, cambia las fechas desde el panel o modifica el año en `supabase-schema.sql` antes de ejecutarlo. El contenido de ejemplo está vacío para que cargues tus propios regalos.
