"""Reference progressive WebMCP integration used by the Atinamos Agent Shop.

This public challenge copy shows how the existing human storefront conditionally
loads WebMCP activity, human result actions and the tool bundle when ModelContext
exists. It intentionally contains no production secrets, payment configuration,
worker controls, or private backend implementation.
"""

from pathlib import Path

WEBMCP_SCRIPT_URL = "/webmcp/agent-shop-webmcp.js"
WEBMCP_ACTIVITY_SCRIPT_URL = "/webmcp/agent-shop-webmcp-activity.js"
WEBMCP_RESULT_ACTIONS_SCRIPT_URL = "/webmcp/agent-shop-result-actions.js"
WEBMCP_RESULT_VIEW_SCRIPT_URL = "/webmcp/agent-shop-result-view.js"
WEBMCP_RESULT_VIEW_URL = "/webmcp-result"

WEBMCP_SCRIPT_PATH = Path("src/agent-shop-webmcp.js")
WEBMCP_ACTIVITY_SCRIPT_PATH = Path("src/agent-shop-webmcp-activity.js")
WEBMCP_RESULT_ACTIONS_SCRIPT_PATH = Path("src/agent-shop-result-actions.js")
WEBMCP_RESULT_VIEW_SCRIPT_PATH = Path("src/agent-shop-result-view.js")
WEBMCP_RESULT_VIEW_PATH = Path("src/agent-shop-result-view.html")

WEBMCP_LOADER = f"""<script data-atinamos-webmcp-loader>
(() => {{
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") return;

  const toolsScript = document.createElement("script");
  toolsScript.src = "{WEBMCP_SCRIPT_URL}";
  toolsScript.defer = true;

  const resultActionsScript = document.createElement("script");
  resultActionsScript.src = "{WEBMCP_RESULT_ACTIONS_SCRIPT_URL}";
  resultActionsScript.defer = true;

  const activityScript = document.createElement("script");
  activityScript.src = "{WEBMCP_ACTIVITY_SCRIPT_URL}";
  activityScript.defer = true;
  activityScript.addEventListener("load", () => {{
    document.head.appendChild(resultActionsScript);
    document.head.appendChild(toolsScript);
  }});
  activityScript.addEventListener("error", () => document.head.appendChild(toolsScript));
  document.head.appendChild(activityScript);
}})();
</script>"""


def with_webmcp_loader(html: str) -> str:
    """Progressively add WebMCP without changing ordinary-browser behaviour."""
    if "data-atinamos-webmcp-loader" in html:
        return html
    if "</body>" in html:
        return html.replace("</body>", f"{WEBMCP_LOADER}\n</body>", 1)
    return f"{html}\n{WEBMCP_LOADER}\n"


# The production FastAPI integration additionally serves WEBMCP_RESULT_VIEW_URL
# as a noindex/no-store same-origin page. It is intentionally human-facing and
# session-bound; agents continue to consume structured results through WebMCP/API
# rather than scraping the result page.
