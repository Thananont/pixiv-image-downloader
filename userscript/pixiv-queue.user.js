// ==UserScript==
// @name         Pixiv Download Queue
// @namespace    pixiv-images-downloader
// @version      0.1.0
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

  function readQueue() {
    const stored = GM_getValue(STORAGE_KEY, { version: QUEUE_VERSION, items: [] });
    if (!stored || !Array.isArray(stored.items)) {
      return { version: QUEUE_VERSION, items: [] };
    }
    return stored;
  }

  function writeQueue(queue) {
    GM_setValue(STORAGE_KEY, queue);
    updatePanel();
  }

  function parseArtworkId(url = location.href) {
    const match = url.match(/\/artworks\/(\d+)/);
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

  let panel;
  let queueButton;

  function ensurePanel() {
    if (panel) {
      return panel;
    }

    panel = document.createElement("div");
    panel.id = "pixiv-queue-panel";
    Object.assign(panel.style, {
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

    panel.innerHTML = `
      <div style="font-weight:600;margin-bottom:8px;">Pixiv Queue</div>
      <div id="pixiv-queue-count">0 items</div>
      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
        <button type="button" id="pixiv-queue-export" style="cursor:pointer;">Export</button>
        <button type="button" id="pixiv-queue-clear" style="cursor:pointer;">Clear</button>
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector("#pixiv-queue-export").addEventListener("click", exportQueue);
    panel.querySelector("#pixiv-queue-clear").addEventListener("click", () => {
      if (confirm("Clear the entire queue?")) {
        clearQueue();
        refreshArtworkButton();
        showToast("Queue cleared.");
      }
    });

    return panel;
  }

  function updatePanel() {
    const root = ensurePanel();
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

    const queued = isQueued(artworkId);
    queueButton.textContent = queued ? "Queued ✓" : "Add to queue";
    queueButton.style.background = queued ? "#2f6fed" : "#0096fa";
    queueButton.style.color = "#fff";

    queueButton.addEventListener("click", () => {
      if (isQueued(artworkId)) {
        removeFromQueue(artworkId);
        showToast(`Removed ${artworkId} from queue.`);
      } else {
        addToQueue(artworkId);
        showToast(`Added ${artworkId} to queue.`);
      }
      refreshArtworkButton();
    });

    document.body.appendChild(queueButton);
  }

  function onNavigate() {
    refreshArtworkButton();
    updatePanel();
  }

  GM_registerMenuCommand("Export queue.json", exportQueue);
  GM_registerMenuCommand("Clear queue", () => {
    if (confirm("Clear the entire queue?")) {
      clearQueue();
      refreshArtworkButton();
    }
  });

  ensurePanel();
  updatePanel();
  refreshArtworkButton();

  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      onNavigate();
    }
  });
  observer.observe(document, { subtree: true, childList: true });

  window.addEventListener("popstate", onNavigate);
})();
