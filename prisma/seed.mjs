// @ts-ignore
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos maestros APGE OdontOS...');

  // 1. Empresa base
  const company = await prisma.company.upsert({
    where: { id: 'c1' },
    update: {},
    create: { 
      id: 'c1',
      name: 'APGE OdontOS - Corporativo',
      taxId: '900.123.456-1',
      currency: 'COP',
      taxRate: 0.19,
      impoconsumoRate: 0.08,
      impoconsumoEnabled: true,
      loyalty: {
        enabled: true, 
        currencyPerPoint: 0, 
        pointsPerCurrency: 0, 
        minRedemptionPoints: 0, 
        accumulationBaseAmount: 0, 
        birthdayDiscountPercentage: 0
      },
      modules: {
        loyalty: true
      },
      status: 'ACTIVE',
    }
  });

  // 2. Sucursal principal
  const branch = await prisma.branch.upsert({
      where: { id: 'b1' },
      update: {},
      create: {
        id: 'b1',
        companyId: company.id,
        name: 'Clinica Centro (Sede Principal)',
        address: 'Calle 100 #15-20, Edificio Clinica',
        phone: '601 234 5678',
        email: 'centro@odontos.io',
        isActive: true
      }
    });

    // 3. Catálogo PUC
    const puc = [
      { code: '110505', name: 'Caja General', nature: 'DEBITO', statement: 'BALANCE_GENERAL' },
      { code: '111005', name: 'Bancos Nacionales', nature: 'DEBITO', statement: 'BALANCE_GENERAL' },
      // { code: '130505', name: 'Cuentas por Cobrar Clientes', nature: 'DEBITO', statement: 'BALANCE_GENERAL' },
      { code: '140505', name: 'Inventario Materia Prima', nature: 'DEBITO', statement: 'BALANCE_GENERAL' },
      { code: '143505', name: 'Inventario Productos Terminados', nature: 'DEBITO', statement: 'BALANCE_GENERAL' },
      { code: '220505', name: 'Proveedores Nacionales', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '233550', name: 'Servicios Públicos por Pagar', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '240805', name: 'IVA Generado 19%', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '240810', name: 'Impoconsumo por Pagar 8%', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '310505', name: 'Capital Social', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '360505', name: 'Utilidad del Ejercicio', nature: 'CREDITO', statement: 'BALANCE_GENERAL' },
      { code: '414005', name: 'Ingresos Restaurante / Ventas', nature: 'CREDITO', statement: 'ESTADO_RESULTADOS' },
      { code: '421005', name: 'Ingresos Financieros', nature: 'CREDITO', statement: 'ESTADO_RESULTADOS' },
      { code: '510506', name: 'Sueldos y Salarios', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '512010', name: 'Arrendamientos', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '513505', name: 'Servicios de Energía', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '513525', name: 'Acueducto y Alcantarillado', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '513535', name: 'Servicios de Internet y Comunicaciones', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '520501', name: 'Gastos de Venta / Publicidad', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '614005', name: 'Costo de Ventas - Alimentos', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' },
      { code: '614010', name: 'Costo de Ventas - Bebidas', nature: 'DEBITO', statement: 'ESTADO_RESULTADOS' }
    ];

    for (const acc of puc) {
      await prisma.accountingAccount.upsert({
         where: { 
          code_companyId: {
            code: acc.code,       // ← faltaba acc.
            companyId: company.id // ← faltaba company.id
          }
        },
        update: {
          nature: acc.nature,
          financialStatement: acc.statement
        },
        create: {
          code: acc.code,
          name: acc.name,
          nature: acc.nature,
          financialStatement: acc.statement,
          companyId: company.id
        }
      });
    }

    // 4. Roles y permisos
    const roleDefs = [
  {
    role: 'SUPER_ADMIN',
    name: 'Administrador Maestro',
    permissions: [
      'servicios.ver','servicios.crear','servicios.editar','servicios.eliminar',
      'productos.ver','productos.crear','productos.editar','productos.eliminar',
      'stock.ver','stock.ajustar',
      'inventario.ver','inventario.gestionar',
      'ventas.crear','ventas.anular',
      'caja.abrir','caja.cerrar',
      'agenda.ver','agenda.gestionar',
      'sillas.gestionar',
      'clientes.ver','clientes.gestionar',
      'historia_clinica.ver','historia_clinica.editar',
      'tratamientos.crear','tratamientos.editar',
      'reportes.ver','reportes.balance','reportes.pyg',
      'gastos.ver','gastos.crear','gastos.editar','gastos.gestionar',
      'contabilidad.puc.ver','contabilidad.puc.crear','contabilidad.puc.editar',
      'contabilidad.movimientos.ver','contabilidad.movimientos.registrar',
      'contabilidad.configurar',
      'comisiones.ver','comisiones.gestionar',
      'usuarios.gestionar','roles.gestionar','sucursales.gestionar',
      'ajustes.ver','ajustes.editar'
    ]
  },

  {
    role: 'COMPANY_ADMIN',
    name: 'Director Clínico',
    permissions: [
      'servicios.ver','servicios.crear','servicios.editar',
      'inventario.ver',
      'ventas.crear',
      'reportes.ver','reportes.balance','reportes.pyg',
      'usuarios.gestionar','sucursales.gestionar',
      'ajustes.ver'
    ]
  },

  {
    role: 'BRANCH_ADMIN',
    name: 'Administrador de Clínica',
    permissions: [
      'servicios.ver','servicios.crear','servicios.editar',
      'inventario.ver','inventario.gestionar',
      'ventas.crear','ventas.anular',
      'caja.abrir','caja.cerrar',
      'agenda.ver','agenda.gestionar',
      'clientes.ver','clientes.gestionar',
      'reportes.ver',
      'gastos.crear'
    ]
  },

  {
    role: 'CASHIER',
    name: 'Auxiliar Administrativo',
    permissions: [
      'ventas.crear','ventas.anular',
      'caja.abrir','caja.cerrar',
      'clientes.ver',
      'servicios.ver'
    ]
  },

  // WAITER → Odontólogo General
  {
    role: 'WAITER',
    name: 'Odontólogo General',
    permissions: [
      'agenda.ver','agenda.gestionar',
      'ventas.crear',
      'clientes.ver','clientes.gestionar',
      'servicios.ver',
      'historia_clinica.ver','historia_clinica.editar',
      'tratamientos.crear','tratamientos.editar',
      'comisiones.ver'
    ]
  },

  // CHEF → Especialista
  {
    role: 'CHEF',
    name: 'Odontólogo Especialista',
    permissions: [
      'agenda.ver','agenda.gestionar',
      'ventas.crear','ventas.anular',
      'clientes.ver','clientes.gestionar',
      'servicios.ver','servicios.editar',
      'historia_clinica.ver','historia_clinica.editar',
      'tratamientos.crear','tratamientos.editar',
      'comisiones.ver'
    ]
  },

  // GRILL_MASTER → Especialista Senior / Cirujano
  {
    role: 'GRILL_MASTER',
    name: 'Especialista Senior / Cirujano',
    permissions: [
      'agenda.ver','agenda.gestionar',
      'ventas.crear',
      'servicios.ver',
      'historia_clinica.ver','historia_clinica.editar',
      'clientes.ver'
    ]
  },

  // BARTENDER → Recepcionista
  {
    role: 'BARTENDER',
    name: 'Recepcionista',
    permissions: [
      'agenda.ver','agenda.gestionar',
      'ventas.crear',
      'caja.abrir','caja.cerrar',
      'clientes.ver','clientes.gestionar',
      'servicios.ver'
    ]
  },

  {
    role: 'ACCOUNTING_ADMIN',
    name: 'Contador / Auditor',
    permissions: [
      'reportes.ver','reportes.balance','reportes.pyg',
      'gastos.ver','gastos.crear',
      'contabilidad.puc.ver','contabilidad.puc.crear','contabilidad.puc.editar',
      'contabilidad.movimientos.ver','contabilidad.movimientos.registrar',
      'contabilidad.configurar',
      'ajustes.ver'
    ]
  }
];

  for (const r of roleDefs) {
    await prisma.roleDefinition.upsert({
      where: { role: r.role },
      update: { name: r.name, permissions: r.permissions },
      create: { 
        role: r.role, 
        name: r.name, 
        permissions: r.permissions 
      }
    });
  }

  // 5. Usuario inicial
  await prisma.user.upsert({
    where: { email: 'admin@odontos.io' },
    update: { isActive: true, pin: '1111' },
    create: {
      id: 'u-maestro-init',
      name: 'ADMINISTRADOR SISTEMA',
      email: 'admin@odontos.io',
      pin: '1111',
      role: 'SUPER_ADMIN',
      branchId: branch.id,
      companyId: company.id,
      isActive: true
    }
  });

  // 6. Caja principal (SOLO campos existentes)
  await prisma.cashRegister.upsert({
    where: { id: 'reg-principal-b1' },
    update: {},
    create: {
      id: 'reg-principal-b1',
      name: 'CAJA PRINCIPAL',
      isOpen: false,
      isActive: true,
      printType: 'PDF',
      qzPrinterName: '',
      ticketFooter: '¡Gracias por su visita!',
      autoPrint: false,
      branchId: branch.id
    }
  });

  // 7. Categorías
  const categories = ['ODONTOLOGÍA GENERAL','OPERATORIA / RESTAURADORA','ENDODONCIA','CIRUGÍA ORAL'
      , 'ORTODONCIA', 'PERIODONCIA', 'PROSTODONCIA', 'IMPLANTOLOGÍA', 'ODONTOPEDIATRÍA'];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: `cat-${cat.toLowerCase().replace(/\s+/g,'-')}` },
      update: {},
      create: {
        id: `cat-${cat.toLowerCase().replace(/\s+/g,'-')}`,
        name: cat,
        isActive: true,
        company: {
          connect: { id: company.id }
        }
      }
    });
  }

  console.log('✅ Base de datos inicializada con éxito');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
