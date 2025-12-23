-- 清除現有測試資料後新增欄位
TRUNCATE TABLE "game_logs";
ALTER TABLE "game_logs" ADD COLUMN "sequence_number" integer NOT NULL;