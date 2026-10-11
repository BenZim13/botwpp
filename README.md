# YacaJobs - WhatsApp AI Bot 👷‍♂️

Bot de atención automatizada para **YacaJobs** con Inteligencia Artificial (**Google Gemini**), base de datos en **Supabase** y alojamiento Serverless gratuito en **Vercel**.

---

## 🚀 Despliegue en 4 pasos (100% Gratuito)

### 1. Subir este proyecto a tu GitHub

Abrí una terminal en esta carpeta y ejecutá:

```bash
git init
git add .
git commit -m "Initial commit: YacaJobs WhatsApp Bot"
git branch -M main
```

Creá un repositorio vacío en tu [GitHub](https://github.com/new) (por ejemplo llamado `botwppn8n` o `yacajobs-bot`) y subí tu código:

```bash
git remote add origin https://github.com/TU_USUARIO/botwppn8n.git
git push -u origin main
```

---

### 2. Importar en Vercel

1. Entrá a [vercel.com](https://vercel.com) con tu cuenta de GitHub.
2. Hacé clic en **Add New... → Project**.
3. Seleccioná el repositorio importado y hacé clic en **Import**.
4. Antes de presionar Deploy, abrí la sección **Environment Variables** y agregá estas 6 variables:

| Variable | Valor | Dónde se obtiene |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Supabase (*Project Settings → API*) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | Supabase (*Project Settings → API*) |
| `GEMINI_API_KEY` | `AIzaSy...` | [Google AI Studio](https://aistudio.google.com) |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789...` | Meta Developers (*WhatsApp → Configuración de la API*) |
| `WHATSAPP_TOKEN` | `EAAG...` | Meta Developers (*WhatsApp → Configuración de la API*) |
| `WHATSAPP_VERIFY_TOKEN` | `yacajobs_secreto_2026` | Una palabra clave que vos inventás |

5. Hacé clic en **Deploy**.
6. En 30 segundos Vercel te dará tu URL pública, por ejemplo:
   `https://botwppn8n.vercel.app`

---

### 3. Configurar el Webhook en Meta Developers

1. Entrá a [developers.facebook.com](https://developers.facebook.com) y abrí tu App.
2. En el menú izquierdo andá a **WhatsApp → Configuración**.
3. En la sección **Webhook**, hacé clic en **Editar**:
   - **URL de devolución de llamada:** `https://TU_PROYECTO.vercel.app/api/webhook`
   - **Token de verificación:** El mismo texto que pusiste en `WHATSAPP_VERIFY_TOKEN` (ej: `yacajobs_secreto_2026`).
4. Hacé clic en **Verificar y guardar**. (Meta enviará una petición de prueba y Vercel responderá OK).
5. Hacé clic en **Administrar campos** y tildá la casilla **`messages`** → Guardar.

---

### 4. Ejecutar el SQL en Supabase

En tu panel de [Supabase](https://supabase.com):
1. Andá a **SQL Editor → New Query**.
2. Pegá el contenido del archivo `esquema_yacajobs.sql` y hacé clic en **Run**.

---

## 📱 ¡A probar!

Enviá un mensaje *"Hola"* desde tu teléfono al número de prueba de WhatsApp de Meta y seguí los 4 pasos:
1. Yaca te saluda y te pide tu DNI o usuario.
2. Le contás tu problema (ej: *"tengo una pérdida de agua"*).
3. Yaca te recomienda los 3 profesionales y te pide a quién elegís, día, hora y dirección.
4. Al responder, Yaca guarda la contratación en la tabla `contrataciones` de Supabase y te manda la confirmación final.
