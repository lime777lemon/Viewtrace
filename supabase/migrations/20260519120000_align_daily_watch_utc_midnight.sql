-- daily 自動観測を UTC 0:00（JST 9:00 / ET 前日 20:00）の Cron に合わせる。
-- next_run_at が手動実行時刻からずれている行を次回 Cron で再スケジュールする。
UPDATE public.observation_watches
SET
  next_run_at = NULL,
  updated_at = timezone('utc', now())
WHERE enabled = true
  AND schedule_frequency = 'daily';
