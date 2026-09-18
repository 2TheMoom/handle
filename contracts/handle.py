# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from genlayer import *

GITHUB_API_BASE = "https://api.github.com/users/"
VERIFY_PREFIX = "genlayer-verify:0x"

GITHUB_HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}


@allow_storage
@dataclass
class Credential:
    github_username: str
    wallet: Address
    member_since: str  # GitHub account created_at, ISO date
    public_repos: u256
    followers: u256
    verified_at: u256  # unix epoch seconds


class Handle(gl.Contract):
    """On-chain GitHub identity verification, with no LLM anywhere.

    verify(github_username) checks that the caller's own wallet address
    appears in that GitHub account's public bio, in the form
    "genlayer-verify:0x<address>". Only the account's real owner can edit
    their bio, so a match is proof of control - and the caller and the
    wallet being verified are always the same address
    (gl.message.sender_address), so there is nothing to spoof on someone
    else's behalf, unlike a claim asserted about a third-party wallet.

    Validators reach consensus via the equivalence principle on GitHub's
    live API response - the same nondeterminism-resolution machinery used
    elsewhere in GenVM for LLM judgment calls, applied here to a plain
    deterministic string match instead. There is no fuzzy judgment step
    and no LLM call anywhere in this contract.

    A credential is a point-in-time record: "the bio matched at this
    block." Editing the bio afterward does not revoke it - see revoke()
    for the self-service way to remove a credential.
    """

    credentials_by_wallet: TreeMap[Address, Credential]
    wallet_by_username: TreeMap[str, Address]
    all_usernames: DynArray[str]

    def __init__(self):
        pass

    def _fetch_github_user(self, username: str) -> dict | None:
        url = GITHUB_API_BASE + username
        try:
            resp = gl.nondet.web.request(url, method="GET", headers=GITHUB_HEADERS)
            data = json.loads((resp.body or b"").decode("utf-8"))
            if not isinstance(data, dict) or "login" not in data:
                return None
            return data
        except (ValueError, AttributeError, TypeError):
            return None

    def _check_bio_match(self, bio: str | None, wallet: Address) -> bool:
        if not bio:
            return False
        expected = f"{VERIFY_PREFIX}{wallet.as_hex[2:]}".lower()
        return expected in bio.lower()

    def _consensus_verify(self, username: str, wallet: Address) -> dict:
        def leader_fn() -> dict:
            data = self._fetch_github_user(username)
            if data is None:
                return {"found": False, "matched": False}
            matched = self._check_bio_match(data.get("bio"), wallet)
            return {
                "found": True,
                "matched": matched,
                "created_at": data.get("created_at", ""),
                "public_repos": int(data.get("public_repos") or 0),
                "followers": int(data.get("followers") or 0),
            }

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False
            my_result = leader_fn()
            return (
                my_result["found"] == leaders_res.calldata["found"]
                and my_result["matched"] == leaders_res.calldata["matched"]
            )

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    @gl.public.write
    def verify(self, github_username: str) -> None:
        username = github_username.strip()
        if not username:
            raise gl.vm.UserError("GitHub username is required")

        wallet = gl.message.sender_address
        result = self._consensus_verify(username, wallet)

        if not result.get("found"):
            raise gl.vm.UserError(f"GitHub user '{username}' not found")
        if not result.get("matched"):
            raise gl.vm.UserError(
                "Bio does not contain the expected verification string for this wallet"
            )

        existing = self.credentials_by_wallet.get(wallet)
        if existing is not None and existing.github_username != username:
            # Switching accounts - release the wallet's previous username.
            del self.wallet_by_username[existing.github_username]

        prior_wallet = self.wallet_by_username.get(username)
        if prior_wallet is not None and prior_wallet != wallet:
            raise gl.vm.UserError(
                f"'{username}' is already verified by a different wallet"
            )

        now = int(datetime.now(timezone.utc).timestamp())
        credential = Credential(
            github_username=username,
            wallet=wallet,
            member_since=str(result.get("created_at", "")),
            public_repos=int(result.get("public_repos", 0)),
            followers=int(result.get("followers", 0)),
            verified_at=now,
        )
        self.credentials_by_wallet[wallet] = credential
        self.wallet_by_username[username] = wallet
        if username not in self.all_usernames:
            self.all_usernames.append(username)

    @gl.public.write
    def revoke(self) -> None:
        wallet = gl.message.sender_address
        credential = self.credentials_by_wallet.get(wallet)
        if credential is None:
            raise gl.vm.UserError("No credential to revoke")
        del self.credentials_by_wallet[wallet]
        del self.wallet_by_username[credential.github_username]

    @gl.public.view
    def get_credential_by_wallet(self, wallet: str) -> Credential:
        addr = Address(wallet)
        credential = self.credentials_by_wallet.get(addr)
        if credential is None:
            raise gl.vm.UserError("No credential for this wallet")
        return credential

    @gl.public.view
    def get_credential_by_username(self, username: str) -> Credential:
        wallet = self.wallet_by_username.get(username)
        if wallet is None:
            raise gl.vm.UserError("No credential for this username")
        return self.credentials_by_wallet[wallet]

    @gl.public.view
    def has_credential(self, wallet: str) -> bool:
        return Address(wallet) in self.credentials_by_wallet

    @gl.public.view
    def get_all_credentials(self) -> list:
        return [
            self.credentials_by_wallet[self.wallet_by_username[u]]
            for u in self.all_usernames
            if u in self.wallet_by_username
        ]
