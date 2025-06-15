-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Movie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "posterUrl" TEXT,
    "tmdbId" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'MOVIE'
);
INSERT INTO "new_Movie" ("id", "posterUrl", "title", "tmdbId", "year") SELECT "id", "posterUrl", "title", "tmdbId", "year" FROM "Movie";
DROP TABLE "Movie";
ALTER TABLE "new_Movie" RENAME TO "Movie";
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
