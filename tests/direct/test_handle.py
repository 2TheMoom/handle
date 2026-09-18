"""Direct-mode tests for the Handle contract."""

import json

from tests.direct.conftest import to_hex

CONTRACT = "contracts/handle.py"


def _mock_github_user(
    vm,
    username: str,
    wallet_hex: str | None,
    *,
    found: bool = True,
    created_at: str = "2011-01-25T18:44:36Z",
    public_repos: int = 8,
    followers: int = 18204,
):
    """Mocks GET https://api.github.com/users/<username>. Pass wallet_hex to
    include a matching bio; pass a different/None wallet_hex to simulate a
    bio that doesn't mention this wallet.
    """
    vm.clear_mocks()
    if not found:
        body = json.dumps({"message": "Not Found"})
    else:
        bio = f"Just a mock. genlayer-verify:{wallet_hex}" if wallet_hex else "No verification here."
        body = json.dumps(
            {
                "login": username,
                "bio": bio,
                "created_at": created_at,
                "public_repos": public_repos,
                "followers": followers,
            }
        )
    vm.mock_web(
        r"api\.github\.com/users/" + username,
        {"method": "GET", "status": 200 if found else 404, "body": body},
    )


def test_verify_success_creates_credential(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    _mock_github_user(direct_vm, "octocat", alice)
    contract.verify("octocat")

    credential = contract.get_credential_by_username("octocat")
    assert credential.github_username == "octocat"
    assert credential.wallet.as_hex == alice
    assert credential.member_since == "2011-01-25T18:44:36Z"
    assert credential.public_repos == 8
    assert credential.followers == 18204
    assert credential.verified_at > 0

    by_wallet = contract.get_credential_by_wallet(alice)
    assert by_wallet.github_username == "octocat"

    assert contract.has_credential(alice) is True


def test_verify_bio_missing_wallet_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_github_user(direct_vm, "octocat", None)

    with direct_vm.expect_revert(
        "Bio does not contain the expected verification string"
    ):
        contract.verify("octocat")


def test_verify_bio_has_different_wallet_fails(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    bob = to_hex(direct_bob)

    _mock_github_user(direct_vm, "octocat", bob)

    with direct_vm.expect_revert(
        "Bio does not contain the expected verification string"
    ):
        contract.verify("octocat")


def test_verify_unknown_user_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    _mock_github_user(direct_vm, "doesnotexist12345", None, found=False)

    with direct_vm.expect_revert("not found"):
        contract.verify("doesnotexist12345")


def test_verify_empty_username_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("GitHub username is required"):
        contract.verify("   ")


def test_verify_username_already_claimed_by_other_wallet_fails(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)

    direct_vm.sender = direct_alice
    _mock_github_user(direct_vm, "octocat", alice)
    contract.verify("octocat")

    direct_vm.sender = direct_bob
    _mock_github_user(direct_vm, "octocat", bob)
    with direct_vm.expect_revert("already verified by a different wallet"):
        contract.verify("octocat")


def test_reverify_same_username_refreshes_stats(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    _mock_github_user(direct_vm, "octocat", alice, followers=100)
    contract.verify("octocat")
    assert contract.get_credential_by_username("octocat").followers == 100

    _mock_github_user(direct_vm, "octocat", alice, followers=250)
    contract.verify("octocat")
    assert contract.get_credential_by_username("octocat").followers == 250


def test_verify_new_username_releases_old_binding(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)

    _mock_github_user(direct_vm, "old-handle", alice)
    contract.verify("old-handle")

    _mock_github_user(direct_vm, "new-handle", alice)
    contract.verify("new-handle")

    assert contract.get_credential_by_wallet(alice).github_username == "new-handle"

    # The old username is free again - a different wallet can now claim it.
    direct_vm.sender = direct_bob
    _mock_github_user(direct_vm, "old-handle", bob)
    contract.verify("old-handle")
    assert contract.get_credential_by_wallet(bob).github_username == "old-handle"


def test_revoke_removes_credential(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    alice = to_hex(direct_alice)

    _mock_github_user(direct_vm, "octocat", alice)
    contract.verify("octocat")
    assert contract.has_credential(alice) is True

    contract.revoke()
    assert contract.has_credential(alice) is False

    with direct_vm.expect_revert("No credential for this username"):
        contract.get_credential_by_username("octocat")


def test_revoke_without_credential_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("No credential to revoke"):
        contract.revoke()


def test_revoke_then_reclaim_by_another_wallet(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)

    direct_vm.sender = direct_alice
    _mock_github_user(direct_vm, "octocat", alice)
    contract.verify("octocat")
    contract.revoke()

    direct_vm.sender = direct_bob
    _mock_github_user(direct_vm, "octocat", bob)
    contract.verify("octocat")
    assert contract.get_credential_by_wallet(bob).github_username == "octocat"


def test_get_credential_by_wallet_unknown_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    alice = to_hex(direct_alice)

    with direct_vm.expect_revert("No credential for this wallet"):
        contract.get_credential_by_wallet(alice)


def test_get_all_credentials_empty_initially(direct_deploy):
    contract = direct_deploy(CONTRACT)
    assert contract.get_all_credentials() == []


def test_get_all_credentials_lists_active_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = direct_deploy(CONTRACT)
    alice = to_hex(direct_alice)
    bob = to_hex(direct_bob)

    direct_vm.sender = direct_alice
    _mock_github_user(direct_vm, "octocat", alice)
    contract.verify("octocat")

    direct_vm.sender = direct_bob
    _mock_github_user(direct_vm, "torvalds", bob)
    contract.verify("torvalds")

    all_creds = contract.get_all_credentials()
    assert {c.github_username for c in all_creds} == {"octocat", "torvalds"}

    direct_vm.sender = direct_alice
    contract.revoke()

    all_creds = contract.get_all_credentials()
    assert {c.github_username for c in all_creds} == {"torvalds"}


def test_has_credential_false_for_unverified_wallet(direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    alice = to_hex(direct_alice)
    assert contract.has_credential(alice) is False
