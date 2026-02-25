-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Umum',
    "stockPcs" INTEGER NOT NULL DEFAULT 0,
    "qtyPerDus" INTEGER NOT NULL DEFAULT 12,
    "buyPrice" INTEGER NOT NULL DEFAULT 0,
    "pricePcs" INTEGER NOT NULL,
    "priceDus" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Product" ("category", "createdAt", "id", "name", "priceDus", "pricePcs", "qtyPerDus", "stockPcs", "updatedAt") SELECT "category", "createdAt", "id", "name", "priceDus", "pricePcs", "qtyPerDus", "stockPcs", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE TABLE "new_Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "invoiceNo" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "payAmount" INTEGER NOT NULL DEFAULT 0,
    "changeAmount" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT NOT NULL DEFAULT 'CASH',
    "customerType" TEXT NOT NULL DEFAULT 'Umum',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transaction" ("createdAt", "customerType", "id", "invoiceNo", "total") SELECT "createdAt", "customerType", "id", "invoiceNo", "total" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE UNIQUE INDEX "Transaction_invoiceNo_key" ON "Transaction"("invoiceNo");
CREATE TABLE "new_TransactionItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "buyPrice" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL,
    CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TransactionItem" ("id", "price", "productId", "productName", "qty", "subtotal", "transactionId", "unit") SELECT "id", "price", "productId", "productName", "qty", "subtotal", "transactionId", "unit" FROM "TransactionItem";
DROP TABLE "TransactionItem";
ALTER TABLE "new_TransactionItem" RENAME TO "TransactionItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
