
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/company/settings:
 *   get:
 *     summary: Obtener la configuración fiscal y de fidelidad global de la empresa.
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.get('/settings', async (req, res) => {
  try {
    let companyId = req.query.companyId;
    const company = await prisma.company.findFirst({
      where: {
        id: companyId,
      },
    });
    res.json(company);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/company/settings:
 *   put:
 *     summary: Actualizar parámetros globales (Impuestos, Moneda, Puntos).
 *     tags: [Empresa]
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', async (req, res) => {
  try {
    const current = await prisma.company.findFirst();

    if (!current) {
        return res.status(404).json({ error: "No se encontró el registro maestro de la empresa. Ejecute el seeder." });
    }
    
    const updated = await prisma.company.update({
      where: { id: current.id },
      data: req.body
    });
    res.json(updated);
  } catch (error: any) {
    console.error("Error actualizando ajustes sep:", error);
    res.status(400).json({ error: error.message });
  }
});

export default router;