/* Publishes the site to GitHub Pages. Token stays in memory only. */
const { execSync, spawn } = require("child_process");
const https = require("https");

const REPO_BASE = "vanta-play";

function log(m) { console.log(m); }

function api(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "User-Agent": "vanta-publish",
        Accept: "application/vnd.github+json",
        Authorization: "token " + token,
        "Content-Type": "application/json",
        "Content-Length": data ? Buffer.byteLength(data) : 0
      }
    }, res => {
      let buf = "";
      res.on("data", c => (buf += c));
      res.on("end", () => {
        let json = null;
        try { json = buf ? JSON.parse(buf) : null; } catch (e) {}
        resolve({ status: res.statusCode, json, raw: buf });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

function getCred() {
  return new Promise((resolve, reject) => {
    const p = spawn("git", ["credential", "fill"], { shell: true });
    let out = "";
    p.stdout.on("data", c => (out += c));
    p.stderr.on("data", () => {});
    p.on("close", code => {
      const get = k => {
        const m = out.match(new RegExp("^" + k + "=(.*)$", "m"));
        return m ? m[1] : null;
      };
      if (code !== 0 || !get("password")) return reject(new Error("no credential: " + out.replace(/password=.*/g, "password=<hidden>")));
      resolve({ username: get("username"), token: get("password") });
    });
    p.stdin.write("protocol=https\nhost=github.com\n\n");
    p.stdin.end();
  });
}

function sh(cmd) {
  execSync(cmd, { stdio: "pipe" });
}

(async () => {
  let cred;
  try {
    cred = await getCred();
  } catch (e) {
    log("AUTH_FAILED: " + e.message);
    process.exit(1);
  }
  log("authenticated as: " + cred.username);

  // Commit everything.
  try { sh("git add -A"); } catch (e) {}
  try {
    sh('git -c user.name="' + cred.username + '" -c user.email="' + cred.username + '@users.noreply.github.com" commit -m "VANTA PLAY gaming landing page with geo-location gate"');
    log("committed");
  } catch (e) { log("nothing to commit or commit skipped"); }

  // Create repo (retry with suffix if name taken).
  let repo = null;
  for (const name of [REPO_BASE, REPO_BASE + "-landing", REPO_BASE + "-" + Date.now().toString(36)]) {
    const r = await api("POST", "/user/repos", cred.token, {
      name, private: false, has_issues: false, has_wiki: false, auto_init: false
    });
    if (r.status === 201) { repo = name; log("created repo: " + name); break; }
    if (r.status === 422) { log("name taken: " + name); continue; }
    log("repo create failed (" + r.status + "): " + (r.json && r.json.message));
    process.exit(1);
  }
  if (!repo) { log("could not find a free repo name"); process.exit(1); }

  const owner = cred.username;
  const remote = "https://github.com/" + owner + "/" + repo + ".git";

  // Push.
  try { sh("git remote remove origin"); } catch (e) {}
  sh("git remote add origin " + remote);
  try {
    sh("git push -u origin main");
    log("pushed to " + remote);
  } catch (e) {
    log("PUSH_FAILED: " + (e.stderr ? e.stderr.toString().slice(0, 400) : e.message));
    process.exit(1);
  }

  // Enable Pages from main root.
  const pr = await api("POST", "/repos/" + owner + "/" + repo + "/pages", cred.token, {
    source: { branch: "main", path: "/" }
  });
  if (pr.status === 201 || pr.status === 409) {
    log("pages enabled (" + pr.status + ")");
  } else {
    log("pages enable returned " + pr.status + ": " + (pr.json && pr.json.message));
  }

  // Poll first build.
  const url = "https://" + owner + ".github.io/" + repo + "/";
  let built = false;
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));
    const b = await api("GET", "/repos/" + owner + "/" + repo + "/pages/builds/latest", cred.token);
    const st = b.json && b.json.status;
    log("build status: " + st);
    if (st === "built") { built = true; break; }
    if (st === "errored" || st === "build_error") break;
  }
  log(built ? "LIVE: " + url : "PAGES_URL (build may still be in progress): " + url);
})().catch(e => { log("ERROR: " + (e.stderr ? e.stderr.toString().slice(0, 400) : e.message)); process.exit(1); });
