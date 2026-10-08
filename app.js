/* ============ VANTA PLAY — geo gate + page behaviour ============ */
(function () {
  "use strict";

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

    // Pick the "nearest" arena server from a demo region list.
    var regions = [
      { name: "EU-WEST · Frankfurt", lat: 50.1, lng: 8.7 },
      { name: "EU-NORTH · Stockholm", lat: 59.3, lng: 18.1 },
      { name: "US-EAST · Virginia", lat: 39.0, lng: -77.5 },
      { name: "US-WEST · Oregon", lat: 45.6, lng: -122.6 },
      { name: "ASIA-PAC · Singapore", lat: 1.35, lng: 103.8 },
      { name: "ASIA-EAST · Tokyo", lat: 35.7, lng: 139.7 },
      { name: "SA-EAST · São Paulo", lat: -23.5, lng: -46.6 },
      { name: "OCE · Sydney", lat: -33.9, lng: 151.2 }
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

    animateCounters();
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
      .then(function (res) {
        if (res.state === "granted") {
          requestLocation();
        } else {
          // Prompt directly so "page loads only after allow".
          requestLocation();
        }
      })
      .catch(requestLocation);
  } else {
    requestLocation();
  }

  /* ============ Page behaviour below (runs after unlock) ============ */

  // Live player counter.
  var liveEl = document.getElementById("live-count");
  var liveCount = 2847113;
  setInterval(function () {
    liveCount += Math.floor(Math.random() * 90) - 25;
    liveEl.textContent = liveCount.toLocaleString("en-US");
  }, 1500);

  // Scroll reveal.
  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });

  // Animated stat counters.
  function animateCounters() {
    document.querySelectorAll("[data-count]").forEach(function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var prefix = el.getAttribute("data-prefix") || "";
      var suffix = el.getAttribute("data-suffix") || "";
      var decimals = target % 1 !== 0 ? 1 : 0;
      var start = null;
      var dur = 1600;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  // Signup form.
  document.getElementById("signup").addEventListener("submit", function (e) {
    e.preventDefault();
    e.target.hidden = true;
    document.getElementById("cta-done").hidden = false;
  });
})();
