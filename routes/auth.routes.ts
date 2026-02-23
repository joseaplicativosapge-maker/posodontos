
import { Router } from 'express';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'odontos_SaaS_2025_secure_key';

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión mediante PIN.
 *     tags: [Autenticacion]
 */
router.post('/login', async (req, res) => {
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ error: "Se requiere un PIN de acceso." });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { 
        pin: String(pin),
        isActive: true,    
        company: {
          is: {
            status: "ACTIVE"
          }
        },

        branch: {
          is: {
            isActive: true
          }
        }
      },
      include: {
        branch: true,
        company: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: "PIN incorrecto, usuario no existe o cuenta inactiva." });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role, 
        branchId: user.branchId,
        companyId: user.companyId 
      }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        companyId: user.companyId,
        branchName: user?.branch?.name || 'Sede Principal'
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: "Error en el servidor: " + error.message });
  }
});

router.get('/verify', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: "No autorizado" });

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { branch: true }
    });

    if (!user || !user.isActive) return res.status(401).json({ error: "Sesión inválida" });

    res.json({
      valid: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        companyId: user.companyId,
        branchName: user.branch?.name
      }
    });
  } catch (error) {
    res.status(401).json({ error: "Sesión expirada" });
  }
});

export default router;
