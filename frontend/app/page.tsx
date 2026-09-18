"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { CredentialBadge } from "@/components/CredentialBadge";
import { AddressDisplay } from "@/components/AddressDisplay";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/genlayer/wallet";
import { useCredentialByWallet, useAllCredentials, useVerify } from "@/lib/hooks/useHandle";
import { getTxExplorerUrl } from "@/lib/genlayer/chains";
import { success as toastSuccess } from "@/lib/utils/toast";

function useNowSeconds() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 15000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function shortSince(fromSeconds: string, nowSeconds: number): string {
  const from = parseInt(fromSeconds, 10) || 0;
  const diff = Math.max(0, nowSeconds - from);
  const days = Math.floor(diff / 86400);
  if (days >= 1) return `${days}d`;
  const hours = Math.floor(diff / 3600);
  if (hours >= 1) return `${hours}h`;
  const mins = Math.floor(diff / 60);
  return `${Math.max(mins, 0)}m`;
}

export default function HomePage() {
  const { address, isConnected } = useWallet();
  const now = useNowSeconds();

  const { data: myCredential, isLoading: myCredentialLoading } = useCredentialByWallet(address);
  const { data: allCredentials, isLoading: wallLoading } = useAllCredentials();
  const { verify, isVerifying, pendingTxHash, clearPendingTx } = useVerify();

  const [username, setUsername] = useState("");
  const verifyString = address ? `genlayer-verify:${address.toLowerCase()}` : "genlayer-verify:0x...";
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyString);
      setCopied(true);
      toastSuccess("Verification string copied!");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard access denied - the string is still visible to select manually
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    clearPendingTx();
    verify(username.trim().replace(/^@/, ""));
  };

  const wall = (allCredentials ?? []).filter((c) => c.github_username !== myCredential?.github_username);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-20">
        <div className="max-w-3xl mx-auto px-5 md:px-7">
          <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
            <div className="flex justify-center lg:justify-start">
              {myCredentialLoading ? (
                <div className="w-[400px] max-w-full h-[280px] rounded-2xl border border-border flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <CredentialBadge credential={isConnected ? myCredential ?? null : null} now={now} />
              )}
            </div>

            <div className="flex flex-col gap-5 pt-2 max-w-[260px]">
              <div className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-2.5 before:h-px before:bg-border">
                <h3 className="text-[0.82rem] font-bold">No LLM anywhere</h3>
                <p className="mt-0.5 text-[0.78rem] text-muted-foreground leading-relaxed">
                  Validators fetch <code className="font-mono text-primary">api.github.com/users/…</code> directly and check the bio field for a match - pure deterministic consensus.
                </p>
              </div>
              <div className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-2.5 before:h-px before:bg-border">
                <h3 className="text-[0.82rem] font-bold">Self-attesting by design</h3>
                <p className="mt-0.5 text-[0.78rem] text-muted-foreground leading-relaxed">
                  The wallet being verified is always the caller&apos;s own address - nothing to spoof on someone else&apos;s behalf.
                </p>
              </div>
              <div className="pl-5 relative before:content-[''] before:absolute before:left-0 before:top-1.5 before:w-2.5 before:h-px before:bg-border">
                <h3 className="text-[0.82rem] font-bold">A moment in time</h3>
                <p className="mt-0.5 text-[0.78rem] text-muted-foreground leading-relaxed">
                  Verified means the bio matched at that block. Editing it later doesn&apos;t revoke the credential.
                </p>
              </div>
            </div>
          </div>

          <section className="mt-11 rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="font-bold text-[0.95rem]">
              {myCredential ? "Update your badge" : "Get your own badge"}
            </div>

            <div className="mt-3.5">
              <div className="eyebrow mb-1.5">1 — copy this, paste it into your GitHub bio</div>
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg pl-3 pr-1.5 py-1.5">
                <code className="flex-1 font-mono text-[0.82rem] text-primary overflow-x-auto whitespace-nowrap select-all">
                  {verifyString}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={!isConnected}
                  className="font-semibold text-[0.72rem] bg-secondary border border-border rounded-md px-2.5 py-1.5 hover:border-primary/60 hover:text-primary transition-colors disabled:opacity-50 shrink-0"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {!isConnected && (
                <p className="mt-1.5 text-[0.72rem] text-muted-foreground">Connect a wallet above to generate your string.</p>
              )}
            </div>

            <form onSubmit={handleVerify} className="mt-4">
              <div className="eyebrow mb-1.5">2 — enter your username and verify</div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="github-username"
                  disabled={!isConnected || isVerifying}
                  className="flex-1 min-w-[160px] font-mono text-[0.84rem] bg-background border border-border rounded-lg px-3 py-2.5 outline-none focus:border-primary disabled:opacity-50"
                />
                <Button type="submit" variant="gradient" disabled={!isConnected || isVerifying || !username.trim()}>
                  {isVerifying ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>) : "Verify →"}
                </Button>
              </div>
              {isVerifying && (
                <div className="mt-2.5 font-mono text-xs text-muted-foreground">
                  {pendingTxHash ? (
                    <>
                      Transaction submitted -{" "}
                      <a href={getTxExplorerUrl(pendingTxHash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        view on explorer
                      </a>
                    </>
                  ) : (
                    "Preparing transaction..."
                  )}
                </div>
              )}
            </form>
          </section>

          <div className="mt-14 flex items-baseline justify-between gap-3 flex-wrap">
            <h2 className="text-[1.02rem] font-extrabold">The Badge Wall</h2>
            <span className="eyebrow">{allCredentials?.length ?? 0} issued to date</span>
          </div>

          {wallLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading the registry...
            </div>
          ) : wall.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No badges yet - be the first to verify above.</p>
          ) : (
            <div className="mt-4.5 grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ marginTop: "18px" }}>
              {wall.map((c, i) => (
                <div
                  key={c.wallet}
                  className="badge-card p-3 pb-2.5"
                  style={{ transform: `rotate(${i % 3 === 1 ? "1.4deg" : i % 3 === 2 ? "-1.1deg" : "0deg"})` }}
                >
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://github.com/${c.github_username}.png?size=48`}
                      alt={`@${c.github_username}`}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-md shrink-0 object-cover bg-muted"
                    />
                    <span className="text-[0.78rem] font-extrabold truncate" style={{ color: "var(--badge-foreground)" }}>
                      @{c.github_username}
                    </span>
                  </div>
                  <div className="mt-1.5 font-mono text-[0.6rem]" style={{ color: "var(--badge-foreground-dim)" }}>
                    <AddressDisplay address={c.wallet} maxLength={12} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-[0.62rem] font-bold" style={{ color: "var(--success)" }}>
                    ✓ {shortSince(c.verified_at, now)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border py-5">
        <div className="max-w-3xl mx-auto px-5 md:px-7 flex items-center justify-between flex-wrap gap-3 font-mono text-xs text-muted-foreground">
          <span>GenLayer Bradbury Testnet</span>
          <div className="flex items-center gap-5">
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              GenLayer
            </a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              Docs
            </a>
            <a href="https://github.com/2TheMoom/handle" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
