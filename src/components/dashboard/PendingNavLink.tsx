"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent, type ReactNode } from "react";

export function PendingNavLink({
  href,
  className,
  children,
  pendingLabel,
  ariaLabel,
  dataTour,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  pendingLabel: string;
  ariaLabel?: string;
  dataTour?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (pending) return;
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      className={className}
      aria-label={ariaLabel}
      aria-busy={pending || undefined}
      data-tour={dataTour}
      onClick={onClick}
    >
      {pending ? pendingLabel : children}
    </Link>
  );
}
