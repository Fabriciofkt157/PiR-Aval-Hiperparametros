const crypto = require("crypto");
const Q = require("../data/questions.json");
const { GITHUB_TOKEN: T, GITHUB_REPO: R, RESULTS_BRANCH: B = "resultados" } = process.env;

const H = (s) => crypto.createHmac("sha256", process.env.BLIND_SALT || "troque-o-salt").update(s).digest("hex");
// AVALIADORES="ana:tokenA,bia:tokenB,..."
const pairs = () => (process.env.AVALIADORES || "").split(",").filter(Boolean).map((p) => p.split(":"));
const who = (k) => (pairs().find((p) => p[1] === k && k) || [])[0];
const evaluators = () => pairs().map((p) => p[0]);

// ordem das perguntas e dos modelos, por avaliador: determinística e secreta (depende do BLIND_SALT)
const order = (id) => Q.questions.map((q) => q.idx).sort((a, b) => (H(`o|${id}|${a}`) < H(`o|${id}|${b}`) ? -1 : 1));
function slots(id, idx) {
  const a = [...Q.models], h = H(`s|${id}|${idx}`);
  for (let i = a.length - 1; i > 0; i--) { const j = parseInt(h.substr(i * 2, 2), 16) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const gh = (p, o = {}) => fetch(`https://api.github.com/repos/${R}/${p}`, { ...o, headers: { Authorization: `Bearer ${T}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" } });
let branchOk = false;
async function ensureBranch() {
  if (branchOk) return;
  if (!(await gh(`git/ref/heads/${B}`)).ok) {
    const repo = await (await gh("")).json();
    if (!repo.default_branch) throw new Error("GitHub: " + (repo.message || "repo não encontrado") + " (repo=" + R + ")");
    const ref = await (await gh(`git/ref/heads/${repo.default_branch}`)).json();
    if (!ref.object) throw new Error("GitHub: " + (ref.message || "branch principal sem commits"));
    await gh("git/refs", { method: "POST", body: JSON.stringify({ ref: `refs/heads/${B}`, sha: ref.object.sha }) });
  }
  branchOk = true;
}

async function read(path) {
  await ensureBranch();
  const r = await gh(`contents/${path}?ref=${B}`);
  if (r.status === 404) return { sha: null, text: "" };
  const d = await r.json();
  return { sha: d.sha, text: Buffer.from(d.content, "base64").toString() };
}
async function write(path, text, sha, message) {
  const r = await gh(`contents/${path}`, { method: "PUT", body: JSON.stringify({ message, branch: B, sha: sha || undefined, content: Buffer.from(text).toString("base64") }) });
  if (!r.ok) { const e = new Error(await r.text()); e.status = r.status; throw e; }
}

// results/<avaliador>.csv -> avaliador,idx,modelo,precisao,persona,escrita,total,ts
const HEAD = "avaliador,idx,modelo,precisao,persona,escrita,total,ts";
const parse = (t) => t.split("\n").slice(1).filter(Boolean).map((l) => { const [avaliador, idx, modelo, f, p, e, total, ts] = l.split(","); return { avaliador, idx: +idx, modelo, f: +f, p: +p, e: +e, total: +total, ts }; });
const load = async (id) => { const { sha, text } = await read(`results/${id}.csv`); return { sha, rows: parse(text) }; };
async function save(id, idx, rows) {
  for (let t = 0; t < 5; t++) {
    try {
      const { sha, rows: old } = await load(id);
      const all = old.filter((r) => r.idx !== idx).concat(rows).sort((a, b) => a.idx - b.idx);
      const csv = [HEAD, ...all.map((r) => [id, r.idx, r.modelo, r.f, r.p, r.e, r.f + r.p + r.e, r.ts].join(","))].join("\n") + "\n";
      return await write(`results/${id}.csv`, csv, sha, `${id}: pergunta ${idx}`);
    } catch (e) { if (![409, 422].includes(e.status) || t === 4) throw e; }
  }
}
module.exports = { Q, who, evaluators, order, slots, load, save };
