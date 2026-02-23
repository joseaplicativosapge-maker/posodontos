
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/registers:
 *   get:
 *     summary: Listar terminales de venta (Cajas) por sucursal.
 *     tags: [Cajas]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  try {
    const registers = await prisma.cashRegister.findMany({
      where: {
        branchId: branchId ? String(branchId) : undefined,
        isActive: true
      },
      include: {
        sessions: {
          where: {
            endTime: null
          },
          orderBy: {
            startTime: 'desc'
          },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json(registers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }

});


/**
 * @openapi
 * /api/registers/{id}/open:
 *   post:
 *     summary: Abre una caja e inicia un turno (Sesión)
 *     tags: [Cajas]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/open', async (req, res) => {
  const { id } = req.params;
  const { userId, userName, amount } = req.body;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Validar que la caja existe
      const existing = await tx.cashRegister.findUnique({ where: { id } });
      if (!existing) throw new Error("La caja no existe en la base de datos.");

      // 2. Actualizar estado de la caja física
      const register = await tx.cashRegister.update({
          where: { id },
          data: { 
            isOpen: true,
            currentUser: {
              connect: { id: userId }
            }
          }
        });

      // 3. Crear registro de sesión (Turno)
      await tx.registerSession.create({
        data: {
          registerId: id,
          userId: userId,
          userName: userName,
          openingAmount: Number(amount),
          totalSales: 0,
          startTime: new Date()
        }
      });

      return register;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error abriendo caja:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/registers/{id}/close:
 *   post:
 *     summary: Cierra la caja actual y finaliza el turno
 *     tags: [Cajas]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/close', async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Buscar sesión activa
      const session = await tx.registerSession.findFirst({
        where: { registerId: id, endTime: null },
        orderBy: { startTime: 'desc' }
      });

      if (!session) throw new Error("No hay una sesión activa para esta caja.");
      
      // 2. Cerrar sesión
      await tx.registerSession.update({
        where: { id: session.id },
        data: {
          endTime: new Date(),
          closingAmount: Number(amount),
          isClosed: true
        }
      });

      // 3. Actualizar caja física a estado cerrado
      return await tx.cashRegister.update({
        where: { id },
        data: { 
          isOpen: false,
          currentUser: {
            disconnect: true
          }
        }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// CRUD Adicional de cajas
router.post('/', async (req, res) => {
  try {
    const register = await prisma.cashRegister.create({ data: req.body });
    res.status(201).json(register);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const register = await prisma.cashRegister.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(register);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.cashRegister.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;