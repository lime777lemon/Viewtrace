import { redirect } from "next/navigation";
import { POST_LOGIN_PATH } from "@/lib/auth/post-login-path";

/** `/dashboard` はログイン後の入口。中身は地域で探す。概要は `/dashboard/overview`。 */
export default function DashboardIndexPage() {
  redirect(POST_LOGIN_PATH);
}
