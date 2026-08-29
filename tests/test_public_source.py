from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = (ROOT / "src" / "agent-shop-webmcp.js").read_text(encoding="utf-8")
ACTIVITY = (ROOT / "src" / "agent-shop-webmcp-activity.js").read_text(encoding="utf-8")
LOADER = (ROOT / "integration" / "webmcp_site_tools.py").read_text(encoding="utf-8")


def test_all_seven_webmcp_tools_are_published() -> None:
    for name in (
        "list_services",
        "get_service_details",
        "get_quote",
        "search_market",
        "get_market_service",
        "check_purchase_status",
        "begin_service_purchase",
    ):
        assert f'name: "{name}"' in TOOLS


def test_model_context_and_annotations_are_explicit() -> None:
    assert "document.modelContext || navigator.modelContext" in TOOLS
    assert "registerTool" in TOOLS
    assert "readOnlyHint: true" in TOOLS
    assert "readOnlyHint: false" in TOOLS
    assert "untrustedContentHint: true" in TOOLS


def test_payment_authority_stays_outside_webmcp() -> None:
    assert "webmcp_can_sign_or_fund_payment: false" in TOOLS
    assert "webmcp_auto_retries_paid_request: false" in TOOLS
    assert "never signs, funds, or automatically retries" in TOOLS
    assert "privateKey" not in TOOLS
    assert "walletClient" not in TOOLS
    assert "signTransaction" not in TOOLS


def test_activity_history_is_human_visible_and_session_scoped() -> None:
    assert "atinamos-agent-activity" in ACTIVITY
    assert "const MAX_CARDS = 12" in ACTIVITY
    assert "sessionStorage.getItem(SESSION_KEY)" in ACTIVITY
    assert "sessionStorage.setItem(SESSION_KEY" in ACTIVITY
    assert "overflow-y:auto" in ACTIVITY
    assert "scrollbar-gutter:stable" in ACTIVITY
    assert "Payment required — stopped safely" in ACTIVITY
    assert "Session activity only. Payment approval remains with the buyer." in ACTIVITY


def test_catalogue_discovery_is_folded_into_meaningful_activity() -> None:
    assert "function absorbDiscoveryInto(card)" in ACTIVITY
    assert "function meaningfulCard(" in ACTIVITY
    assert 'meaningfulCard("Market Search"' in ACTIVITY
    assert 'meaningfulCard("Observed market service"' in ACTIVITY
    assert 'meaningfulCard("Job status"' in ACTIVITY


def test_activity_layer_has_no_wallet_signing_capability() -> None:
    assert "privateKey" not in ACTIVITY
    assert "walletClient" not in ACTIVITY
    assert "signTransaction" not in ACTIVITY


def test_progressive_loader_installs_activity_before_tools() -> None:
    assert "document.modelContext || navigator.modelContext" in LOADER
    assert "activityScript.addEventListener" in LOADER
    assert "document.head.appendChild(toolsScript)" in LOADER
    assert "data-atinamos-webmcp-loader" in LOADER
