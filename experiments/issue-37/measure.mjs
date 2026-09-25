import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";
import { setup, owner, proofPath } from "./fixture.mjs";

const [dbArg, durationArg = "600", portArg = "37339"] = process.argv.slice(2);
if (!dbArg) throw new Error("usage: node measure.mjs NEW.db [duration_seconds] [port]");
const dbPath = proofPath(dbArg);
const durationSeconds = Number(durationArg);
const port = Number(portArg);
if (!Number.isInteger(durationSeconds) || durationSeconds < 5 ||
  !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid duration or port");
setup(dbPath);
const baseURL = `http://127.0.0.1:${port}`;
const token = "issue37-synthetic-measure-session";
const cookie = `life_os_37_proof_owner=${token}`;
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const percentile = (samples, fraction) => {
  const sorted = [...samples].sort((a,b) => a-b);
  return Number(sorted[Math.min(sorted.length-1, Math.floor((sorted.length-1)*fraction))].toFixed(2));
};
const mib = (kib) => Number((kib/1024).toFixed(1));
const bytes = (path) => { try { return statSync(path).size; } catch { return 0; } };
const cpuSeconds = (time) => time.split(":").reduce((sum, part) => sum*60+Number(part), 0);

function processes() {
  const output = execFileSync("ps", ["-A", "-o", "pid=,ppid=,rss=,time=,comm="], { encoding:"utf8" });
  const rows = new Map();
  for (const line of output.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
    if (match) rows.set(Number(match[1]), {
      pid:Number(match[1]), ppid:Number(match[2]), rssKib:Number(match[3]),
      cpu:cpuSeconds(match[4]), command:match[5],
    });
  }
  return rows;
}

function descendants(rows, rootPid) {
  const found = new Set([rootPid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows.values()) if (found.has(row.ppid) && !found.has(row.pid)) {
      found.add(row.pid); changed = true;
    }
  }
  return found;
}

function sample(serverPid) {
  const rows = processes();
  const all = descendants(rows, process.pid);
  const server = descendants(rows, serverPid);
  const browser = new Set([...all].filter((pid) => !server.has(pid) && pid !== process.pid &&
    !rows.get(pid)?.command.endsWith("/ps")));
  const values = (pids) => [...pids].map((pid) => rows.get(pid)).filter(Boolean);
  const appRows = values(server), browserRows = values(browser);
  const sum = (items, key) => items.reduce((total, row) => total+row[key], 0);
  return {
    at: performance.now(),
    serverPids: appRows.map((row) => row.pid),
    browserPids: browserRows.map((row) => row.pid),
    serverRssMiB: mib(sum(appRows,"rssKib")),
    browserRssMiB: mib(sum(browserRows,"rssKib")),
    serverCpu: sum(appRows,"cpu"),
    browserCpu: sum(browserRows,"cpu"),
  };
}

function cpuPercent(first, last, key) {
  return Number((100*Math.max(0,last[key]-first[key])/((last.at-first.at)/1000)).toFixed(2));
}

async function startServer() {
  const started = performance.now();
  const child = spawn(process.execPath, [resolve("node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd:resolve("."),
    env:{...process.env,LIFE_OS_37_PROOF:"1",LIFE_OS_37_SQLITE_DB:dbPath,LIFE_OS_37_OWNER_TOKEN:token},
    stdio:["ignore","pipe","pipe"],
  });
  let logs = "";
  child.stdout.on("data",(chunk)=>{logs+=chunk;});
  child.stderr.on("data",(chunk)=>{logs+=chunk;});
  for (let attempt=0;attempt<100;attempt++) {
    if (child.exitCode!==null) throw new Error(`Next exited: ${logs}`);
    try {
      const response=await fetch(baseURL+"/dashboard",{headers:{cookie}});
      if (response.ok && (await response.text()).includes("Synthetic Goal"))
        return {child,startupMs:Number((performance.now()-started).toFixed(1)),logs:()=>logs};
    } catch {}
    await sleep(50);
  }
  child.kill("SIGKILL");
  throw new Error(`Next did not become usable: ${logs}`);
}

const routes=[
  "/dashboard","/today","/calendar","/portfolio",
  "/tasks/37000000-0000-4000-8003-000000000001",
  "/projects/37000000-0000-4000-8002-000000000001",
  "/goals/37000000-0000-4000-8001-000000000001",
];
let running, browser;
try {
  running=await startServer();
  const startupMs=running.startupMs;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({baseURL,viewport:{width:1920,height:1080}});
  await context.addCookies([{name:"life_os_37_proof_owner",value:token,url:baseURL,httpOnly:true,sameSite:"Strict"}]);
  const page=await context.newPage();
  const errors=[];
  page.on("pageerror",(error)=>errors.push(error.message));
  page.on("console",(message)=>{
    if(message.type()==="error"||/hydration|hydrated|mismatch/i.test(message.text()))errors.push(message.text());
  });
  for (const route of routes) {
    const response=await page.goto(route,{waitUntil:"load"});
    assert.equal(response.status(),200,route);
    await page.waitForFunction(() => document.body.innerText.includes("Synthetic "), null, { timeout: 10000 });
  }
  await page.goto("/dashboard");
  const warm=sample(running.child.pid);
  let idleRequests=0;
  const idleRequestUrls=new Map();
  const requestCounter=(request)=>{
    idleRequests++;
    const url=new URL(request.url());
    const key=url.pathname;
    idleRequestUrls.set(key,(idleRequestUrls.get(key)??0)+1);
  };
  page.on("request",requestCounter);
  const idleSamples=[warm];
  const idleRequestsPerFiveSeconds=[];
  for(let elapsed=0;elapsed<60;elapsed+=5){
    const previous=idleRequests;
    await sleep(5000);idleSamples.push(sample(running.child.pid));
    idleRequestsPerFiveSeconds.push(idleRequests-previous);
  }
  page.off("request",requestCounter);
  const idleEnd=idleSamples.at(-1);
  console.log(JSON.stringify({phase:"idle",startupMs:running.startupMs,serverRssMiB:idleEnd.serverRssMiB,
    browserRssMiB:idleEnd.browserRssMiB,serverCpuPercent:cpuPercent(warm,idleEnd,"serverCpu"),
    browserCpuPercent:cpuPercent(warm,idleEnd,"browserCpu"),idleRequests,
    idleRequestsPerFiveSeconds}));

  const navStart=performance.now(),navSamples=[sample(running.child.pid)],navTimes=[];
  let count=0;
  while(performance.now()-navStart<durationSeconds*1000){
    const cycleStart=performance.now();
    const route=routes[count%routes.length];
    const response=await page.goto(route,{waitUntil:"load"});
    assert.equal(response.status(),200,route);
    await page.waitForFunction(() => document.body.innerText.includes("Synthetic "), null, { timeout: 10000 });
    navTimes.push(performance.now()-cycleStart);
    count++;
    await sleep(Math.max(0,5000-(performance.now()-cycleStart)));
    navSamples.push(sample(running.child.pid));
    if(count%12===0) console.log(JSON.stringify({phase:"navigation",elapsedSeconds:Math.round((performance.now()-navStart)/1000),navigations:count}));
  }
  const navigationEnd=navSamples.at(-1);
  const intervals=navSamples.slice(1).map((entry,index)=>({
    server:cpuPercent(navSamples[index],entry,"serverCpu"),
    browser:cpuPercent(navSamples[index],entry,"browserCpu"),
  }));

  const httpReadMs=[];
  for(let index=0;index<70;index++){
    const started=performance.now();
    const response=await fetch(baseURL+routes[index%routes.length],{headers:{cookie}});
    await response.arrayBuffer();
    assert.equal(response.status,200);
    httpReadMs.push(performance.now()-started);
  }
  const uiWriteMs=[];
  for(let index=0;index<20;index++){
    await page.goto("/tasks/new");
    await page.getByRole("textbox",{name:"Titel",exact:true}).fill(`Synthetic Measured Task ${index} ${Date.now()}`);
    const started=performance.now();
    await page.getByRole("button",{name:"Task erstellen"}).click();
    await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/);
    uiWriteMs.push(performance.now()-started);
  }
  const footprintBeforeClose={dbBytes:bytes(dbPath),walBytes:bytes(dbPath+"-wal"),shmBytes:bytes(dbPath+"-shm")};
  assert.deepEqual(errors,[],errors.join("\n"));
  await context.close();
  await browser.close(); browser=null;
  const stopped=new Promise((done)=>running.child.once("exit",done));
  running.child.kill("SIGTERM"); await stopped;
  running=null;

  const db=new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys=ON");
  const nativeReadMs=[],nativeWriteMs=[];
  const query=db.prepare("SELECT id,title,status FROM tasks WHERE user_id=? AND planned_date IS NOT NULL ORDER BY created_at LIMIT 30");
  const insert=db.prepare("INSERT INTO tasks(id,user_id,title,status,priority,created_at,updated_at) VALUES(?,?,'Synthetic measured native write','planned','P2',?,?)");
  for(let index=0;index<100;index++){const started=performance.now();query.all(owner);nativeReadMs.push(performance.now()-started);}
  for(let index=0;index<30;index++){const started=performance.now();const now=new Date().toISOString();insert.run(randomUUID(),owner,now,now);nativeWriteMs.push(performance.now()-started);}
  const journalMode=db.prepare("PRAGMA journal_mode").get().journal_mode;
  db.close();
  const summary={
    status:"PASS",durationSeconds:Number(((navigationEnd.at-navSamples[0].at)/1000).toFixed(1)),
    startupMs,
    processCount:{server:warm.serverPids.length,browser:warm.browserPids.length,dockerSpawned:0},
    warm:{serverRssMiB:warm.serverRssMiB,browserRssMiB:warm.browserRssMiB},
    idle:{seconds:60,serverRssMiB:idleEnd.serverRssMiB,browserRssMiB:idleEnd.browserRssMiB,
      serverCpuPercent:cpuPercent(warm,idleEnd,"serverCpu"),browserCpuPercent:cpuPercent(warm,idleEnd,"browserCpu"),requests:idleRequests,
      requestsPerFiveSeconds:idleRequestsPerFiveSeconds,
      topRequestPaths:[...idleRequestUrls.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)},
    navigation:{count,serverRssMiB:navigationEnd.serverRssMiB,browserRssMiB:navigationEnd.browserRssMiB,
      serverPeakRssMiB:Math.max(...navSamples.map((entry)=>entry.serverRssMiB)),
      browserPeakRssMiB:Math.max(...navSamples.map((entry)=>entry.browserRssMiB)),
      combinedPeakRssMiB:Math.max(...navSamples.map((entry)=>entry.serverRssMiB+entry.browserRssMiB)),
      serverAvgCpuPercent:cpuPercent(navSamples[0],navigationEnd,"serverCpu"),
      serverPeakCpuPercent:Math.max(...intervals.map((entry)=>entry.server)),
      browserAvgCpuPercent:cpuPercent(navSamples[0],navigationEnd,"browserCpu"),
      browserPeakCpuPercent:Math.max(...intervals.map((entry)=>entry.browser)),
      browserNavigationMs:{p50:percentile(navTimes,.5),p95:percentile(navTimes,.95)}},
    latencyMs:{httpRead:{p50:percentile(httpReadMs,.5),p95:percentile(httpReadMs,.95)},
      uiWrite:{p50:percentile(uiWriteMs,.5),p95:percentile(uiWriteMs,.95)},
      sqliteRead:{p50:percentile(nativeReadMs,.5),p95:percentile(nativeReadMs,.95)},
      sqliteWrite:{p50:percentile(nativeWriteMs,.5),p95:percentile(nativeWriteMs,.95)}},
    db:{journalMode,footprintBeforeClose,dbBytes:bytes(dbPath),walBytes:bytes(dbPath+"-wal"),shmBytes:bytes(dbPath+"-shm")},
    browserErrors:errors.length,
  };
  console.log(JSON.stringify(summary));
} finally {
  if(browser) await browser.close();
  if(running?.child && running.child.exitCode===null) running.child.kill("SIGKILL");
}
