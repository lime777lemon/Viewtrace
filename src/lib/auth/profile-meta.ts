/** Supabase Auth user_metadata と trial_signups で共通のキー */

export type ProfileMetaInput = {
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
};

export function normalizeProfileMeta(input: {
  fullName?: string;
  companyName?: string;
  phone?: string;
}): ProfileMetaInput {
  const full = (input.fullName ?? "").trim().slice(0, 200);
  const company = (input.companyName ?? "").trim().slice(0, 200);
  const phone = (input.phone ?? "").trim().slice(0, 40);
  return {
    full_name: full.length > 0 ? full : null,
    company_name: company.length > 0 ? company : null,
    phone: phone.length > 0 ? phone : null,
  };
}

/** チェックアウト等: 空欄は既存メタデータを上書きしない（入力した項目だけ反映） */
export function mergeNonEmptyProfileFromRequestBody(
  existing: Record<string, unknown> | null | undefined,
  body: { fullName?: unknown; companyName?: unknown; phone?: unknown },
): Record<string, unknown> {
  const next = { ...(existing ?? {}) };
  if (typeof body.fullName === "string" && body.fullName.trim()) {
    next.full_name = body.fullName.trim().slice(0, 200);
  }
  if (typeof body.companyName === "string" && body.companyName.trim()) {
    next.company_name = body.companyName.trim().slice(0, 200);
  }
  if (typeof body.phone === "string" && body.phone.trim()) {
    next.phone = body.phone.trim().slice(0, 40);
  }
  return next;
}

export function checkoutProfileHasAnyInput(body: {
  fullName?: unknown;
  companyName?: unknown;
  phone?: unknown;
}): boolean {
  return (
    (typeof body.fullName === "string" && body.fullName.trim().length > 0) ||
    (typeof body.companyName === "string" && body.companyName.trim().length > 0) ||
    (typeof body.phone === "string" && body.phone.trim().length > 0)
  );
}

export function profileMetaFromUserMetadata(
  meta: Record<string, unknown> | undefined | null,
): ProfileMetaInput {
  if (!meta) {
    return { full_name: null, company_name: null, phone: null };
  }
  const full = typeof meta.full_name === "string" ? meta.full_name.trim().slice(0, 200) : "";
  const company =
    typeof meta.company_name === "string" ? meta.company_name.trim().slice(0, 200) : "";
  const phone = typeof meta.phone === "string" ? meta.phone.trim().slice(0, 40) : "";
  return {
    full_name: full.length > 0 ? full : null,
    company_name: company.length > 0 ? company : null,
    phone: phone.length > 0 ? phone : null,
  };
}
