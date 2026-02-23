
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Listar todos los colaboradores (Staff) de la empresa.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', async (req, res) => {
  const { companyId, branchId } = req.query;

  try {
    const users = await prisma.user.findMany({
      where: {
        ...(companyId && { companyId: String(companyId) }),
        ...(branchId && { branchId: String(branchId) })
      },
      include: {
        branch: { select: { name: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


/**
 * @openapi
 * /api/users:
 *   post:
 *     summary: Dar de alta a un nuevo integrante en el equipo.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: req.body
    });
    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar perfil o permisos de un colaborador.
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
