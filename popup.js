// When the popup opens, load any previously saved API key
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get("faceitApiKey", (data) => {
    if (data.faceitApiKey) {
      document.getElementById("apiKey").value = data.faceitApiKey;
    }
  });
});

// When the user clicks Save, store the key
document.getElementById("save").addEventListener("click", () => {
  const key = document.getElementById("apiKey").value.trim();
  if (!key) {
    document.getElementById("status").textContent = "Please enter a key first.";
    document.getElementById("status").style.color = "#f44";
    return;
  }
  chrome.storage.local.set({ faceitApiKey: key }, () => {
    document.getElementById("status").textContent = "✓ Saved! Refresh any FACEIT page.";
    document.getElementById("status").style.color = "#4caf50";
  });
});
