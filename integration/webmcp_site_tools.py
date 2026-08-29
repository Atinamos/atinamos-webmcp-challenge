"""Reference progressive WebMCP loader used by the Atinamos Agent Shop.

This public challenge copy shows how the existing human storefront conditionally
loads the WebMCP activity layer and tool bundle only when ModelContext exists.
It intentionally contains no production secrets, payment configuration, worker
controls, or private backend implementation.
"""

WEBMCP_SCRIPT_URL = "/webmcp/agent-shop-webmcp.js"
WEBMCP_ACTIVITY_SCRIPT_URL = "/webmcp/agent-shop-webmcp-activity.js"

WEBMCP_LOADER = f"""<script data-atinamos-webmcp-loader>
(() => {{
  const modelContext = document.modelContext || navigator.modelContext;
  if (!modelContext || typeof modelContext.registerTool !== "function") return;

  const toolsScript = document.createElement("script");
  toolsScript.src = "{WEBMCP_SCRIPT_URL}";
  toolsScript.defer = true;
  toolsScript.dataset.atinamosWebmcp = "true";

  const activityScript = document.createElement("script");
  activityScript.src = "{WEBMCP_ACTIVITY_SCRIPT_URL}";
  activityScript.defer = true;
  activityScript.dataset.atinamosWebmcpActivity = "true";

  // Install the fetch-observing human activity layer before registering the
  // WebMCP tools so the visible panel can observe their real network activity.
  activityScript.addEventListener("load", () => document.head.appendChild(toolsScript));
  activityScript.addEventListener("error", () => document.head.appendChild(toolsScript));
  document.head.appendChild(activityScript);
}})();
</script>"""


def with_webmcp_loader(html: str) -> str:
    """Inject the progressive loader once before the closing body tag."""
    if "data-atinamos-webmcp-loader" in html:
        return html
    marker = "</body>"
    if marker in html:
        return html.replace(marker, f"{WEBMCP_LOADER}\n{marker}", 1)
    return f"{html}\n{WEBMCP_LOADER}\n"
