-- AlterTable
ALTER TABLE "Source" ADD COLUMN     "parsedText" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingError" TEXT;

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "notebookId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestampStartMs" INTEGER,
    "timestampEndMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SourceChunk_notebookId_idx" ON "SourceChunk"("notebookId");

-- CreateIndex
CREATE UNIQUE INDEX "SourceChunk_sourceId_chunkIndex_key" ON "SourceChunk"("sourceId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "SourceChunk" ADD CONSTRAINT "SourceChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;
