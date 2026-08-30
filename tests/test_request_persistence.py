from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / "src" / "agent-shop-result-actions.js").read_text(encoding="utf-8")


def test_request_results_are_mirrored_into_session_storage() -> None:
    assert 'REQUEST_CACHE_KEY = "atinamos:webmcp:request-cache:v1"' in SOURCE
    assert "sessionStorage.getItem(REQUEST_CACHE_KEY)" in SOURCE
    assert "sessionStorage.setItem(REQUEST_CACHE_KEY" in SOURCE
    assert "function safeRecord(record)" in SOURCE
    assert "const liveStore = window.__atinamosWebmcpRequestStore" in SOURCE
    assert "window.__atinamosWebmcpRequestStore = persistentStore" in SOURCE
    assert "const cached = readRequestCache()[id]" in SOURCE


def test_request_persistence_does_not_add_payment_authority() -> None:
    assert "privateKey" not in SOURCE
    assert "signTransaction" not in SOURCE
    assert "eth_signTypedData_v4" not in SOURCE
    assert "wrapFetchWithPayment" not in SOURCE
