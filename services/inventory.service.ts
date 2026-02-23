
// @ts-ignore
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class InventoryService {
  /**
   * Descuenta inventario de forma recursiva (maneja ingredientes y combos).
   */
  static async deductStock(productId: string, quantity: number, reference: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { ingredients: true, comboChildren: true }
    });

    if (!product) return;

    if (product.type === 'DIRECT_SALE' || product.type === 'PREPARED') {
      // Descontar cada ingrediente definido en la receta
      for (const ingredient of product.ingredients) {
        await this.registerMovement(
          ingredient.inventoryItemId,
          'OUT',
          Number(ingredient.quantity) * quantity,
          `Venta: ${product.name}`,
          reference
        );
      }
    } else if (product.type === 'COMBO') {
      // Si es combo, llamar recursivamente para cada producto del combo
      for (const comboChildren of product.comboChildren) {
        await this.deductStock(comboChildren.childProductId, comboChildren.quantity * quantity, reference);
      }
    }
  }

  private static async registerMovement(itemId: string, type: 'IN' | 'OUT', qty: number, reason: string, ref: string) {
    await prisma.$transaction(async (tx: any) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) return;

      const newStock = type === 'IN' ? Number(item.stock) + qty : Number(item.stock) - qty;

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { stock: newStock }
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: itemId,
          type,
          quantity: qty,
          reason,
          reference: ref
        }
      });
    });
  }
}
