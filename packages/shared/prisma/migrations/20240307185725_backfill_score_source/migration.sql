-- scores previously created in the Aletheia UI all had the name 'manual-score'
UPDATE "scores"
SET "source" = 'REVIEW'::"ScoreSource"
WHERE "name" = 'manual-score';
