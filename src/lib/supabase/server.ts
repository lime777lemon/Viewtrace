import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { authCookieContextFromHeaders } from "@/lib/supabase/auth-request-context";
import { supabaseCookieOptions } from "@/lib/supabase/cookie-options";
import { missingSupabasePublicEnvMessage, readSupabasePublicEnv } from "@/lib/supabase/public-env";

/**
 * Server Component / Server Action / Route Handler 用。
 * Cookie 経由で Auth セッションをやり取りします。
 */
export async function createSupabaseServerClient() {
  const env = readSupabasePublicEnv();
  if (!env) {
    throw new Error(missingSupabasePublicEnvMessage());
  }

  const cookieStore = await cookies();
  const { host, isHttps } = authCookieContextFromHeaders(await headers());

  return createServerClient(env.url, env.anonKey, {
    cookieOptions: supabaseCookieOptions(host, isHttps),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, headers) {
        void headers;
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component からの呼び出し時は set できない場合あり。Middleware で更新する運用可。
        }
      },
    },
  });
}
