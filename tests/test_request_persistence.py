from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULT_ACTIONS = (ROOT / "src" / "agent-shop-result-actions.js").read_text(encoding="utf-8")
DURABILITY = (ROOT / "src" / "agent-shop-session-durability.js").read_text(encoding="utf-8")
SOURCE = RESULT_ACTIONS + "\n" + DURABILITY


def test_request_results_are_mirrored_into_browser_storage() -> None:
    assert 'REQUEST_CACHE_KEY = "atinamos:webmcp:request-cache:v1"' in RESULT_ACTIONS
    assert "sessionStorage.setItem(REQUEST_CACHE_KEY" in RESULT_ACTIONS
    assert "localStorage.setItem(REQUEST_CACHE_KEY" in RESULT_ACTIONS
    assert "function safeRecord(record)" in RESULT_ACTIONS
    assert "window.__atinamosWebmcpRequestStore" in RESULT_ACTIONS
    assert 'REQUEST_KEY = "atinamos:webmcp:request-cache:v1"' in DURABILITY
    assert "restoreLocalToSession(REQUEST_KEY)" in DURABILITY
    assert "copySessionToLocal(REQUEST_KEY)" in DURABILITY


def test_request_persistence_does_not_add_payment_authority() -> None:
    assert "privateKey" not in SOURCE
    assert "signTransaction" not in SOURCE
    assert "eth_signTypedData_v4" not in SOURCE
    assert "wrapFetchWithPayment" not in SOURCE
