# 🍽️ BarberOS SaaS – Guía de Ejecución Local

Esta guía explica paso a paso cómo ejecutar **BarberOS SaaS** en un entorno local para desarrollo o pruebas. El sistema está compuesto por:

- **Backend:** Node.js + MySQL + Prisma
- **Frontend:** Vite + React

---

## 1️⃣ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado lo siguiente:

- **Node.js** versión **18 o superior**
- **MySQL Server** versión **8.0 o superior**
- **Editor de código** (recomendado: VS Code)

Puedes verificar las versiones con:

```bash
node -v
mysql --version
```

---

## 2️⃣ Configuración del Entorno (.env)

Crea un archivo llamado **`.env`** en la raíz del proyecto y agrega el siguiente contenido, ajustando las credenciales según tu entorno:

```env
# URL de conexión a la base de datos (ajusta usuario y contraseña)
DATABASE_URL="mysql://root:tu_password@localhost:3306/odontos_db"

# Secreto para la generación de tokens JWT
JWT_SECRET="barber_secret_key_2025"

# Puerto del servidor Backend
PORT=3001

# API Key de Google Gemini (IA para materiales y análisis)
GEMINI_API_KEY="TU_API_KEY_AQUI"
```

📌 **Nota:** Si no defines `GEMINI_API_KEY`, el sistema funcionará, pero las funciones de IA no estarán disponibles.

---

## 3️⃣ Instalación de Dependencias

Desde la raíz del proyecto, ejecuta:

```bash
npm install
```

Esto instalará tanto las dependencias del backend como del frontend (según la configuración del proyecto).

---

## 4️⃣ Preparación de la Base de Datos (Prisma)

### 4.1 Generar el Cliente de Prisma

```bash
npx prisma generate
```

### 4.2 Ejecutar Migraciones

Asegúrate de que:
- El servicio de **MySQL esté en ejecución**
- La base de datos **`barber_db`** exista (Prisma puede crearla automáticamente)

Luego ejecuta:

```bash
npx prisma migrate dev --name init_odontos
```

Esto creará las tablas necesarias en la base de datos.

### 4.3 Ejecutar el Seeder (Datos Iniciales)

Este paso es **obligatorio** para poder acceder al sistema.

```bash
npx prisma db seed
```

✔️ Se cargan:
- Plan Único de Cuentas (PUC)
- Roles del sistema
- Usuario administrador

---

## 5️⃣ Ejecución del Sistema

Para que BarberOS funcione correctamente, debes ejecutar **dos procesos en paralelo**.

### 🖥️ Opción Recomendada: Terminales Separadas

#### Terminal 1 – Backend

```bash
npm run server
```

Salida esperada:

```
🚀 ODONTO-OS BACKEND ACTIVO EN PUERTO 3001
```

#### Terminal 2 – Frontend

```bash
npm run dev
```

Salida esperada:

```
Local: http://localhost:2001
```

Abre esa URL en tu navegador.

---

## 6️⃣ Acceso Inicial al Sistema

Una vez cargue la pantalla de login:

- **PIN de acceso:** `1111`
- **Usuario administrador:** `admin@odontos.io`

(Este usuario es creado automáticamente por el seeder)

---

## ℹ️ Notas Técnicas Importantes

### 🔌 Modo Offline / Demo

El sistema incluye un mecanismo de **fallback** en `services/api.ts`:

- Si el backend no está activo o falla la conexión
- La aplicación utilizará **datos mock** para evitar que la UI se rompa
- ⚠️ **Los cambios no se guardarán en MySQL**

### 🤖 API Gemini

- Sin una `GEMINI_API_KEY` válida:
  - Las funciones de **Sugerir materiales** y **Análisis con IA** fallarán
  - El resto del POS funcionará con normalidad

### 🖨️ Impresión

- Por defecto, el sistema genera **PDFs**
- Para impresión directa en **impresoras térmicas**, es necesario instalar **QZ Tray**

---

## ✅ Estado del Proyecto

OdontOS SaaS está diseñado para ejecutarse en entornos locales, servidores VPS o contenedores Docker, facilitando su evolución hacia un modelo SaaS completo.

🚀 ¡Listo para desarrollar y escalar!