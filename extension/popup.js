const statusEl = document.getElementById("status");
const btnEl = document.getElementById("toggleBtn");
const errorEl = document.getElementById("error");
const logEl = document.getElementById("log");
const transcriptEl = document.getElementById("transcript");
let capturing = false;

function log(msg) {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${msg}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function updateUI(isCapturing) {
  capturing = isCapturing;
  btnEl.disabled = false;
  if (capturing) {
    statusEl.textContent = "Capturing audio...";
    statusEl.classList.add("active");
    btnEl.textContent = "Stop Capture";
    btnEl.className = "btn-stop";
  } else {
    statusEl.textContent = "Not capturing";
    statusEl.classList.remove("active");
    btnEl.textContent = "Capture This Tab";
    btnEl.className = "btn-start";
  }
  errorEl.textContent = "";
}

function appendTranscript(text) {
  const p = document.createElement("p");
  p.textContent = text;
  transcriptEl.appendChild(p);
  transcriptEl.scrollTop = transcriptEl.scrollHeight;
}

log("Popup opened");

// Check initial status
chrome.runtime.sendMessage({ action: "status" }, (res) => {
  const err = chrome.runtime.lastError;
  if (err) {
    log("Status error: " + err.message);
    return;
  }
  log("Status: " + JSON.stringify(res));
  if (res) updateUI(res.capturing);
});

// Listen for transcript messages forwarded from offscreen
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.target !== "popup") return;

  if (msg.type === "transcript" && msg.text?.trim()) {
    log("Transcript #" + msg.sequence);
    appendTranscript(msg.text);
  }

  if (msg.type === "error") {
    log("Error: " + msg.message);
    errorEl.textContent = msg.message;
  }
});

btnEl.addEventListener("click", () => {
  log("Click: " + (capturing ? "stop" : "start"));
  btnEl.disabled = true;
  errorEl.textContent = "";

  const action = capturing ? "stop" : "start";

  chrome.runtime.sendMessage({ action }, (res) => {
    const err = chrome.runtime.lastError;
    if (err) {
      log("Error: " + err.message);
      errorEl.textContent = err.message;
      btnEl.disabled = false;
      return;
    }
    log("Response: " + JSON.stringify(res));
    if (res?.ok) {
      updateUI(action === "start");
      if (action === "start") {
        transcriptEl.innerHTML = "";
      }
    } else {
      errorEl.textContent = res?.error || "Unknown error";
      btnEl.disabled = false;
    }
  });
});
