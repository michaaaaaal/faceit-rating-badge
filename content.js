const API_KEY = "8e6b68e0-9705-49f3-9737-f1ba895f38b0";

const ratingCache = {};
const fetchInProgress = new Set();
const queued = new Set();
const cardBadgeMap = new Map();

// Track badge positions every frame
function updateBadgePositions() {
  cardBadgeMap.forEach(function(badge, card) {
    if (!document.body.contains(card)) {
      badge.remove();
      cardBadgeMap.delete(card);
      return;
    }
    const rect = card.getBoundingClientRect();
    const bw = badge.offsetWidth;
    const bh = badge.offsetHeight;
    badge.style.left = (rect.right - bw * 0.75) + "px";
    badge.style.top  = (rect.bottom - bh * 0.5) + "px";
  });
  requestAnimationFrame(updateBadgePositions);
}
requestAnimationFrame(updateBadgePositions);

function getCardContainer(nameEl) {
  let el = nameEl;
  for (let i = 0; i < 5; i++) el = el.parentNode;
  return el;
}

async function tryInjectBadges() {
  const nameEls = document.querySelectorAll('[class*="Nickname__Name"]');
  for (const el of nameEls) {
    const nickname = el.textContent.trim();
    if (!nickname) continue;
    const card = getCardContainer(el);

    if (ratingCache[nickname] !== undefined) {
      if (!cardBadgeMap.has(card)) injectBadge(card, ratingCache[nickname]);
      continue;
    }

    if (fetchInProgress.has(nickname) || queued.has(nickname)) continue;
    queued.add(nickname);
    await new Promise(r => setTimeout(r, queued.size * 150));

    fetchInProgress.add(nickname);
    fetchFaceitRating(nickname).then(function(rating) {
      fetchInProgress.delete(nickname);
      if (rating !== null) {
        ratingCache[nickname] = rating;
        document.querySelectorAll('[class*="Nickname__Name"]').forEach(function(e) {
          if (e.textContent.trim() === nickname) {
            const c = getCardContainer(e);
            if (!cardBadgeMap.has(c)) injectBadge(c, rating);
          }
        });
      }
    }).catch(function() {
      fetchInProgress.delete(nickname);
      queued.delete(nickname);
    });
  }
}

async function fetchFaceitRating(nickname) {
  const playerRes = await fetch(
    "https://open.faceit.com/data/v4/players?nickname=" + encodeURIComponent(nickname) + "&game=cs2",
    { headers: { Authorization: "Bearer " + API_KEY } }
  );
  if (!playerRes.ok) return null;
  const playerData = await playerRes.json();
  const playerId = playerData.player_id;
  if (!playerId) return null;

  const roundsRes = await fetch(
    "https://www.faceit.com/api/statistics/v1/cs2/players/" + playerId + "/match-rounds?gameMode=5v5&limit=30"
  );
  if (!roundsRes.ok) return null;
  const roundsData = await roundsRes.json();
  const matches = (roundsData.payload && roundsData.payload.cs2 && roundsData.payload.cs2.match_rounds) || [];
  const valid = matches.filter(function(m) { return typeof m.faceit_rating === "number" && !isNaN(m.faceit_rating); });
  if (valid.length === 0) return null;
  return valid.reduce(function(sum, m) { return sum + m.faceit_rating; }, 0) / valid.length;
}

function getBadgeColors(rating) {
  if (rating < 0.90) return { bg: "linear-gradient(180deg,#3d0000 0%,#200000 100%)", color: "#ff4444", accent: "#cc1111" };
  if (rating < 1.15) return { bg: "linear-gradient(180deg,#2a2a2a 0%,#161616 100%)", color: "#bbbbbb", accent: "#777777" };
  if (rating < 1.24) return { bg: "linear-gradient(180deg,#003d00 0%,#001f00 100%)", color: "#44ee44", accent: "#119911" };
  return { bg: "linear-gradient(180deg,#3d2600 0%,#211400 100%)", color: "#ffbb00", accent: "#cc8800" };
}

function injectBadge(card, rating) {
  if (cardBadgeMap.has(card)) return;
  const c = getBadgeColors(rating);
  const badge = document.createElement("span");
  badge.className = "fr-badge";
  badge.style.cssText = [
    "position:fixed",
    "z-index:100",        // low enough that modals appear on top
    "display:inline-flex",
    "align-items:center",
    "justify-content:center",
    "background:" + c.bg,
    "color:" + c.color,
    "border-radius:999px",
    "font-size:11px",
    "font-weight:700",
    "padding:3px 9px",
    "cursor:default",
    "font-family:Arial,sans-serif",
    "letter-spacing:0.4px",
    "min-width:38px",
    "text-align:center",
    "border:1px solid " + c.accent,
    "box-shadow:inset 0 1px 0 rgba(255,255,255,0.08)",
    "line-height:1.4",
    "pointer-events:auto"  // allows hover tooltip
  ].join(";");
  badge.textContent = rating.toFixed(2);
  badge.title = rating < 0.90 ? "Poor" : rating < 1.15 ? "Okay" : rating < 1.24 ? "Good" : "High Impact";
  document.body.appendChild(badge);
  cardBadgeMap.set(card, badge);
}

const observer = new MutationObserver(tryInjectBadges);
observer.observe(document.body, { childList: true, subtree: true });
setInterval(tryInjectBadges, 2000);
tryInjectBadges();
