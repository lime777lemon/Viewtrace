import { isBrowserlessConfigured } from "@/lib/browserless-screenshot";
import { isResendConfigured } from "@/lib/resend";

/** Cron がメール・スクリーンショットを送るために必要な環境（秘密は返さない） */
export type ScheduledObservationEnvStatus = {
  cronSecret: boolean;
  supabaseAdmin: boolean;
  resend: boolean;
  browserless: boolean;
  /** Vercel 上でビルドされているか（Cron ジョブが付く前提） */
  onVercel: boolean;
};

export function getScheduledObservationEnvStatus(): ScheduledObservationEnvStatus {
  return {
    cronSecret: Boolean(process.env.CRON_SECRET?.trim()),
    supabaseAdmin: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
    ),
    resend: isResendConfigured(),
    browserless: isBrowserlessConfigured(),
    onVercel: process.env.VERCEL === "1",
  };
}
