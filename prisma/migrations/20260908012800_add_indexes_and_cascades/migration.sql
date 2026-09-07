-- Add indexes per File 03 recommendations
-- Add cascade rules for FeedbackTheme and Embedding on Feedback delete

-- User indexes
CREATE INDEX "User_workspaceId_idx" ON "User"("workspaceId");
CREATE INDEX "User_workspaceId_role_idx" ON "User"("workspaceId", "role");

-- Feedback indexes
CREATE INDEX "Feedback_workspaceId_createdAt_idx" ON "Feedback"("workspaceId", "createdAt");
CREATE INDEX "Feedback_workspaceId_status_createdAt_idx" ON "Feedback"("workspaceId", "status", "createdAt");
CREATE INDEX "Feedback_workspaceId_sentiment_createdAt_idx" ON "Feedback"("workspaceId", "sentiment", "createdAt");
CREATE INDEX "Feedback_workspaceId_channel_createdAt_idx" ON "Feedback"("workspaceId", "channel", "createdAt");

-- Theme indexes
CREATE INDEX "Theme_workspaceId_name_idx" ON "Theme"("workspaceId", "name");

-- FeedbackTheme indexes
CREATE INDEX "FeedbackTheme_themeId_feedbackId_idx" ON "FeedbackTheme"("themeId", "feedbackId");

-- Embedding indexes
CREATE INDEX "Embedding_workspaceId_feedbackId_idx" ON "Embedding"("workspaceId", "feedbackId");

-- Report indexes
CREATE INDEX "Report_workspaceId_createdAt_idx" ON "Report"("workspaceId", "createdAt");
CREATE INDEX "Report_workspaceId_periodStart_periodEnd_idx" ON "Report"("workspaceId", "periodStart", "periodEnd");

-- Update FeedbackTheme cascade rules (drop old FK, add new with CASCADE)
ALTER TABLE "FeedbackTheme" DROP CONSTRAINT "FeedbackTheme_feedbackId_fkey";
ALTER TABLE "FeedbackTheme" ADD CONSTRAINT "FeedbackTheme_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackTheme" DROP CONSTRAINT "FeedbackTheme_themeId_fkey";
ALTER TABLE "FeedbackTheme" ADD CONSTRAINT "FeedbackTheme_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update Embedding cascade rules
ALTER TABLE "Embedding" DROP CONSTRAINT "Embedding_feedbackId_fkey";
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;
