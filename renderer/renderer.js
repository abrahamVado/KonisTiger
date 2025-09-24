const $ = (s) => document.querySelector(s);
const logs = $("#logs");
function println(s){ const d=document.createElement("div"); d.textContent=s; logs.appendChild(d); logs.scrollTop=logs.scrollHeight; }

api.onLog((s)=>println(s));

async function syncCfg(){
  const c = await api.getCfg();
  $("#repoUrl").value = c.repoUrl || "";
  $("#baseDir").value = c.baseDir || "";
}
syncCfg();

$("#saveRepo").addEventListener("click", async ()=>{
  await api.updateCfg({ repoUrl: $("#repoUrl").value.trim() });
  println("Saved repo URL.");
});
$("#pickBase").addEventListener("click", async ()=>{
  const dir = await api.pickBase();
  if (dir) { $("#baseDir").value = dir; println("Base set."); }
});
$("#clone").addEventListener("click", async ()=>{
  const url = $("#repoUrl").value.trim(), base = $("#baseDir").value.trim();
  if (!url || !base) return println("Set repo URL and base.");
  const r = await api.cloneRepo(url, base).catch(e=>println(e.message));
  println(r?.msg || "Clone done");
});
$("#pull").addEventListener("click", async ()=>{
  const r = await api.pullRepo().catch(e=>println(e.message));
  println("Pulled.");
});
$("#install").addEventListener("click", async ()=>{
  await api.installDeps().catch(e=>println(e.message));
  println("Install finished.");
});
$("#export").addEventListener("click", async ()=>{
  println("Building + Exporting…");
  await api.buildExportLoad().catch(e=>println(e.message));
  println("Loaded static export in this window.");
});

// --- Auth demo wiring ---
let lastUserId = null;

$("#btnRegister").addEventListener("click", async ()=>{
  const res = await window.auth.register($("#email").value, $("#pwd").value);
  println(JSON.stringify(res));
  if (res.ok) lastUserId = res.userId;
});

$("#btnLogin").addEventListener("click", async ()=>{
  const res = await window.auth.login($("#email").value, $("#pwd").value);
  println(JSON.stringify(res));
  if (res.ok) localStorage.setItem("token", res.token);
});

$("#btnStartVerify").addEventListener("click", async ()=>{
  if (!lastUserId) return println("Register first to get userId.");
  const res = await window.auth.startVerify(lastUserId);
  println("Verify code: " + JSON.stringify(res));
});

$("#btnConfirmVerify").addEventListener("click", async ()=>{
  if (!lastUserId) return println("Need userId.");
  const res = await window.auth.confirmVerify(lastUserId, $("#codeVer").value);
  println(JSON.stringify(res));
});

$("#btnStartReset").addEventListener("click", async ()=>{
  const res = await window.auth.startReset($("#email").value);
  println("Reset started: " + JSON.stringify(res));
  if (res.userId) lastUserId = res.userId;
});

$("#btnConfirmReset").addEventListener("click", async ()=>{
  if (!lastUserId) return println("Need userId.");
  const res = await window.auth.confirmReset(lastUserId, $("#codeReset").value, $("#newPwd").value);
  println(JSON.stringify(res));
});
