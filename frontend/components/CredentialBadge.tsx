"use client";

import type { Credential } from "@/lib/contracts/types";

function memberSinceYear(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : String(d.getFullYear());
}

function formatDuration(fromSeconds: number, nowSeconds: number): string {
  const diff = Math.max(0, nowSeconds - fromSeconds);
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

interface CredentialBadgeProps {
  credential: Credential | null;
  now: number;
  className?: string;
}

/**
 * The physical ID-badge hero: a landscape card sitting on the dark app
 * shell, showing either a real verified credential or an empty "not yet
 * verified" placeholder in the same shape.
 */
export function CredentialBadge({ credential, now, className = "" }: CredentialBadgeProps) {
  const verified = !!credential?.github_username;
  const avatarUrl = verified ? `https://github.com/${credential!.github_username}.png?size=160` : undefined;

  return (
    <div className={`transform -rotate-[2.2deg] ${className}`}>
      <div className="badge-card overflow-hidden relative w-[400px] max-w-full">
        <div
          className="relative px-[18px] pt-[9px] pb-[22px]"
          style={{ background: "linear-gradient(120deg, var(--primary) 0%, oklch(0.46 0.20 288) 100%)" }}
        >
          <div
            className="absolute left-1/2 top-[9px] -translate-x-1/2 w-[15px] h-[15px] rounded-full bg-background"
            style={{ boxShadow: "inset 0 0 0 2px rgb(0 0 0 / 0.15)" }}
          />
          <div className="eyebrow text-center" style={{ color: "rgb(255 255 255 / 0.82)" }}>
            GenLayer Verified Credential
          </div>
        </div>

        <div className="px-[18px] pt-0 -mt-3 grid grid-cols-[78px_1fr] gap-3.5">
          <div
            className="w-[78px] h-[78px] rounded-[10px] border-[3px] shrink-0 overflow-hidden bg-muted flex items-center justify-center"
            style={{ borderColor: "var(--badge)", boxShadow: "0 3px 10px rgb(0 0 0 / 0.18)" }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={`@${credential!.github_username}`} width={78} height={78} className="w-full h-full object-cover" />
            ) : (
              <span className="text-badge-foreground/30 text-3xl font-extrabold">?</span>
            )}
          </div>

          <div className="pt-1 min-w-0">
            <div className="text-[1.18rem] font-extrabold tracking-tight truncate" style={{ color: "var(--badge-foreground)" }}>
              {verified ? `@${credential!.github_username}` : "Not yet verified"}
            </div>
            <div className="mt-0.5 text-[0.68rem] font-mono break-all" style={{ color: "var(--badge-foreground-dim)" }}>
              {verified ? credential!.wallet : "Connect a wallet and verify to see it here"}
            </div>
            <div
              className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-[3px] text-[0.66rem] font-bold"
              style={
                verified
                  ? { background: "oklch(0.62 0.13 152 / 0.14)", color: "var(--success)", border: "1px solid oklch(0.62 0.13 152 / 0.4)" }
                  : { background: "oklch(0.6 0.01 295 / 0.12)", color: "var(--badge-foreground-dim)", border: "1px solid var(--badge-border)" }
              }
            >
              {verified ? "✓ Verified" : "Unverified"}
            </div>
          </div>
        </div>

        <div className="mx-[18px] mt-4 pt-3.5 border-t grid grid-cols-2 gap-x-4 gap-y-2.5" style={{ borderColor: "var(--badge-border)" }}>
          <div>
            <label className="block text-[0.6rem] tracking-wider uppercase mb-0.5" style={{ color: "var(--badge-foreground-dim)" }}>Member Since</label>
            <div className="text-[0.86rem] font-bold" style={{ color: "var(--badge-foreground)" }}>{verified ? memberSinceYear(credential!.member_since) : "—"}</div>
          </div>
          <div>
            <label className="block text-[0.6rem] tracking-wider uppercase mb-0.5" style={{ color: "var(--badge-foreground-dim)" }}>Verified</label>
            <div className="text-[0.86rem] font-bold" style={{ color: "var(--badge-foreground)" }}>
              {verified ? formatDuration(parseInt(credential!.verified_at, 10), now) : "—"}
            </div>
          </div>
          <div>
            <label className="block text-[0.6rem] tracking-wider uppercase mb-0.5" style={{ color: "var(--badge-foreground-dim)" }}>Repositories</label>
            <div className="text-[0.86rem] font-bold tabular" style={{ color: "var(--badge-foreground)" }}>{verified ? credential!.public_repos : "—"}</div>
          </div>
          <div>
            <label className="block text-[0.6rem] tracking-wider uppercase mb-0.5" style={{ color: "var(--badge-foreground-dim)" }}>Followers</label>
            <div className="text-[0.86rem] font-bold tabular" style={{ color: "var(--badge-foreground)" }}>{verified ? credential!.followers : "—"}</div>
          </div>
        </div>

        <div className="hologram-strip mt-4 h-5 flex items-center overflow-hidden">
          <span className="font-mono text-[0.56rem] tracking-[0.25em] pl-3 opacity-65 whitespace-nowrap" style={{ color: "var(--badge-foreground-dim)" }}>
            GENLAYER &nbsp;·&nbsp; GENLAYER &nbsp;·&nbsp; GENLAYER &nbsp;·&nbsp; GENLAYER &nbsp;·&nbsp; GENLAYER &nbsp;·&nbsp;
          </span>
        </div>
      </div>
    </div>
  );
}
