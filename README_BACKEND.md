
# BarberOS Backend Infrastructure

Este backend proporciona la lógica de negocio necesaria para operar un restaurante de alta complejidad con cumplimiento contable y control de stock riguroso.

## 📋 Requisitos de Entorno
- **Node.js**: v18+
- **MySQL**: 8.x
- **Prisma CLI**: `npm install -g prisma`

## 🚀 Despliegue Rápido
1. **Configurar DB**: Cree una base de datos en MySQL con charset `utf8mb4`.
2. **Variables**: Cree un archivo `.env` con:
   ```env
   DATABASE_URL="mysql://usuario:password@localhost:3306/barbers_db"
   JWT_SECRET="su_clave_secreta_aqui"
   PORT=3001
   ```
3. **Instalación**: `npm install`
4. **Migraciones**: `npx prisma migrate dev --name init_barbers`
5. **Semilla (PUC/Roles)**: `npx prisma db seed`
6. **Iniciar**: `npm run server`

## 🧠 Arquitectura de Módulos
- **Motor Contable**: Ubicado en `services/accounting.service.ts`. Asegura que cada peso que entra al sistema esté justificado por partida doble.
- **Kardex**: Ubicado en `services/inventory.service.ts`. Maneja el descuento atómico de ingredientes.
- **API Docs**: Acceda a `/api-docs` para ver el catálogo completo de endpoints y esquemas JSON.

## 🛠️ Reglas de Oro
- No se permiten asientos contables descuadrados.
- El stock de materiales se actualiza inmediatamente después de que el POS confirma el pago.
- Las tablas del salón se bloquean automáticamente cuando tienen una orden abierta.
