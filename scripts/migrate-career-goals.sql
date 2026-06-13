UPDATE "students" SET "careerGoal" = 'HIGHER_STUDIES' WHERE "careerGoal"::text IN ('HIGHER_STUDIES_INDIA', 'HIGHER_STUDIES_ABROAD');
UPDATE "students" SET "careerGoal" = 'NOT_SURE' WHERE "careerGoal"::text = 'GOVERNMENT_EXAMS';
