import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

// Rutas
import authRoutes from './routes/auth.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import accountingRoutes from './routes/accounting.routes.js';
import posRoutes from './routes/pos.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import tableRoutes from './routes/table.routes.js';
import kdsRoutes from './routes/kds.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import productRoutes from './routes/product.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import purchaseRoutes from './routes/purchase.routes.js';
import customerRoutes from './routes/customer.routes.js';

// Ajustes
import branchRoutes from './routes/branch.routes.js';
import companyRoutes from './routes/company.routes.js';
import registerRoutes from './routes/register.routes.js';
import categoryRoutes from './routes/category.routes.js';
import userRoutes from './routes/user.routes.js';
import roleRoutes from './routes/role.routes.js';
import reservationRoutes from './routes/reservation.routes.js';

import compression from 'compression';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100mb' }));

/* ============================
   🚫 DISABLE CACHE (CRÍTICO)
============================ */
app.use((req, res, next) => {
  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

/* ============================
   SWAGGER CONFIG PRO
============================ */
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'APGE OdontOS SaaS API',
      version: '1.0.0',
      description:
        'Documentación oficial del backend APGE OdontOS POS multisucursal.',
      contact: {
        name: 'APGE OdontOS Dev Team',
        email: 'dev@odontos.io',
      },
    },

    servers: [
      {
        url: process.env.API_URL,
        description: 'Local Development',
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./routes/**/*.ts'],
};


const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      docExpansion: 'none', 
      defaultModelsExpandDepth: -1,
      displayRequestDuration: true, 
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customSiteTitle: 'OdontOS API Docs',
  })
);


/* ============================
   API ROUTES
============================ */
app.use('/api/auth', authRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/kds', kdsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);

// Ajustes
app.use('/api/branches', branchRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/registers', registerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/reservations', reservationRoutes); 

/* ============================
   HEALTHCHECK
============================ */
app.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    service: 'odonto-os-backend',
    time: new Date(),
  });
});

/* ============================
   SERVER
============================ */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend activo en http://localhost:${PORT}`);
  console.log(`📚 Swagger en http://localhost:${PORT}/api-docs`);
});