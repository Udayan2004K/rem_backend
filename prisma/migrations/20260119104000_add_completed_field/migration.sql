-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Obligation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Obligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Obligation" ("createdAt", "dueDate", "id", "title", "updatedAt", "userId") SELECT "createdAt", "dueDate", "id", "title", "updatedAt", "userId" FROM "Obligation";
DROP TABLE "Obligation";
ALTER TABLE "new_Obligation" RENAME TO "Obligation";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
