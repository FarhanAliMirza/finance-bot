-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Card', 'UPI');

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN "paymentMethod" "PaymentMethod";
