"""Reference progressive WebMCP integration used by the Atinamos Agent Shop.

This public challenge copy shows the production loading order without exposing
private backend code or configuration. The WebMCP tool bundle is the critical
path; optional human activity/recovery helpers load only after tool registration.
"""

from pathlib import Path

WEBMCP_SCRIPT_URL = "/webmcp/agent-shop-webmcp.js"
WEBMCP_DURABILITY_SCRIPT_URL = "/webmcp/agent-shop-session-durability.js"
WEBMCP_PAYMENT_RESUME_SCRIPT_URL = "/webmcp/agent-shop-payment-resume.js"
WEBMCP_ACTIVITY_SCRIPT_URL = "/webmcp/agent-shop-webmcp-activity.js"
WEBMCP_RESULT_ACTIONS_SCRIPT_URL = "/webmcp/agent-shop-result-actions.js"
WEBMCP_RESULT_VIEW_SCRIPT_URL = "/webmcp/agent-shop-result-view.js"
WEBMCP_RESULT_VIEW_URL = "/webmcp-result"

PUBLIC = Path("src")

WEBMCP_LOADER = f"""<script data-atinamos-webmcp-loader>
(() => {{
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") return;

  const appendScript = (src, datasetName, onload, onerror) => {{
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    if (datasetName) script.dataset[datasetName] = "true";
    if (onload) script.addEventListener("load", onload, {{ once: true }});
    if (onerror) script.addEventListener("error", onerror, {{ once: true }});
    document.head.appendChild(script);
  }};

  const loadOptionalUi = () => {{
    appendScript("{WEBMCP_DURABILITY_SCRIPT_URL}", "atinamosWebmcpDurability", () => {{
      appendScript("{WEBMCP_PAYMENT_RESUME_SCRIPT_URL}", "atinamosWebmcpPaymentResume", () => {{
        appendScript("{WEBMCP_ACTIVITY_SCRIPT_URL}", "atinamosWebmcpActivity", () => {{
          appendScript("{WEBMCP_RESULT_ACTIONS_SCRIPT_URL}", "atinamosWebmcpResults");
        }});
      }}, () => appendScript("{WEBMCP_ACTIVITY_SCRIPT_URL}", "atinamosWebmcpActivity"));
    }}, () => appendScript("{WEBMCP_ACTIVITY_SCRIPT_URL}", "atinamosWebmcpActivity"));
  }};

  // Critical path: expose site tools before any optional UI/recovery helper.
  appendScript("{WEBMCP_SCRIPT_URL}", "atinamosWebmcp", loadOptionalUi, loadOptionalUi);
}})();
</script>"""


def with_webmcp_loader(html: str) -> str:
    """Progressively add WebMCP without changing ordinary-browser behaviour."""
    if "data-atinamos-webmcp-loader" in html:
        return html
    if "</body>" in html:
        return html.replace("</body>", f"{WEBMCP_LOADER}\n</body>", 1)
    return f"{html}\n{WEBMCP_LOADER}\n"


# Production additionally serves /webmcp-result as a same-origin noindex page.
# Agents consume structured results through WebMCP/API; the result page is human UX.
