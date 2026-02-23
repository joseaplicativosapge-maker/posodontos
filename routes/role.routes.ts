
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/roles:
 *   get:
 *     summary: Obtener la definición de roles y sus permisos granulares.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  try {
    const roles = await prisma.roleDefinition.findMany();
    res.json(roles);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/roles:
 *   put:
 *     summary: Modificar permisos de un rol existente.
 *     tags: [Usuarios] 
 *     security:
 *       - bearerAuth: []
 */
router.put('/', async (req, res) => {
  try {
    const roles = req.body; // ARRAY

    const results = await prisma.$transaction(
      roles.map((r: any) =>
        prisma.roleDefinition.update({
          where: { role: r.role },
          data: {
            name: r.name,
            permissions: r.permissions
          }
        })
      )
    );

    res.json(results);
  } catch (error: any) {
    console.error("Error en PUT /api/roles:", error);
    res.status(400).json({ error: error.message });
  }
})

export default router;