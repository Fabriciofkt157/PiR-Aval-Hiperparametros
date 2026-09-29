const { Q, who, evaluators, order, slots, groups, load, save } = require("./_core");
const byIdx = (i) => Q.questions.find((q) => q.idx === +i);
const qt = (s) => `"${String(s).replace(/"/g, '""')}"`;

module.exports = async (req, res) => {
  try {
    const a = req.query.a, k = req.query.k;
    if (a === "export") { // admin: tudo, com o nome do modelo
      if (!process.env.ADMIN_TOKEN || k !== process.env.ADMIN_TOKEN) return res.status(401).json({ error: "não autorizado" });
      const out = [];
      for (const id of evaluators()) for (const r of (await load(id)).rows) {
        const q = byIdx(r.idx);
        out.push({ avaliador: id, idx: r.idx, prompt: q.prompt, modelo: r.modelo, resposta: q.r[r.modelo], precisao: r.f, persona: r.p, escrita: r.e, total: r.total, ts: r.ts });
      }
      if (req.query.format === "csv") {
        const cols = Object.keys(out[0] || { avaliador: 1 });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=avaliacoes_completo.csv");
        return res.send("\ufeff" + [cols.join(","), ...out.map((o) => cols.map((c) => qt(o[c])).join(","))].join("\n"));
      }
      res.setHeader("Content-Disposition", "attachment; filename=avaliacoes_completo.json");
      return res.json(out);
    }
    const id = who(k);
    if (!id) return res.status(401).json({ error: "link/código inválido" });

    if (a === "session") {
      const done = [...new Set((await load(id)).rows.map((r) => r.idx))];
      return res.json({ id, order: order(id), done, n: Q.models.length });
    }
    if (a === "question") {
      const q = byIdx(req.query.idx);
      if (!q) return res.status(404).json({ error: "pergunta inexistente" });
      const g = groups(id, q.idx), rows = (await load(id)).rows.filter((r) => r.idx === q.idx);
      // nota do grupo = nota (única) de seus modelos; se avaliações antigas divergirem dentro do grupo, pede para reavaliar
      const saved = rows.length ? g.map((x) => {
        const rs = x.models.map((m) => rows.find((r) => r.modelo === m));
        const same = rs.every((r) => r && r.f === rs[0].f && r.p === rs[0].p && r.e === rs[0].e);
        return same ? [rs[0].f, rs[0].p, rs[0].e] : [null, null, null];
      }) : null;
      return res.json({ idx: q.idx, prompt: q.prompt, texts: g.map((x) => x.text), total: Q.models.length, ref: q.ref || null, saved });
    }
    if (a === "rate" && req.method === "POST") {
      const { idx, scores } = req.body || {}, q = byIdx(idx);
      const g = q && groups(id, q.idx);
      const ok = q && Array.isArray(scores) && scores.length === g.length && scores.every((s) => Array.isArray(s) && s.length === 3 && s.every((v) => Number.isInteger(v) && v >= 0 && v <= 5));
      if (!ok) return res.status(400).json({ error: "payload inválido" });
      const ts = new Date().toISOString();
      // uma nota por resposta distinta vale para todos os modelos que a produziram
      await save(id, q.idx, g.flatMap((x, i) => x.models.map((m) => ({ idx: q.idx, modelo: m, f: scores[i][0], p: scores[i][1], e: scores[i][2], ts }))));
      return res.json({ ok: true });
    }
    if (a === "mine") { // download do avaliador (sem revelar os modelos)
      const rows = (await load(id)).rows, out = [];
      for (const i of [...new Set(rows.map((r) => r.idx))]) {
        const q = byIdx(i);
        out.push({ idx: i, prompt: q.prompt, respostas: slots(id, i).map((m, n) => { const r = rows.find((x) => x.idx === i && x.modelo === m); return { posicao: n + 1, grupo: groups(id, i).findIndex((x) => x.models.includes(m)) + 1, texto: q.r[m], precisao: r.f, persona: r.p, escrita: r.e, total: r.total }; }) });
      }
      res.setHeader("Content-Disposition", `attachment; filename=avaliacoes_${id}.json`);
      return res.json({ avaliador: id, avaliacoes: out });
    }
    res.status(404).json({ error: "rota inexistente" });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
