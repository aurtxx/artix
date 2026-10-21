/**
 * Jev-Style Network Log Summarizer
 * Compresses raw network records into minimal typed endpoint contracts.
 * Saves massive context tokens for LLM sessions.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT_FILE = path.join(__dirname, '..', 'captures', 'network_records.jsonl');
const OUTPUT_FILE = path.join(__dirname, '..', 'captures', 'endpoint_summary.json');

if (!fs.existsSync(INPUT_FILE)) {
  console.log('No captures found yet.');
  process.exit(0);
}

const endpoints = {};

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT_FILE),
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const item = JSON.parse(line);
    const parsedUrl = new URL(item.url);
    const routeKey = `${item.method} ${parsedUrl.pathname}`;

    if (!endpoints[routeKey]) {
      endpoints[routeKey] = {
        method: item.method,
        path: parsedUrl.pathname,
        queryParams: Array.from(parsedUrl.searchParams.keys()),
        statusCodes: new Set(),
        sampleRequest: null,
        sampleResponseShape: null,
      };
    }

    endpoints[routeKey].statusCodes.add(item.status);

    if (item.postData && !endpoints[routeKey].sampleRequest) {
      try {
        endpoints[routeKey].sampleRequest = JSON.parse(item.postData);
      } catch {
        endpoints[routeKey].sampleRequest = item.postData;
      }
    }

    if (item.response && !endpoints[routeKey].sampleResponseShape) {
      endpoints[routeKey].sampleResponseShape = extractShape(item.response);
    }
  } catch {}
});

function extractShape(val) {
  if (val === null) return 'null';
  if (Array.isArray(val)) {
    return [val.length > 0 ? extractShape(val[0]) : 'any'];
  }
  if (typeof val === 'object') {
    const obj = {};
    for (const k of Object.keys(val)) {
      obj[k] = extractShape(val[k]);
    }
    return obj;
  }
  return typeof val;
}

rl.on('close', () => {
  const result = Object.values(endpoints).map((ep) => ({
    ...ep,
    statusCodes: Array.from(ep.statusCodes),
  }));

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  console.log(`Summarized ${result.length} endpoints to captures/endpoint_summary.json`);
});
