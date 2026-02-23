
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import { InventoryService } from '../services/inventory.service.js';
import { AccountingService } from '../services/accounting.service.js';
import { OrderType, OrderStatus, TableStatus } from './../types.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/pos/sale:
 *   post:
 *     summary: Procesa una venta final POS, descuenta stock y genera contabilidad.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.post('/sale', async (req, res) => {
  const { tableId, items, paymentMethod, subtotal, tax, total } = req.body;

  try {
    const result = await prisma.$transaction(async (tx: any) => {
     
      const order = await tx.order.update({
          where: { id: req.body.orderId },
          data: {
            status: OrderStatus.COMPLETED, 
            paymentMethod,
            subtotal,
            tax,
            total,
            items: {
              updateMany: items.map(it => ({
                where: { productId: it.productId },
                data: { quantity: it.quantity, price: it.price }
              }))
            }
          },
      });

      // 2. Liberar silla si aplica
      if (tableId) {
        await tx.table.update({
          where: { id: tableId },
          data: { status: TableStatus.AVAILABLE }
        });
      }

      // 3. Descontar Inventario Recursivo
      for (const it of items) {
        await InventoryService.deductStock(it.productId, it.quantity, `VENTA-${order.id.slice(-6)}`);
      }

      return order;
    });

    // 4. Asentar Contabilidad (Fuera de la transacción principal para no bloquear)
    await AccountingService.processSaleAccounting(result);

    res.json({ success: true, orderId: result.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/pos/orders/completed:
 *   get:
 *     summary: Lista todas las órdenes activas (completadas) de una sucursal
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
// es aca: endpoint para alimentar el monitor del POS con datos vivos
router.get('/orders/completed', async (req, res) => {
  const { branchId } = req.query;
  try {
    const orders = await prisma.order.findMany({
      where: {
        branchId: String(branchId),
        status: {
          in: ['COMPLETED']
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/pos/orders:
 *   get:
 *     summary: Lista todas las órdenes activas (no completadas/canceladas) de una sucursal
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
// es aca: endpoint para alimentar el monitor del POS con datos vivos
router.get('/orders', async (req, res) => {
  const { branchId } = req.query;
  try {
    const orders = await prisma.order.findMany({
      where: {
        branchId: String(branchId),
        status: {
          notIn: ['COMPLETED', 'CANCELLED']
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/pos/order:
 *   post:
 *     summary: Crea una comanda (Orden pendiente) para cocina/barra
 *     tags: [Productos]
 */
router.post('/order', async (req, res) => {

  const { branchId, tableId, items, type, customerId, seatNumber, subtotal, tax, impoconsumoAmount, total, deliveryAddress } = req.body;
  try {    
    const customer = (customerId === 'consumidor-final' ? null : customerId);
    const order = await prisma.order.create({
      data: {
        branchId,
        tableId,
        customerId: customer,
        seatNumber,
        status: OrderStatus.PENDING,
        type: type || (tableId ? OrderType.DINE_IN : OrderType.TAKEAWAY),
        subtotal: subtotal || 0,
        tax: tax || 0,
        impoconsumoAmount: impoconsumoAmount || 0,
        total: total || 0,
        deliveryAddress,
        items: {
          create: (items || []).map((it: any) => ({
            productId: it.productId,
            quantity: it.quantity,
            price: it.price 
          }))
        }
      },
      include: { items: true }
    });

    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: TableStatus.OCCUPIED }
      });
    }

    res.status(201).json(order);
  } catch (error: any) {
    console.error("Error en POST /api/pos/order:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/order/{id}:
 *   post:
 *     summary: Permite actualizar una orden.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/order/:id', async (req, res) => {
    try {
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: req.body
        });
        res.json(order);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * @openapi
 * /api/order/{id}:
 *   post:
 *     summary: Permite actualizar el estado de una orden.
 *     tags: [Productos]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/order/:id/status', async (req, res) => {
    try {
        const order = await prisma.order.update({
            where: { id: req.params.id },
            data: { status: req.body.status }
        });
        res.json(order);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
