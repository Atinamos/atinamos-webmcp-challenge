from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = (ROOT / "src" / "agent-shop-webmcp.js").read_text(encoding="utf-8")
ACTIVITY = (ROOT / "src" / "agent-shop-webmcp-activity.js").read_text(encoding="utf-8")
RESULT_ACTIONS = (ROOT / "src" / "agent-shop-result-actions.js").read_text(encoding="utf-8")
RESULT_VIEW = (ROOT / "src" / "agent-shop-result-view.js").read_text(encoding="utf-8")
RESULT_HTML = (ROOT / "src" / "agent-shop-result-view.html").read_text(encoding="utf-8")
LOADER = (ROOT / "integration" / "webmcp_site_tools.py").read_text(encoding="utf-8")


def test_all_eight_webmcp_tools_are_published() -> None:
    for name in (
        "list_services",
        "get_service_details",
        "get_quote",
        "search_market",
        "get_market_service",
        "check_purchase_status",
        "get_request_status",
        "begin_service_purchase",
    ):
        assert f'name: "{name}"' in TOOLS


def test_model_context_and_annotations_are_explicit() -> None:
    assert "document.modelContext || navigator.modelContext" in TOOLS
    assert "registerTool" in TOOLS
    assert "readOnlyHint: true" in TOOLS
    assert "readOnlyHint: false" in TOOLS
    assert "untrustedContentHint: true" in TOOLS


def test_payment_authority_stays_outside_webmcp_tool_code() -> None:
    assert "webmcp_can_sign_or_fund_payment: false" in TOOLS
    assert "webmcp_auto_retries_paid_request: false" in TOOLS
    assert "never signs, funds, approves, or automatically retries" in TOOLS
    assert "eth_signTypedData_v4" not in TOOLS
    assert "wrapFetchWithPayment" not in TOOLS
    assert "privateKey" not in TOOLS
    assert "signTransaction" not in TOOLS


def test_activity_layer_is_human_visible_and_controls_payment() -> None:
    assert "atinamos-agent-activity" in ACTIVITY
    assert "const MAX_CARDS = 12" in ACTIVITY
    assert "sessionStorage.getItem(SESSION_KEY)" in ACTIVITY
    assert "sessionStorage.setItem(SESSION_KEY" in ACTIVITY
    assert "Payment approval required" in ACTIVITY
    assert "Pay with Base" in ACTIVITY
    assert "payment approval stays with the human" in ACTIVITY
    assert "eth_requestAccounts" in ACTIVITY
    assert "eth_signTypedData_v4" in ACTIVITY
    assert "wrapFetchWithPayment(originalFetch" in ACTIVITY
    assert "Buyer and seller wallet match" in ACTIVITY
    assert "privateKey" not in ACTIVITY
    assert "seed phrase" not in ACTIVITY.lower()


def test_request_status_store_is_read_only_to_webmcp() -> None:
    assert "window.__atinamosWebmcpRequestStore" in ACTIVITY
    assert "safeRequestView" in ACTIVITY
    assert "X-Atinamos-WebMCP-Request-ID" in TOOLS
    assert "human_payment_available" in TOOLS
    assert "use get_request_status after the human acts" in TOOLS


def test_human_result_actions_are_optional_and_separate_from_agent_result() -> None:
    assert "View result" in RESULT_ACTIONS
    assert "View progress" in RESULT_ACTIONS
    assert "View failure details" in RESULT_ACTIONS
    assert "__atinamosWebmcpRequestStore" in RESULT_ACTIONS
    assert "/webmcp-result" in RESULT_ACTIONS
    assert "eth_signTypedData_v4" not in RESULT_ACTIONS


def test_human_result_page_can_poll_and_download_json() -> None:
    assert "HUMAN RESULT VIEW" in RESULT_HTML
    assert "Agents do not need to parse this page" in RESULT_HTML
    assert "Download JSON" in RESULT_HTML
    assert "window.opener" in RESULT_VIEW
    assert "__atinamosWebmcpRequestStore" in RESULT_VIEW
    assert "status_url" in RESULT_VIEW
    assert "new Blob" in RESULT_VIEW


def test_progressive_loader_installs_activity_results_then_tools() -> None:
    assert "document.modelContext || navigator.modelContext" in LOADER
    assert "activityScript.addEventListener" in LOADER
    assert "resultActionsScript" in LOADER
    assert "document.head.appendChild(toolsScript)" in LOADER
    assert "data-atinamos-webmcp-loader" in LOADER
