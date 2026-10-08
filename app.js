/* ============ VANTA PLAY — geo gate + page behaviour ============ */
(function () {
  "use strict";

  /* ---------- Geo gate ---------- */
  var gate = document.getElementById("gate");
  var app = document.getElementById("app");
  var stateAsk = document.getElementById("gate-ask");
  var stateLocating = document.getElementById("gate-locating");
  var stateBlocked = document.getElementById("gate-blocked");
  var blockedMsg = document.getElementById("blocked-msg");
  var btnAllow = document.getElementById("btn-allow");
  var btnRetry = document.getElementById("btn-retry");

  function showState(el) {
    [stateAsk, stateLocating, stateBlocked].forEach(function (s) {
      s.classList.toggle("gate__state--hidden", s !== el);
    });
  }

  function unlockPage(position) {
    var lat = position.coords.latitude;
    var lng = position.coords.longitude;
    var acc = Math.round(position.coords.accuracy);

    document.getElementById("region-coords").textContent =
      lat.toFixed(5) + ", " + lng.toFixed(5) + " (±" + acc + "m)";

    // Pick the "nearest" game server from a demo region list.
    var regions = [
      { name: "PK-EAST · Karachi", lat: 24.86, lng: 67.0 },
      { name: "PK-NORTH · Islamabad", lat: 33.68, lng: 73.05 },
      { name: "EU-WEST · Frankfurt", lat: 50.1, lng: 8.7 },
      { name: "ASIA-PAC · Singapore", lat: 1.35, lng: 103.8 },
      { name: "ASIA-EAST · Tokyo", lat: 35.7, lng: 139.7 },
      { name: "US-EAST · Virginia", lat: 39.0, lng: -77.5 },
      { name: "US-WEST · Oregon", lat: 45.6, lng: -122.6 },
      { name: "ME-SOUTH · Dubai", lat: 25.2, lng: 55.27 }
    ];
    var best = regions[0];
    var bestD = Infinity;
    regions.forEach(function (r) {
      var d = (r.lat - lat) * (r.lat - lat) + (r.lng - lng) * (r.lng - lng);
      if (d < bestD) { bestD = d; best = r; }
    });
    document.getElementById("region-server").textContent = best.name;

    // Reveal the page.
    document.body.classList.remove("locked");
    app.classList.add("unlocked");
    app.setAttribute("aria-hidden", "false");
    gate.classList.add("gate--open");
    setTimeout(function () { gate.style.display = "none"; }, 700);

    // Optional: reverse geocode for a friendly city name (non-blocking).
    var cityEl = document.getElementById("region-city");
    cityEl.textContent = lat.toFixed(3) + "°, " + lng.toFixed(3) + "°";
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, 6000);
      fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=" +
          lat + "&lon=" + lng,
        { signal: ctrl.signal, headers: { Accept: "application/json" } }
      )
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var a = data.address || {};
          cityEl.textContent =
            (a.city || a.town || a.village || a.county || a.state || "YOUR REGION") +
            (a.country ? ", " + a.country : "");
        })
        .catch(function () {})
        .finally(function () { clearTimeout(t); });
    } catch (e) { /* reverse geocode is optional */ }
  }

  function handleGeoError(err) {
    if (err && err.code === err.PERMISSION_DENIED) {
      blockedMsg.textContent =
        "Location permission was denied, so the arena stays sealed. VANTA PLAY cannot verify your region.";
      showState(stateBlocked);
    } else if (err && err.code === err.POSITION_UNAVAILABLE) {
      blockedMsg.textContent =
        "Your position is currently unavailable. Make sure location services are on, then retry.";
      showState(stateBlocked);
    } else {
      blockedMsg.textContent =
        "The location request timed out. Check location services and try again.";
      showState(stateBlocked);
    }
  }

  function requestLocation() {
    showState(stateLocating);
    if (!("geolocation" in navigator)) {
      blockedMsg.textContent = "This browser does not support geolocation.";
      showState(stateBlocked);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      unlockPage,
      handleGeoError,
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  btnAllow.addEventListener("click", requestLocation);
  btnRetry.addEventListener("click", requestLocation);

  // Auto-trigger the browser permission prompt as soon as the page opens.
  if (navigator.permissions && navigator.permissions.query) {
    navigator.permissions
      .query({ name: "geolocation" })
      .then(function () { requestLocation(); })
      .catch(requestLocation);
  } else {
    requestLocation();
  }

  /* ---------- Download strip ---------- */
  var dlstrip = document.getElementById("dlstrip");
  document.getElementById("dlstrip-close").addEventListener("click", function () {
    dlstrip.classList.add("dlstrip--gone");
  });

  /* ---------- Carousel ---------- */
  var track = document.getElementById("carousel-track");
  var dots = document.querySelectorAll("#carousel-dots span");
  var slideCount = track.children.length;
  var idx = 0;
  function goTo(i) {
    idx = (i + slideCount) % slideCount;
    track.style.transform = "translateX(-" + idx * 100 + "%)";
    dots.forEach(function (d, n) { d.classList.toggle("on", n === idx); });
  }
  setInterval(function () { goTo(idx + 1); }, 4000);

  // Swipe support.
  var startX = null;
  track.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", function (e) {
    if (startX === null) return;
    var dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) goTo(idx + (dx < 0 ? 1 : -1));
    startX = null;
  }, { passive: true });

  /* ---------- Games grid paging ---------- */
  var grid = document.getElementById("games-grid");
  document.getElementById("g-next").addEventListener("click", function () {
    grid.scrollBy({ left: grid.clientWidth, behavior: "smooth" });
  });
  document.getElementById("g-prev").addEventListener("click", function () {
    grid.scrollBy({ left: -grid.clientWidth, behavior: "smooth" });
  });

  /* ---------- Bottom nav active state ---------- */
  var navItems = document.querySelectorAll(".bnav__item");
  navItems.forEach(function (item) {
    item.addEventListener("click", function () {
      navItems.forEach(function (n) { n.classList.remove("on"); });
      item.classList.add("on");
    });
  });
})();
