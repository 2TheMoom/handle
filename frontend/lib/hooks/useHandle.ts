"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Handle from "../contracts/Handle";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type { Credential } from "../contracts/types";

export function useHandleContract(): Handle | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const rpcUrl = getStudioUrl();

  const contract = useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.",
        { label: "Setup Guide", onClick: () => window.open("/docs/setup", "_blank") }
      );
      return null;
    }
    return new Handle(contractAddress, address, rpcUrl);
  }, [contractAddress, address, rpcUrl]);

  return contract;
}

export function useCredentialByWallet(wallet: string | null) {
  const contract = useHandleContract();

  return useQuery<Credential | null, Error>({
    queryKey: ["credential", wallet],
    queryFn: () => (contract && wallet ? contract.getCredentialByWallet(wallet) : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!wallet,
  });
}

export function useHasCredential(wallet: string | null) {
  const contract = useHandleContract();

  return useQuery<boolean, Error>({
    queryKey: ["hasCredential", wallet],
    queryFn: () => (contract && wallet ? contract.hasCredential(wallet) : Promise.resolve(false)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract && !!wallet,
  });
}

export function useAllCredentials() {
  const contract = useHandleContract();

  return useQuery<Credential[], Error>({
    queryKey: ["allCredentials"],
    queryFn: () => (contract ? contract.getAllCredentials() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useVerify() {
  const contract = useHandleContract();
  const { address } = useWallet();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (githubUsername: string) => {
      if (!contract) throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      if (!address) throw new Error("Wallet not connected. Please connect your wallet to verify.");
      setIsVerifying(true);
      setPendingTxHash(null);
      const feePreset = await contract.estimateVerifyFees(githubUsername, "standard");
      return contract.verify(githubUsername, feePreset, setPendingTxHash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credential"] });
      queryClient.invalidateQueries({ queryKey: ["hasCredential"] });
      queryClient.invalidateQueries({ queryKey: ["allCredentials"] });
      setIsVerifying(false);
      success("Verified!", { description: "Your GitHub credential is now on-chain." });
    },
    onError: (err: any) => {
      console.error("Error verifying:", err);
      setIsVerifying(false);
      error("Verification failed", { description: err?.message || "Please try again." });
    },
  });

  return {
    ...mutation,
    isVerifying,
    pendingTxHash,
    clearPendingTx: () => setPendingTxHash(null),
    verify: mutation.mutate,
  };
}

export function useRevoke() {
  const contract = useHandleContract();
  const queryClient = useQueryClient();
  const [isRevoking, setIsRevoking] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!contract) throw new Error("Contract not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file.");
      setIsRevoking(true);
      setPendingTxHash(null);
      return contract.revoke(setPendingTxHash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credential"] });
      queryClient.invalidateQueries({ queryKey: ["hasCredential"] });
      queryClient.invalidateQueries({ queryKey: ["allCredentials"] });
      setIsRevoking(false);
      success("Credential revoked");
    },
    onError: (err: any) => {
      console.error("Error revoking:", err);
      setIsRevoking(false);
      error("Revoke failed", { description: err?.message || "Please try again." });
    },
  });

  return {
    ...mutation,
    isRevoking,
    pendingTxHash,
    clearPendingTx: () => setPendingTxHash(null),
    revoke: mutation.mutate,
  };
}
