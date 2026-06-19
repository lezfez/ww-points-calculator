const DEFAULT_TAB = "calc";

function normalizeTabId(value, fallback = DEFAULT_TAB) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || fallback;
}

export function readTabFromSearch(search, fallback = DEFAULT_TAB) {
  const params = new URLSearchParams(search || "");
  return normalizeTabId(params.get("tab"), fallback);
}

export function buildPathWithTab(href, tabId, fallback = DEFAULT_TAB) {
  const normalizedTab = normalizeTabId(tabId, fallback);
  const url = new URL(href);

  if (normalizedTab === fallback) {
    url.searchParams.delete("tab");
  } else {
    url.searchParams.set("tab", normalizedTab);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

export function resolveTabSelection(requestedTab, allowedTabIds, fallback = DEFAULT_TAB) {
  if (!Array.isArray(allowedTabIds) || !allowedTabIds.length) return fallback;

  const normalizedRequested = normalizeTabId(requestedTab, fallback);
  if (allowedTabIds.includes(normalizedRequested)) return normalizedRequested;
  if (allowedTabIds.includes(fallback)) return fallback;
  return allowedTabIds[0];
}
