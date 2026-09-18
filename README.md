# Handle

## About
Handle is a GenLayer Intelligent Contract that issues an on-chain
credential proving control of a GitHub account - with no LLM anywhere in
the contract. A user proves ownership by pasting a verification string
tied to their own wallet address into their GitHub bio; `verify()` then
has validators independently fetch `api.github.com/users/<username>` and
check the bio field for an exact match. Agreement is reached the same way
any other GenVM nondet fact is settled - the equivalence principle - but
the check itself is a plain deterministic string match, not a judgment
call.

Every other project on this account uses `gl.nondet.exec_prompt` to
reason over fetched content. Handle deliberately doesn't: it demonstrates
that GenVM's non-determinism machinery generalizes past "AI judges this,"
to "validators independently confirm this live fact and agree byte-for-
byte." The trust problem it solves is also structurally simpler than an
adjudicated claim - the caller and the wallet being verified are always
the same address (`gl.message.sender_address`), so there is no third-party
ownership assertion to forge, unlike a claim made on behalf of someone
else's wallet.

A credential is a point-in-time record - "the bio matched at this block"
- not a continuously-live guarantee. Editing the bio afterward doesn't
revoke it; `revoke()` is the self-service way to remove a credential.

No native value ever moves through this contract, so it sidesteps a
currently-open GenLayer platform bug affecting `emit_transfer` (see
[genlayerlabs/genvm-manager#20](https://github.com/genlayerlabs/genvm-manager/issues/20)),
which has forced a documented "known limitation" section onto two other
GenLayer projects from this account.

## Live deployment
Deployed on **GenLayer Bradbury Testnet** (chain ID 4221):
- **Contract:** [`0x362e370b4f32613718d44d97262F8E1492BB5aEd`](https://explorer-bradbury.genlayer.com/address/0x362e370b4f32613718d44d97262F8E1492BB5aEd)
- **Frontend:** https://handle-frontend.vercel.app
- Verified via 15 passing direct-mode tests (`pytest tests/direct/`),
  covering a fresh verification, a bio missing the wallet, a bio with a
  different wallet, an unknown GitHub user, re-verifying the same
  username (stats refresh, no history churn), switching to a new
  username (releasing the old one), revoking and reclaiming a released
  username, and the registry views.
- Verified live end-to-end against a real GitHub account (not just
  direct-mode tests): pasted the verification string into a real bio,
  called `verify("2TheMoom")`, and validators reached full 5/5 consensus
  and correctly recorded the real account's public data on-chain -
  51 repositories, 28 followers, a member-since date of December 2021.
  The bio was restored afterward; the credential itself is a permanent,
  point-in-time record and does not depend on the bio still being set.

## What's included
- `contracts/handle.py` — the Handle Intelligent Contract
- `tests/direct/test_handle.py` — direct-mode tests (in-memory, mocked GitHub API)
- **Contract linting** — static analysis to catch common contract issues before deployment
- **CI pipeline** — GitHub Actions workflow for linting and direct tests
- A Next.js 15 frontend (TypeScript, TanStack Query, Radix UI) — a
  physical ID-badge readout of your own credential, a two-step enroll
  flow with a copyable verification string, and a "Badge Wall" of every
  credential issued so far
- Configuration file template and deployment scripts

## Requirements
- Python >= 3.12
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli) globally installed: `npm install -g genlayer`
- GenLayer Studio (for integration tests and deployment): Install from [Docs](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup#using-the-genlayer-studio) or use the hosted [GenLayer Studio](https://studio.genlayer.com/)

## Project Structure

```
contracts/              # Python intelligent contracts
  handle.py              # Handle
  football_bets.py       # Kept from the GenLayer boilerplate as an SDK-pattern reference
tests/
  direct/                # Fast in-memory tests (no Studio required)
    test_handle.py
frontend/                # Next.js 15 app (TypeScript, TanStack Query, Radix UI)
deploy/                  # TypeScript deployment scripts
gltest.config.yaml       # Test runner network configuration
pyproject.toml           # Python/pytest configuration
.github/workflows/       # CI pipeline
```

## Quick Start

### 1. Set up Python environment

```shell
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Lint the contract

```shell
genvm-lint check contracts/handle.py
```

### 3. Run direct mode tests

```shell
python -m pytest tests/direct/ -v
```

Use `python -m pytest`, not bare `pytest` - depending on your installed
pytest version, running the bare command can fail to put the project
root on `sys.path`, breaking the `from tests.direct.conftest import
to_hex` import with `ModuleNotFoundError: No module named 'tests'`.

### 4. Deploy the contract

1. Choose your network: `genlayer network`
2. Deploy: `genlayer deploy` (runs the script in `/deploy/deployScript.ts`)

### 5. Set up the frontend

1. Copy `frontend/.env.example` to `frontend/.env`
2. Add your deployed contract address as `NEXT_PUBLIC_CONTRACT_ADDRESS`
3. Run:

```shell
cd frontend
npm install
npm run dev
```

The app will be available at http://localhost:3000/.

## How Handle Works

1. **`verify(github_username)`** — payable-free; the caller's wallet is
   always `gl.message.sender_address`. Validators independently fetch
   `api.github.com/users/<github_username>` and check that the bio
   contains `genlayer-verify:<the caller's own address>`. On a match, a
   credential is recorded carrying real public GitHub data (account
   creation date, public repo count, follower count) alongside the
   verification timestamp. Re-verifying the same username refreshes its
   stats; verifying a new username releases the wallet's previous one.
2. **`revoke()`** — self-service; removes the caller's own credential and
   frees the username for someone else to claim.
3. **`get_credential_by_wallet` / `get_credential_by_username` /
   `has_credential` / `get_all_credentials`** — read back credentials.

## Testing Strategy

| Test Type | Command | Speed | Requires Studio |
|-----------|---------|-------|-----------------|
| **Lint** | `genvm-lint check contracts/handle.py` | ~250ms | No |
| **Direct** | `python -m pytest tests/direct/ -v` | ~ms/test | No |

## Community
- **[Discord](https://discord.gg/8Jm4v89VAu)**: Discussions, support, and announcements
- **[Telegram](https://t.me/genlayer)**: Informal chats and quick updates

## Documentation
For detailed information, see our [documentation](https://docs.genlayer.com/).

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
