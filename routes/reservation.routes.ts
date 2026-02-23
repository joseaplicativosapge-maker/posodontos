
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/reservations:
 *   get:
 *     summary: Obtener todas las reservas de una sucursal
 *     tags: [Reservations]
 */
router.get('/', async (req, res) => {
  const { branchId } = req.query;
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        branchId: branchId ? String(branchId) : undefined
      },
      orderBy: {
        date: 'asc'
      }
    });
    res.json(reservations);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/reservations:
 *   post:
 *     summary: Crear una nueva reserva desde el portal público o admin
 *     tags: [Reservations]
 */
router.post('/', async (req, res) => {
  const { id, branchId, customerName, customerPhone, customerEmail, date, time, seats, notes, status } = req.body;
  try {
    const reservation = await prisma.reservation.create({
      data: {
        id: id || `res-${Date.now()}`,
        branchId,
        customerName,
        customerPhone,
        customerEmail,
        date,
        time,
        seats: Number(seats),
        notes,
        status: status || 'PENDIENTE'
      }
    });
    res.status(201).json(reservation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/reservations/{id}/status:
 *   patch:
 *     summary: Actualizar el estado de una reserva (Confirmar/Cancelar)
 *     tags: [Reservations]
 */
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const reservation = await prisma.reservation.update({
      where: { id },
      data: { status }
    });
    res.json(reservation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;