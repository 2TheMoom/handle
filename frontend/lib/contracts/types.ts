/**
 * TypeScript types for the GenLayer Handle contract
 */

export interface Credential {
  github_username: string;
  wallet: string;
  member_since: string;
  public_repos: string;
  followers: string;
  verified_at: string;
}

export interface TransactionReceipt {
  status: string;
  hash: string;
  blockNumber?: number;
  [key: string]: any;
}
