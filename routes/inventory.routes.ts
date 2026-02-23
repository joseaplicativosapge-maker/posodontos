
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/inventory:
 *   get:
 *     summary: Obtener inventario por sucursal.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  try {
    const items = await prisma.inventoryItem.findMany({
      where: { 
        branchId: String(branchId), 
        isActive: true 
      },
      include: { 
        supplier: true },
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/inventory:
 *   post:
 *     summary: Crear un nuevo ítem de inventario (Insumo)
 *     tags: [Inventory]
 */
router.post('/', async (req, res) => {
  try {
    const { id, branchId, name, unit, usageUnit, conversionFactor, stock, minStock, maxStock, cost, supplierId, productId } = req.body;
    
    const newItem = await prisma.inventoryItem.create({
      data: {
        id,
        branchId,
        name,
        unit,
        usageUnit: usageUnit || unit,
        conversionFactor: Number(conversionFactor) || 1,
        stock: Number(stock) || 0,
        minStock: Number(minStock) || 0,
        maxStock: Number(maxStock) || (Number(minStock) * 10),
        cost: Number(cost) || 0,
        supplierId: supplierId || null,
        productId: productId || null,
        isActive: true
      }
    });

    // Registrar movimiento inicial si hay stock
    if (Number(stock) > 0) {
        await prisma.inventoryMovement.create({
            data: {
                inventoryItemId: newItem.id,
                type: 'ENTRADA',
                quantity: Number(stock),
                previousStock: 0,
                newStock: Number(stock),
                reason: 'CARGA_INICIAL',
                reference: 'SISTEMA'
            }
        });
    }

    res.status(201).json(newItem);
    
  } catch (error: any) {
    console.error("Error en POST /api/inventory:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/inventory/{id}:
 *   put:
 *     summary: Actualizar un ítem de inventario existente
 *     tags: [Inventory]
 */
router.put('/:id', async (req, res) => {
  try {
    const { name, unit, usageUnit, conversionFactor, stock, minStock, maxStock, cost, supplierId, productId, isActive } = req.body;
    
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: req.params.id },
      data: {
        name,
        unit,
        usageUnit,
        conversionFactor: conversionFactor !== undefined ? Number(conversionFactor) : undefined,
        stock: stock !== undefined ? Number(stock) : undefined,
        minStock: minStock !== undefined ? Number(minStock) : undefined,
        maxStock: maxStock !== undefined ? Number(maxStock) : undefined,
        cost: cost !== undefined ? Number(cost) : undefined,
        supplierId: supplierId || null,
        productId: productId || null, 
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json(updatedItem);
  } catch (error: any) {
    console.error("Error en PUT /api/inventory:", error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/inventory/adjustment:
 *   post:
 *     summary: Realizar ajuste manual de stock (Entrada/Salida).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.post('/adjustment', async (req, res) => {
  const { inventoryItemId, type, quantity, reason, reference } = req.body;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: inventoryItemId } });
      if (!item) throw new Error("Artículo no encontrado");

      const prevStock = Number(item.stock);
      const moveQty = Number(quantity);
      const newStock = type === 'IN' ? prevStock + moveQty : prevStock - moveQty;

      if (newStock < 0) throw new Error("El ajuste resultaría en stock negativo");

      const updatedItem = await tx.inventoryItem.update({
        where: { id: inventoryItemId },
        data: { stock: newStock }
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId,
          type,
          quantity: moveQty,
          previousStock: prevStock,
          newStock: newStock,
          reason,
          reference
        }
      });

      return updatedItem;
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/inventory/kardex:
 *   get:
 *     summary: Obtener historial de movimientos valorizados.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 */
router.get('/kardex', async (req, res) => {
  const { inventoryItemId, startDate, endDate } = req.query;
  try {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        inventoryItemId: inventoryItemId ? String(inventoryItemId) : undefined,
        createdAt: {
          gte: startDate ? new Date(String(startDate)) : undefined,
          lte: endDate ? new Date(String(endDate)) : undefined
        }
      },
      include: { item: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(movements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
