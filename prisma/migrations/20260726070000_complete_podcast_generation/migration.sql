ALTER TABLE "Podcast"
  ADD COLUMN IF NOT EXISTS "tone" TEXT NOT NULL DEFAULT 'conversational',
  ADD COLUMN IF NOT EXISTS "genre" TEXT NOT NULL DEFAULT 'educational',
  ADD COLUMN IF NOT EXISTS "audience" TEXT NOT NULL DEFAULT 'intermediate',
  ADD COLUMN IF NOT EXISTS "speakerCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "voiceAssignments" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "generationStatus" "PodcastStatus" NOT NULL DEFAULT 'GENERATING',
  ADD COLUMN IF NOT EXISTS "generationStage" TEXT NOT NULL DEFAULT 'Preparing Sources',
  ADD COLUMN IF NOT EXISTS "generationError" TEXT;

UPDATE "Podcast"
SET
  "speakerCount" = COALESCE("speakers", 1),
  "generationStatus" = COALESCE("status", 'GENERATING');
