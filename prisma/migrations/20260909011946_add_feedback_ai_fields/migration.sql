-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "category" TEXT,
ADD COLUMN     "classificationModel" TEXT,
ADD COLUMN     "classifiedAt" TIMESTAMP(3),
ADD COLUMN     "urgency" TEXT;

-- CreateIndex
CREATE INDEX "Feedback_workspaceId_urgency_idx" ON "Feedback"("workspaceId", "urgency");
