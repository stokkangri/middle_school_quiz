#!/usr/bin/env node
/**
 * Java → Blocks CLI runner (used by j2b.py and callable directly).
 *
 * Usage:
 *   node j2b_cli.js <file.java> [--config test_config.xml] [--blk out.blk] [--json]
 *   node j2b_cli.js --stdin [--config test_config.xml] [--name OpMode] [--blk out.blk] [--json]
 *
 * Robot config XML is the source of truth for hardware device names.
 * Exit 0 = no issues, 1 = issues, 2 = tool error.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = __dirname;
const code =
  fs.readFileSync(path.join(root, "parser.js"), "utf8") +
  "\n" +
  fs.readFileSync(path.join(root, "convert.js"), "utf8") +
  "\n" +
  fs.readFileSync(path.join(root, "config_xml.js"), "utf8") +
  "\nthis.Java2BlocksParser = Java2BlocksParser;\n" +
  "this.Java2BlocksConvert = Java2BlocksConvert;\n" +
  "this.Java2BlocksConfig = Java2BlocksConfig;\n";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);

function parseArgs(argv) {
  const args = {
    file: null,
    stdin: false,
    name: "ConvertedOpMode",
    blk: null,
    config: null,
    json: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdin") args.stdin = true;
    else if (a === "--json") args.json = true;
    else if (a === "--blk") args.blk = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--config") args.config = argv[++i];
    else if (a.startsWith("-")) {
      console.error("Unknown flag:", a);
      process.exit(2);
    } else args.file = a;
  }
  return args;
}

function findDefaultConfig(fromFile) {
  let dir = fromFile ? path.dirname(path.resolve(fromFile)) : process.cwd();
  for (let i = 0; i < 8; i++) {
    const cand = path.join(dir, "test_config.xml");
    if (fs.existsSync(cand)) return cand;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function countUnsupported(ir) {
  let n = 0;
  function walk(nodes) {
    (nodes || []).forEach((node) => {
      if (!node) return;
      if (node.type === "unsupported") n++;
      if (node.body) walk(node.body);
      if (node.then) walk(node.then);
      if (node.else) walk(node.else);
    });
  }
  walk(ir.init);
  walk(ir.run);
  return n;
}

function main() {
  const args = parseArgs(process.argv);
  let java;
  let sourceLabel = args.name;

  if (args.stdin) {
    java = fs.readFileSync(0, "utf8");
  } else if (args.file) {
    java = fs.readFileSync(args.file, "utf8");
    sourceLabel = path.basename(args.file);
  } else {
    console.error(
      "Usage: node j2b_cli.js <file.java> [--config test_config.xml] [--blk out.blk] [--json]"
    );
    process.exit(2);
  }

  let configPath = args.config || findDefaultConfig(args.file);
  let config = null;
  if (configPath) {
    if (!fs.existsSync(configPath)) {
      console.error("error: config not found:", configPath);
      process.exit(2);
    }
    const xml = fs.readFileSync(configPath, "utf8");
    config = ctx.Java2BlocksConfig.parseRobotXml(xml, path.basename(configPath));
  }

  const result = ctx.Java2BlocksParser.parse(java);
  const ir = result.ir || {};
  const issues = result.issues || [];

  if (config) {
    const cfgIssues = ctx.Java2BlocksConfig.validateHardware(ir.hardware || [], config);
    cfgIssues.forEach((i) => issues.push(i));
  } else {
    issues.push({
      line: 0,
      code: "",
      message: "No robot config XML loaded — pass --config test_config.xml (recommended).",
      tip: "The top-level test_config.xml lists the real device names Blocks will look up.",
    });
  }

  const unsupported = countUnsupported(ir);
  let blkXml = null;
  try {
    blkXml = ctx.Java2BlocksConvert.toBlkXml(ir, { config });
  } catch (e) {
    issues.push({
      line: 0,
      code: "",
      message: "BLK generation failed: " + e.message,
      tip: "Fix parse issues first.",
    });
  }

  if (args.blk && blkXml) {
    fs.writeFileSync(args.blk, blkXml);
  }

  const ok = issues.length === 0;
  const report = {
    source: sourceLabel,
    ok,
    issueCount: issues.length,
    unsupportedNodes: unsupported,
    opModeName: ir.opModeName || null,
    flavor: ir.flavor || null,
    config: config
      ? { path: configPath, label: config.sourceLabel, devices: config.deviceNames }
      : null,
    issues: issues.map((i) => ({
      line: i.line,
      message: i.message,
      code: i.code || "",
      tip: i.tip || "",
    })),
    blkWritten: Boolean(args.blk && blkXml),
  };

  if (args.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  } else {
    const status = report.ok ? "OK" : "ISSUES";
    console.log(
      `[${status}] ${report.source}  (${report.issueCount} issue(s), ${unsupported} unsupported node(s))`
    );
    if (ir.opModeName) {
      console.log(`  OpMode: ${ir.opModeName} (${ir.flavor || "?"})`);
    }
    if (config) {
      console.log(
        `  Config: ${config.sourceLabel} — ${config.deviceNames.join(", ")}`
      );
    } else {
      console.log("  Config: (none)");
    }
    if (args.blk) {
      console.log(`  .blk → ${args.blk}${report.blkWritten ? "" : " (not written)"}`);
    }
    issues.forEach((i, idx) => {
      console.log("");
      console.log(`--- ${idx + 1}. line ${i.line} ---`);
      console.log(i.message);
      if (i.code) console.log(i.code);
      if (i.tip) console.log("To stay in Blocks: " + i.tip);
    });
    if (!report.ok) {
      console.log("");
      console.log(`${report.issueCount} edit(s) may not round-trip.`);
    }
  }

  process.exit(ok ? 0 : 1);
}

main();
