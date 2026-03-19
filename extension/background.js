/**
 * VirtualBrain Chrome Extension — Background Service Worker (MV3)
 *
 * Coordinates between popup and offscreen document.
 * Uses chrome.tabCapture.getMediaStreamId() (works in MV3 service workers)
 * then delegates audio processing to an offscreen document.
 */

let capturing = false;
let offscreenReady = false;

async function ensureOffscreenDocument() {
  if (offscreenReady) return;

  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
  });
  if (existingContexts.length > 0) {
    offscreenReady = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Audio processing for tab capture and VirtualBrain transcription",
  });
  offscreenReady = true;
}

async function startCapture() {
  if (capturing) return { ok: false, error: "Already capturing" };

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return { ok: false, error: "No active tab found" };

  console.log("[bg] Getting stream ID for tab", tab.id);

  // Get a media stream ID for this tab's audio
  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tab.id,
  });

  console.log("[bg] Got streamId:", streamId?.substring(0, 20) + "...");

  // Create the offscreen document
  await ensureOffscreenDocument();

  console.log("[bg] Offscreen ready, sending start");

  // Tell the offscreen document to start capturing with this stream ID
  const response = await chrome.runtime.sendMessage({
    target: "offscreen",
    action: "start",
    streamId,
  });

  console.log("[bg] Offscreen response:", response);

  if (response?.ok) {
    capturing = true;
  }
  return response || { ok: false, error: "No response from offscreen document" };
}

async function stopCapture() {
  if (!capturing) return { ok: true };

  console.log("[bg] Stopping capture");

  try {
    await chrome.runtime.sendMessage({
      target: "offscreen",
      action: "stop",
    });
  } catch (e) {
    console.log("[bg] Stop message error (offscreen may be closed):", e.message);
  }

  capturing = false;
  offscreenReady = false;

  try {
    await chrome.offscreen.closeDocument();
  } catch {
    // already closed
  }

  return { ok: true };
}

// Handle messages from popup (ignore messages targeted at offscreen)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target === "offscreen") return false;

  console.log("[bg] Received:", msg.action);

  if (msg.action === "start") {
    startCapture()
      .then((res) => {
        console.log("[bg] startCapture result:", res);
        sendResponse(res);
      })
      .catch((err) => {
        console.error("[bg] startCapture error:", err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async
  }

  if (msg.action === "stop") {
    stopCapture()
      .then(sendResponse)
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (msg.action === "status") {
    sendResponse({ capturing });
    return false;
  }
});
