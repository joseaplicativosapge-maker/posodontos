import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class InventoryService {
  static async deductStock(productId: string, quantity: number, reference: string) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { ingredients: true, comboChildren: true }
    });
    if (!product) return;

    if (product.type === 'VENTA_DIRECTA' || product.type === 'PREPARADO') {
      for (const ingredient of product.ingredients) {
        await this.registerMovement(
          ingredient.inventoryItemId,
          'SALIDA',
          Number(ingredient.quantity) * quantity,
          `Venta: ${product.name}`,
          reference
        );
      }
    } else if (product.type === 'COMBO') {
      for (const comboChild of product.comboChildren) {
        await this.deductStock(comboChild.childProductId, comboChild.quantity * quantity, reference);
      }
    }
  }

  private static async registerMovement(itemId: string, type: 'ENTRADA' | 'SALIDA', qty: number, reason: string, ref: string) {
    await prisma.$transaction(async (tx: any) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId } });
      if (!item) return;

      const previousStock = Number(item.stock);
      const newStock = type === 'ENTRADA' ? previousStock + qty : previousStock - qty;

      await tx.inventoryItem.update({
        where: { id: itemId },
        data: { stock: newStock }
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: itemId,
          type,
          quantity: qty,
          previousStock,
          newStock,
          reason,
          reference: ref
        }
      });
    });
  }
}