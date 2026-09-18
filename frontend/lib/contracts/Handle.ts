import { createClient } from "genlayer-js";
import { getGenLayerChain } from "../genlayer/chains";
import type { Credential } from "./types";
import {
  estimateWriteFeePreset,
  feePresetToTransactionFees,
  type FeePresetEstimate,
  type FeePresetLevel,
} from "../genlayer/fees";

/**
 * genlayer-js decodes Python dataclasses (and dicts) as JS Map instances,
 * keyed by field name, and Address-typed fields as objects carrying
 * `as_hex`. This flattens one level of the Map into a plain object and
 * normalizes any Address field down to its hex string.
 */
function toPlainObject(raw: any): Record<string, any> {
  const entries = raw instanceof Map ? Array.from(raw.entries()) : Object.entries(raw ?? {});
  const obj: Record<string, any> = {};
  for (const [key, value] of entries) {
    obj[key] = value && typeof value === "object" && "as_hex" in value ? value.as_hex : value;
  }
  return obj;
}

function decodeCredential(raw: any): Credential {
  const obj = toPlainObject(raw);
  return {
    github_username: String(obj.github_username ?? ""),
    wallet: String(obj.wallet ?? ""),
    member_since: String(obj.member_since ?? ""),
    public_repos: String(obj.public_repos ?? "0"),
    followers: String(obj.followers ?? "0"),
    verified_at: String(obj.verified_at ?? "0"),
  };
}

/**
 * Handle contract class - on-chain GitHub identity verification with no
 * LLM anywhere. verify(github_username) is the only write method that
 * changes state; revoke() is self-service. Neither moves any value.
 */
class Handle {
  private contractAddress: `0x${string}`;
  private client: any;
  private rpcUrl?: string;

  constructor(contractAddress: string, address?: string | null, rpcUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.rpcUrl = rpcUrl;

    const config: any = { chain: getGenLayerChain() };
    if (address) config.account = address as `0x${string}`;
    if (rpcUrl) config.endpoint = rpcUrl;

    this.client = createClient(config);
  }

  updateAccount(address: string): void {
    const config: any = { chain: getGenLayerChain(), account: address as `0x${string}` };
    if (this.rpcUrl) config.endpoint = this.rpcUrl;
    this.client = createClient(config);
  }

  async estimateVerifyFees(
    githubUsername: string,
    level: FeePresetLevel = "standard"
  ): Promise<FeePresetEstimate | undefined> {
    return estimateWriteFeePreset(
      this.client,
      { address: this.contractAddress, functionName: "verify", args: [githubUsername] },
      level,
    );
  }

  async getCredentialByWallet(wallet: string): Promise<Credential | null> {
    try {
      const result = await this.client.readContract({
        address: this.contractAddress, functionName: "get_credential_by_wallet", args: [wallet],
      });
      return decodeCredential(result);
    } catch {
      return null;
    }
  }

  async hasCredential(wallet: string): Promise<boolean> {
    const result = await this.client.readContract({
      address: this.contractAddress, functionName: "has_credential", args: [wallet],
    });
    return Boolean(result);
  }

  async getAllCredentials(): Promise<Credential[]> {
    const result: any = await this.client.readContract({
      address: this.contractAddress, functionName: "get_all_credentials", args: [],
    });
    return Array.isArray(result) ? result.map(decodeCredential) : [];
  }

  async verify(
    githubUsername: string,
    feePreset?: FeePresetEstimate,
    onSubmitted?: (txHash: string) => void
  ): Promise<string> {
    const fees = feePresetToTransactionFees(feePreset);
    let txHash: string;
    try {
      txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "verify",
        args: [githubUsername],
        value: BigInt(0),
        ...(fees ? { fees } : {}),
      });
    } catch (error) {
      console.error("Error calling verify:", error);
      throw new Error("Failed to submit the verify transaction. Please try again.");
    }

    onSubmitted?.(txHash);

    try {
      await this.client.waitForTransactionReceipt({ hash: txHash, status: "ACCEPTED" as any, retries: 40, interval: 5000 });
      return txHash;
    } catch (error) {
      console.error("Error confirming verify transaction:", error);
      throw new Error(
        `Transaction ${txHash} was submitted but confirmation timed out. It may still complete - check the explorer.`
      );
    }
  }

  async revoke(onSubmitted?: (txHash: string) => void): Promise<string> {
    let txHash: string;
    try {
      txHash = await this.client.writeContract({
        address: this.contractAddress,
        functionName: "revoke",
        args: [],
        value: BigInt(0),
      });
    } catch (error) {
      console.error("Error calling revoke:", error);
      throw new Error("Failed to submit the revoke transaction. Please try again.");
    }

    onSubmitted?.(txHash);

    try {
      await this.client.waitForTransactionReceipt({ hash: txHash, status: "ACCEPTED" as any, retries: 40, interval: 5000 });
      return txHash;
    } catch (error) {
      console.error("Error confirming revoke transaction:", error);
      throw new Error(
        `Transaction ${txHash} was submitted but confirmation timed out. It may still complete - check the explorer.`
      );
    }
  }
}

export default Handle;
