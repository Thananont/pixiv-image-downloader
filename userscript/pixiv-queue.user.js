// ==UserScript==
// @name         Pixiv Download Queue
// @namespace    pixiv-images-downloader
// @version      0.2.0
// @description  Queue Pixiv artwork while browsing, then export queue.json for pixiv-images-downloader
// @author       pixiv-images-downloader
// @match        https://www.pixiv.net/*
// @icon         https://www.pixiv.net/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  "use strict";

  const STORAGE_KEY = "pixiv_download_queue";
  const QUEUE_VERSION = 1;
  const CARD_BUTTON_CLASS = "pixiv-queue-card-btn";

  function readQueue() {
    const stored = GM_getValue(STORAGE_KEY, {
      version: QUEUE_VERSION,
      items: [],
    });
    if (!stored || !Array.isArray(stored.items)) {
      return { version: QUEUE_VERSION, items: [] };
    }
    return stored;
  }

  function writeQueue(queue) {
    GM_setValue(STORAGE_KEY, queue);
    updateManagementPanel();
    refreshArtworkButton();
    refreshCardButtonStates();
  }

  function parseArtworkId(url = location.href) {
    const match = String(url).match(/\/artworks\/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function isArtworkPage(url = location.href) {
    return /\/artworks\/\d+/.test(url);
  }

  function isQueued(artworkId) {
    return readQueue().items.some((item) => item.id === artworkId);
  }

  function addToQueue(artworkId) {
    const queue = readQueue();
    if (queue.items.some((item) => item.id === artworkId)) {
      return false;
    }

    queue.items.push({
      id: artworkId,
      url: `${location.origin}/artworks/${artworkId}`,
      added_at: new Date().toISOString(),
    });
    writeQueue(queue);
    return true;
  }

  function removeFromQueue(artworkId) {
    const queue = readQueue();
    queue.items = queue.items.filter((item) => item.id !== artworkId);
    writeQueue(queue);
  }

  function toggleQueue(artworkId) {
    if (isQueued(artworkId)) {
      removeFromQueue(artworkId);
      showToast(`Removed ${artworkId} from queue.`);
      return false;
    }

    addToQueue(artworkId);
    showToast(`Added ${artworkId} to queue.`);
    return true;
  }

  function clearQueue() {
    writeQueue({ version: QUEUE_VERSION, items: [] });
  }

  function exportQueue() {
    const queue = readQueue();
    if (queue.items.length === 0) {
      alert("Queue is empty.");
      return;
    }

    const blob = new Blob([JSON.stringify(queue, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pixiv-queue.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "88px",
      right: "20px",
      zIndex: "2147483647",
      background: "#1f1f1f",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "8px",
      fontSize: "13px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      fontFamily: "system-ui, sans-serif",
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1800);
  }

  function styleQueueButton(button, queued) {
    button.textContent = queued ? "Queued ✓" : "Add to queue";
    button.style.background = queued ? "#2f6fed" : "#0096fa";
    button.style.color = "#fff";
  }

  function stopCardClick(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  let managementPanel;
  let queueButton;

  function initPanel() {
    if (managementPanel) {
      return managementPanel;
    }

    managementPanel = document.createElement("div");
    managementPanel.id = "pixiv-queue-panel";
    Object.assign(managementPanel.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "2147483646",
      background: "#111",
      color: "#fff",
      border: "1px solid #333",
      borderRadius: "10px",
      padding: "12px 14px",
      minWidth: "180px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      fontFamily: "system-ui, sans-serif",
      fontSize: "13px",
    });

    managementPanel.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">Pixiv Queue</div>
      <div id="pixiv-queue-count">0 items</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button type="button" id="pixiv-queue-export" style="cursor:pointer;">Export</button>
        <button type="button" id="pixiv-queue-clear" style="cursor:pointer;">Clear</button>
      </div>
    `;

    document.body.appendChild(managementPanel);

    managementPanel
      .querySelector("#pixiv-queue-export")
      .addEventListener("click", exportQueue);
    managementPanel
      .querySelector("#pixiv-queue-clear")
      .addEventListener("click", () => {
        if (confirm("Clear the entire queue?")) {
          clearQueue();
          showToast("Queue cleared.");
        }
      });

    return managementPanel;
  }

  function updateManagementPanel() {
    const root = initPanel();
    const count = readQueue().items.length;
    root.querySelector("#pixiv-queue-count").textContent =
      count === 1 ? "1 item" : `${count} items`;
  }

  function removeArtworkButton() {
    if (queueButton) {
      queueButton.remove();
      queueButton = null;
    }
  }

  function refreshArtworkButton() {
    removeArtworkButton();

    if (!isArtworkPage()) {
      return;
    }

    const artworkId = parseArtworkId();
    if (!artworkId) {
      return;
    }

    queueButton = document.createElement("button");
    queueButton.id = "pixiv-queue-add-button";
    queueButton.type = "button";
    Object.assign(queueButton.style, {
      position: "fixed",
      top: "88px",
      right: "20px",
      zIndex: "2147483646",
      cursor: "pointer",
      border: "none",
      borderRadius: "999px",
      padding: "10px 16px",
      fontSize: "14px",
      fontWeight: "600",
      fontFamily: "system-ui, sans-serif",
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    });

    styleQueueButton(queueButton, isQueued(artworkId));
    queueButton.addEventListener("click", () => toggleQueue(artworkId));
    document.body.appendChild(queueButton);
  }

  function isThumbnailLink(link) {
    if (link.closest("#pixiv-queue-panel")) {
      return false;
    }

    if (link.querySelector("img, [role='img']")) {
      return true;
    }

    const rect = link.getBoundingClientRect();
    return rect.width >= 96 && rect.height >= 96;
  }

  function styleCardButton(button, queued) {
    button.textContent = queued ? "✓" : "+";
    button.title = queued ? "Queued — click to remove" : "Add to queue";
    button.setAttribute("aria-label", button.title);
    button.style.background = queued ? "#2f6fed" : "#0096fa";
    button.style.color = "#fff";
  }

  function attachCardButton(link, artworkId) {
    if (link.querySelector(`.${CARD_BUTTON_CLASS}`)) {
      return;
    }

    const computed = window.getComputedStyle(link);
    if (computed.position === "static") {
      link.style.position = "relative";
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = CARD_BUTTON_CLASS;
    button.dataset.pixivQueueId = String(artworkId);
    Object.assign(button.style, {
      position: "absolute",
      top: "6px",
      right: "6px",
      zIndex: "20",
      width: "28px",
      height: "28px",
      padding: "0",
      border: "none",
      borderRadius: "999px",
      cursor: "pointer",
      fontSize: "18px",
      fontWeight: "700",
      lineHeight: "28px",
      fontFamily: "system-ui, sans-serif",
      boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
    });

    styleCardButton(button, isQueued(artworkId));
    button.addEventListener("click", (event) => {
      stopCardClick(event);
      toggleQueue(artworkId);
    });
    button.addEventListener("mousedown", stopCardClick);
    button.addEventListener("pointerdown", stopCardClick);

    link.appendChild(button);
  }

  function refreshCardButtonStates() {
    const queuedIds = new Set(readQueue().items.map((item) => item.id));
    document.querySelectorAll(`.${CARD_BUTTON_CLASS}`).forEach((button) => {
      const artworkId = Number(button.dataset.pixivQueueId);
      styleCardButton(button, queuedIds.has(artworkId));
    });
  }

  function scanListingCards() {
    const currentArtworkId = isArtworkPage() ? parseArtworkId() : null;
    const seen = new Set();

    document.querySelectorAll('a[href*="/artworks/"]').forEach((link) => {
      const artworkId = parseArtworkId(link.getAttribute("href") || "");
      if (!artworkId || seen.has(artworkId) || artworkId === currentArtworkId) {
        return;
      }
      if (!isThumbnailLink(link)) {
        return;
      }

      seen.add(artworkId);
      attachCardButton(link, artworkId);
    });
  }

  function onNavigate() {
    refreshArtworkButton();
    updateManagementPanel();
    scanListingCards();
  }

  GM_registerMenuCommand("Export queue.json", exportQueue);
  GM_registerMenuCommand("Clear queue", () => {
    if (confirm("Clear the entire queue?")) {
      clearQueue();
    }
  });

  initPanel();
  updateManagementPanel();
  refreshArtworkButton();
  scanListingCards();

  let lastUrl = location.href;
  let scanTimer = null;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
      return;
    }

    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanListingCards, 250);
  });
  observer.observe(document, { subtree: true, childList: true });

  window.addEventListener("popstate", onNavigate);
})();
