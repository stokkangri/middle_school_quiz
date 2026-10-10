/* Limited FTC OnBot Java → IR parser */

const Java2BlocksParser = (() => {
  const SUGGESTIONS = {
    vision:
      "Vision / AprilTag / TensorFlow are not in this subset. Keep vision in Java (or a myBlock) and call a simple boolean/result from Blocks.",
    thread:
      "No threads or ExecutorService. Use a single LinearOpMode loop with sleep(), or move background work into a myBlock.",
    customClass:
      "Custom classes / inheritance (beyond LinearOpMode) do not map to Blocks. Inline the logic into runOpMode() or expose helpers as @ExportToBlocks myBlocks.",
    lambda:
      "Lambdas and streams are unsupported. Rewrite as a plain for/while loop.",
    switchCase:
      "switch is unsupported. Rewrite as if / else if / else.",
    tryCatch:
      "try/catch is unsupported in Blocks. Remove it for teaching OpModes, or keep error-prone code in Java myBlocks.",
    array:
      "Arrays / lists of motors are unsupported. Use named variables: leftFront, rightFront, …",
    roadrunner:
      "Road Runner / complex path libs stay in Java. Drive with setPower + encoders in this subset, or wrap followTrajectory as a myBlock.",
    enum:
      "Most enums are unsupported. Use string/number equivalents or Direction.FORWARD / REVERSE only.",
    method:
      "This method call is not in the supported API list. Inline the body, or create a myBlock with @ExportToBlocks.",
    ternary:
      "Ternary ?: is unsupported. Use if / else and assign a variable.",
    synchronized:
      "synchronized / locks are unsupported. Keep code single-threaded in runOpMode().",
    newObject:
      "new SomeClass(...) is mostly unsupported (except simple ElapsedTime). Prefer hardwareMap.get and primitives.",
    annotation:
      "Only @TeleOp / @Autonomous (name=) are read. Other annotations are ignored.",
    library:
      "This file is a myBlocks library (BlocksOpModeCompanion). Deploy it as Java on the RC — do not convert it to .blk. Convert Sample Auto/TeleOp OpModes that call it instead.",
  };

  /** Java-only glue: Blocks fills OpMode context automatically for myBlocks. */
  const IGNORE_CALL_RE =
    /^(?:\w+\.)?(?:bindFromLinearOpMode|bindFromOpMode)\s*\(/;

  /** Stock types / utilities — not myBlock classes. */
  const NOT_MYBLOCK_CLASS = new Set([
    "Math",
    "Range",
    "System",
    "Arrays",
    "Collections",
    "DcMotor",
    "DcMotorEx",
    "Servo",
    "CRServo",
    "ElapsedTime",
    "Telemetry",
    "HardwareMap",
    "LinearOpMode",
    "OpMode",
  ]);

  function isMyBlockClass(name) {
    if (!name || NOT_MYBLOCK_CLASS.has(name)) return false;
    // Explicit teaching libraries: *MyBlocks (e.g. RobotMyBlocks)
    return /MyBlocks$/i.test(name);
  }

  function splitCallArgs(argsStr) {
    const s = String(argsStr || "").trim();
    if (!s) return [];
    const args = [];
    let depth = 0;
    let cur = "";
    let inString = false;
    let stringChar = "";
    let escaped = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inString) {
        cur += ch;
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === stringChar) inString = false;
        continue;
      }
      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
        cur += ch;
        continue;
      }
      if (ch === "(" || ch === "[" || ch === "{") {
        depth++;
        cur += ch;
        continue;
      }
      if (ch === ")" || ch === "]" || ch === "}") {
        depth--;
        cur += ch;
        continue;
      }
      if (ch === "," && depth === 0) {
        if (cur.trim()) args.push(cur.trim());
        cur = "";
        continue;
      }
      cur += ch;
    }
    if (cur.trim()) args.push(cur.trim());
    return args;
  }

  function makeInfo(line, code, message, tipKey) {
    const iss = makeIssue(line, code, message, tipKey);
    iss.level = "info";
    return iss;
  }

  function makeIssue(line, code, message, tipKey, suggestion) {
    return {
      line,
      code: code.trim().slice(0, 120),
      message,
      tip: suggestion || SUGGESTIONS[tipKey] || "Simplify this statement into supported setPower / sleep / while / if patterns.",
    };
  }

  function escapeCommentToken(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "");
  }

  function commentToken(text) {
    const t = String(text).trim();
    if (!t) return "";
    return ` __j2b_comment__("${escapeCommentToken(t)}"); `;
  }

  function stripComments(src) {
    // Keep line numbers stable. Turn // and /* */ into __j2b_comment__("...") statements
    // so teaching comments survive into Blocks preview / .blk.
    const lines = [];
    let cur = "";
    let i = 0;
    const pushLine = () => {
      lines.push(cur);
      cur = "";
    };

    while (i < src.length) {
      if (src.startsWith("//", i)) {
        i += 2;
        let text = "";
        while (i < src.length && src[i] !== "\n") {
          text += src[i];
          i++;
        }
        cur += commentToken(text);
      } else if (src.startsWith("/*", i)) {
        i += 2;
        let text = "";
        while (i < src.length && !src.startsWith("*/", i)) {
          if (src[i] === "\n") {
            cur += commentToken(text);
            pushLine();
            text = "";
            i++;
          } else {
            text += src[i];
            i++;
          }
        }
        cur += commentToken(text);
        if (src.startsWith("*/", i)) i += 2;
      } else if (src[i] === "\n") {
        pushLine();
        i++;
      } else {
        cur += src[i];
        i++;
      }
    }
    lines.push(cur);
    return lines;
  }

  function lineNoOfIndex(lines, absIndex) {
    // unused helper reserved
    return 1;
  }

  function parse(source) {
    const rawLines = source.replace(/\r\n/g, "\n").split("\n");
    const blanked = stripComments(source.replace(/\r\n/g, "\n"));
    const issues = [];
    const ir = {
      opModeName: "ConvertedOpMode",
      flavor: "TeleOp",
      hardware: [], // { name, type, varName }
      init: [],
      run: [],
    };

    // Detect myBlocks library early — skip vision file-scans inside the library body
    let libraryEarly = null;
    blanked.forEach((ln) => {
      const cls = ln.match(/class\s+(\w+)\s+extends\s+(\w+)/);
      if (cls && cls[2] === "BlocksOpModeCompanion") {
        libraryEarly = cls[1];
      }
    });
    if (libraryEarly) {
      ir.libraryClass = libraryEarly;
      ir.library = true;
      ir.opModeName = libraryEarly;
      ir.flavor = "myBlocksLibrary";
      issues.push(
        makeInfo(
          1,
          libraryEarly,
          `Skipping convert: ${libraryEarly} is a myBlocks library (extends BlocksOpModeCompanion).`,
          "library"
        )
      );
      ir.init = [];
      ir.run = [
        {
          type: "comment",
          text: `Deploy ${libraryEarly} as Java on the RC (@ExportToBlocks). Convert Sample*Kids OpModes instead.`,
        },
      ];
      return { ir, issues, ok: true, library: true };
    }

    // Whole-file unsupported scans (real APIs only — not method names like hasAprilTag)
    const fileChecks = [
      [
        /\bVisionPortal\b|\bAprilTagProcessor\b|\bAprilTagDetection\b|\bAprilTagSingleDetection\b|\bPredominantColorProcessor\b|\bColorBlobLocatorProcessor\b|\bTfod\b|\bEasyOpenCV\b|\borg\.firstinspires\.ftc\.vision\b/,
        "vision",
      ],
      [/\bThread\b|\bExecutorService\b|\.start\(\)/, "thread"],
      [/RoadRunner|TrajectorySequence|SampleMecanumDrive/, "roadrunner"],
      [/\bswitch\s*\(/, "switchCase"],
      [/\btry\s*\{/, "tryCatch"],
      [/->/, "lambda"],
      [/\bstream\s*\(/i, "lambda"],
      [/\bsynchronized\s*\(/, "synchronized"],
    ];
    fileChecks.forEach(([re, key]) => {
      blanked.forEach((ln, idx) => {
        const codeOnly = ln.replace(/__j2b_comment__\s*\(\s*"(?:\\.|[^"\\])*"\s*\)\s*;?/g, " ");
        if (!codeOnly.trim()) return;
        if (re.test(codeOnly)) {
          issues.push(makeIssue(idx + 1, rawLines[idx] || ln, `Unsupported construct matched: ${key}`, key));
        }
      });
    });

    // Class / annotations
    let namedFromAnnotation = false;
    blanked.forEach((ln, idx) => {
      const tele = ln.match(/@TeleOp\s*\(\s*name\s*=\s*"([^"]+)"/);
      const auto = ln.match(/@Autonomous\s*\(\s*name\s*=\s*"([^"]+)"/);
      if (tele) {
        ir.flavor = "TeleOp";
        ir.opModeName = tele[1];
        namedFromAnnotation = true;
      }
      if (auto) {
        ir.flavor = "Autonomous";
        ir.opModeName = auto[1];
        namedFromAnnotation = true;
      }
      // Bare @TeleOp / @Autonomous without name=
      if (/@TeleOp\b/.test(ln) && !tele) ir.flavor = "TeleOp";
      if (/@Autonomous\b/.test(ln) && !auto) ir.flavor = "Autonomous";

      const cls = ln.match(/class\s+(\w+)\s+extends\s+(\w+)/);
      if (cls) {
        if (cls[2] !== "LinearOpMode") {
          issues.push(
            makeIssue(
              idx + 1,
              rawLines[idx],
              `Only LinearOpMode is supported (found extends ${cls[2]})`,
              "customClass"
            )
          );
        } else if (!namedFromAnnotation) {
          ir.opModeName = cls[1];
        }
      }
      if (/class\s+\w+\s+extends\s+OpMode\b/.test(ln) && !/LinearOpMode/.test(ln)) {
        issues.push(
          makeIssue(
            idx + 1,
            rawLines[idx],
            "Iterative OpMode is unsupported — use LinearOpMode with runOpMode().",
            "customClass",
            "Change to: public class MyOp extends LinearOpMode { public void runOpMode() { ... } }"
          )
        );
      }
    });

    // Extract runOpMode body
    const joined = blanked.join("\n");
    const runMatch = joined.match(/void\s+runOpMode\s*\(\s*\)\s*\{/);
    if (!runMatch) {
      issues.push(
        makeIssue(
          1,
          "",
          "No runOpMode() method found.",
          "customClass",
          "Wrap your logic in: @Override public void runOpMode() { waitForStart(); while (opModeIsActive()) { ... } }"
        )
      );
      return { ir, issues, ok: false };
    }

    const startIdx = runMatch.index + runMatch[0].length;
    const body = extractBraceBlock(joined, startIdx - 1);
    if (!body) {
      issues.push(makeIssue(1, "", "Could not parse runOpMode() body braces.", "method"));
      return { ir, issues, ok: false };
    }

    // Map absolute char offset to line
    const absStart = startIdx;
    const statements = splitStatements(body.text);
    let cursor = absStart;

    const beforeWait = [];
    const afterWait = [];
    let seenWait = false;

    statements.forEach((stmt) => {
      const trimmed = stmt.text.trim();
      if (!trimmed) return;
      const line = offsetToLine(blanked, absStart + stmt.relStart);
      const node = parseStatement(trimmed, line, rawLines, issues);
      if (!node) return;
      if (node.type === "waitForStart") {
        seenWait = true;
        return;
      }
      if (!seenWait) beforeWait.push(node);
      else afterWait.push(node);
    });

    ir.init = beforeWait;
    ir.run = afterWait.length
      ? afterWait
      : [
          {
            type: "comment",
            text: "No statements after waitForStart() — add a while (opModeIsActive()) loop.",
          },
        ];

    // hardware from init+run declarations
    const all = [...ir.init, ...ir.run];
    collectHardware(all, ir.hardware);

    const blocking = issues.filter((i) => i.severity);
    return {
      ir,
      issues,
      ok: issues.length === 0 || afterWait.length + beforeWait.length > 0,
    };
  }

  function offsetToLine(lines, offset) {
    let n = 0;
    for (let i = 0; i < lines.length; i++) {
      n += lines[i].length + 1;
      if (n > offset) return i + 1;
    }
    return lines.length;
  }

  function extractBraceBlock(src, openBraceIndex) {
    // openBraceIndex points at '{'
    let depth = 0;
    for (let i = openBraceIndex; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") {
        depth--;
        if (depth === 0) {
          return { text: src.slice(openBraceIndex + 1, i), end: i };
        }
      }
    }
    return null;
  }

  function splitStatements(body) {
    // Split on semicolons / braces at depth 0 into chunks with relative offsets.
    // Respect strings so // comments turned into __j2b_comment__("a; b"); stay whole.
    const out = [];
    let depth = 0;
    let start = 0;
    let i = 0;
    let inString = false;
    let stringChar = "";
    let escaped = false;

    while (i < body.length) {
      const ch = body[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === stringChar) {
          inString = false;
        }
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
        i++;
        continue;
      }

      if (ch === "{") {
        depth++;
        i++;
        continue;
      }
      if (ch === "}") {
        depth--;
        i++;
        if (depth === 0) {
          out.push({ text: body.slice(start, i), relStart: start });
          start = i;
        }
        continue;
      }
      if (ch === ";" && depth === 0) {
        out.push({ text: body.slice(start, i + 1), relStart: start });
        start = i + 1;
        i++;
        continue;
      }
      i++;
    }
    if (body.slice(start).trim()) {
      out.push({ text: body.slice(start), relStart: start });
    }

    return mergeControlStructures(out, body);
  }

  function mergeControlStructures(chunks, body) {
    // Attach else / else if tails that were split off after an if's closing brace.
    const filtered = chunks.filter((c) => c.text.trim().length);
    const out = [];
    for (let i = 0; i < filtered.length; i++) {
      let text = filtered[i].text;
      const relStart = filtered[i].relStart;
      while (i + 1 < filtered.length) {
        const next = filtered[i + 1].text.trim();
        if (!/^else\b/.test(next)) break;
        text += filtered[i + 1].text;
        i++;
      }
      out.push({ text, relStart });
    }
    return out;
  }

  function matchKeywordParenBrace(t, keyword) {
    // Parse: keyword (cond) { body }   with nested () and {}
    const re = new RegExp("^" + keyword + "\\s*\\(");
    const m = t.match(re);
    if (!m) return null;
    let i = m[0].length; // at first char inside (
    let depth = 1;
    const condStart = i;
    while (i < t.length && depth > 0) {
      const ch = t[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      i++;
    }
    if (depth !== 0) return null;
    const cond = t.slice(condStart, i - 1).trim();
    // skip whitespace
    while (i < t.length && /\s/.test(t[i])) i++;
    if (t[i] !== "{") return null;
    const openBrace = i;
    depth = 0;
    for (; i < t.length; i++) {
      if (t[i] === "{") depth++;
      else if (t[i] === "}") {
        depth--;
        if (depth === 0) {
          const body = t.slice(openBrace + 1, i);
          let rest = t.slice(i + 1).trim();
          if (rest.endsWith(";")) rest = rest.slice(0, -1).trim();
          return { cond, body, rest };
        }
      }
    }
    return null;
  }

  function parseStatement(text, line, rawLines, issues) {
    const t = text.trim();
    if (!t || t === ";") return null;

    // Block comments leftovers
    if (t.startsWith("else")) {
      // else attached poorly — flag
      issues.push(makeIssue(line, t, "Standalone else — keep if/else together.", "method"));
      return null;
    }

    // Preserved teaching comment (from // or /* */)
    const commentStmt = t.match(/^__j2b_comment__\s*\(\s*"((?:\\.|[^"\\])*)"\s*\)\s*;?$/);
    if (commentStmt) {
      let textC = commentStmt[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      return { type: "comment", text: textC };
    }

    // waitForStart
    if (/waitForStart\s*\(\s*\)\s*;?/.test(t) && !t.includes("while")) {
      return { type: "waitForStart" };
    }

    // Bare return; — common after if (!opModeIsActive()); not a Blocks concept
    if (/^return\s*;$/.test(t)) {
      return null;
    }

    // Java-only myBlocks glue (ignore — no warning)
    if (IGNORE_CALL_RE.test(t)) {
      return null;
    }

    // Static myBlock call: RobotMyBlocks.driveForward(12.0, 0.4);
    const myBlockStmt = t.match(/^([A-Za-z_]\w*)\.([A-Za-z_]\w*)\s*\(([\s\S]*)\)\s*;$/);
    if (myBlockStmt && isMyBlockClass(myBlockStmt[1])) {
      const className = myBlockStmt[1];
      const method = myBlockStmt[2];
      if (method === "bindFromLinearOpMode" || method === "bindFromOpMode") {
        return null;
      }
      const argStrs = splitCallArgs(myBlockStmt[3]);
      return {
        type: "myBlockCall",
        className,
        method,
        args: argStrs.map((a) => parseExpr(a, line, issues)),
      };
    }

    // while (cond) { body }  — balanced parens (opModeIsActive() && ... is OK)
    const whileParts = matchKeywordParenBrace(t, "while");
    if (whileParts && !whileParts.rest) {
      const children = splitStatements(whileParts.body)
        .map((s) => parseStatement(s.text.trim(), line, rawLines, issues))
        .filter(Boolean);
      return { type: "while", cond: parseExpr(whileParts.cond, line, issues), body: children };
    }

    // if (cond) { then } else { ... }
    const ifParts = matchKeywordParenBrace(t, "if");
    if (ifParts) {
      const thenBody = splitStatements(ifParts.body)
        .map((s) => parseStatement(s.text.trim(), line, rawLines, issues))
        .filter(Boolean);
      let elseBody = [];
      const rest = ifParts.rest;
      if (rest.startsWith("else")) {
        const elseRest = rest.replace(/^else\s*/, "");
        if (elseRest.startsWith("{")) {
          let depth = 0;
          let i = 0;
          for (; i < elseRest.length; i++) {
            if (elseRest[i] === "{") depth++;
            else if (elseRest[i] === "}") {
              depth--;
              if (depth === 0) {
                elseBody = splitStatements(elseRest.slice(1, i))
                  .map((s) => parseStatement(s.text.trim(), line, rawLines, issues))
                  .filter(Boolean);
                break;
              }
            }
          }
        } else if (/^if\b/.test(elseRest)) {
          // else if → nested if inside else (Blocks-friendly)
          const nested = parseStatement(elseRest, line, rawLines, issues);
          if (nested) elseBody = [nested];
        }
      }
      return {
        type: "if",
        cond: parseExpr(ifParts.cond, line, issues),
        then: thenBody,
        else: elseBody,
      };
    }

    // for (int i = 0; i < n; i++)
    const forMatch = t.match(
      /^for\s*\(\s*(?:int|double)?\s*(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]+)\)\s*\{([\s\S]*)\}\s*;?$/
    );
    if (forMatch) {
      const children = splitStatements(forMatch[5])
        .map((s) => parseStatement(s.text.trim(), line, rawLines, issues))
        .filter(Boolean);
      return {
        type: "for",
        varName: forMatch[1],
        init: parseExpr(forMatch[2].trim(), line, issues),
        cond: parseExpr(forMatch[3].trim(), line, issues),
        step: forMatch[4].trim(),
        body: children,
      };
    }

    // Variable declaration with hardwareMap
    const hw = t.match(
      /^(DcMotor|DcMotorEx|Servo|CRServo|IMU|BNO055IMU)\s+(\w+)\s*=\s*hardwareMap\.get\s*\(\s*([\w.]+)\.class\s*,\s*"([^"]+)"\s*\)\s*;$/
    );
    if (hw) {
      return {
        type: "hardwareGet",
        javaType: hw[1],
        varName: hw[2],
        deviceName: hw[4],
      };
    }

    // Assignment form: left = hardwareMap.get(DcMotor.class, "left");
    const hwAssign = t.match(
      /^(\w+)\s*=\s*hardwareMap\.get\s*\(\s*([\w.]+)\.class\s*,\s*"([^"]+)"\s*\)\s*;$/
    );
    if (hwAssign) {
      const javaType = hwAssign[2].includes(".")
        ? hwAssign[2].split(".").pop()
        : hwAssign[2];
      return {
        type: "hardwareGet",
        javaType,
        varName: hwAssign[1],
        deviceName: hwAssign[3],
      };
    }

    // Field-only decl inside method (rare) or leftover: DcMotor left;
    if (/^(DcMotor|DcMotorEx|Servo|CRServo|IMU|BNO055IMU|ElapsedTime)\s+\w+\s*;$/.test(t)) {
      return null;
    }

    // ElapsedTime
    if (/^ElapsedTime\s+(\w+)\s*=\s*new\s+ElapsedTime\s*\(\s*\)\s*;$/.test(t)) {
      const m = t.match(/^ElapsedTime\s+(\w+)/);
      return { type: "newElapsed", varName: m[1] };
    }
    if (/^(\w+)\s*=\s*new\s+ElapsedTime\s*\(\s*\)\s*;$/.test(t)) {
      const m = t.match(/^(\w+)\s*=/);
      return { type: "newElapsed", varName: m[1] };
    }

    // typed declaration (String → Blocks text variable)
    const decl = t.match(/^(int|double|boolean|float|long|String)\s+(\w+)\s*(=\s*([^;]+))?\s*;$/);
    if (decl) {
      return {
        type: "declare",
        javaType: decl[1],
        varName: decl[2],
        value: decl[4] ? parseExpr(decl[4].trim(), line, issues) : null,
      };
    }

    // motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE|FLOAT)
    const setZpb = t.match(
      /^(\w+)\.setZeroPowerBehavior\s*\(\s*DcMotor\.ZeroPowerBehavior\.(\w+)\s*\)\s*;$/
    );
    if (setZpb) {
      return { type: "setZeroPowerBehavior", motor: setZpb[1], behavior: setZpb[2] };
    }

    // assignment
    const assign = t.match(/^(\w+)\s*=\s*([^;]+);$/);
    if (assign && !/^(if|while|for)$/.test(assign[1])) {
      return {
        type: "assign",
        varName: assign[1],
        value: parseExpr(assign[2].trim(), line, issues),
      };
    }

    // motor.setPower
    const setPower = t.match(/^(\w+)\.setPower\s*\(\s*([^)]+)\)\s*;$/);
    if (setPower) {
      return {
        type: "setPower",
        motor: setPower[1],
        value: parseExpr(setPower[2].trim(), line, issues),
      };
    }

    const setDir = t.match(
      /^(\w+)\.setDirection\s*\(\s*(DcMotor\.Direction|Servo\.Direction|CRServo\.Direction)\.(\w+)\s*\)\s*;$/
    );
    if (setDir) {
      return { type: "setDirection", device: setDir[1], direction: setDir[3] };
    }

    // Regular servo position (0..1) — not used for CRServo (those use setPower)
    const setPos = t.match(/^(\w+)\.setPosition\s*\(\s*([^)]+)\)\s*;$/);
    if (setPos) {
      return {
        type: "setPosition",
        servo: setPos[1],
        value: parseExpr(setPos[2].trim(), line, issues),
      };
    }

    if (/^sleep\s*\(\s*([^)]+)\s*\)\s*;$/.test(t)) {
      const m = t.match(/^sleep\s*\(\s*([^)]+)\s*\)\s*;$/);
      return { type: "sleep", ms: parseExpr(m[1].trim(), line, issues) };
    }

    if (/^telemetry\.update\s*\(\s*\)\s*;$/.test(t)) {
      return { type: "telemetryUpdate" };
    }

    const telem = t.match(/^telemetry\.addData\s*\(\s*"([^"]*)"\s*,\s*(.+)\)\s*;$/);
    if (telem) {
      return {
        type: "telemetryAdd",
        key: telem[1],
        value: parseExpr(telem[2].trim(), line, issues),
      };
    }

    // idle()
    if (/^idle\s*\(\s*\)\s*;$/.test(t)) {
      return { type: "idle" };
    }

    // Unsupported statement
    if (/^\w+\s*\(.*\)\s*;$/.test(t) || /\.\w+\s*\(/.test(t)) {
      let tipKey = "method";
      if (/new\s+\w+/.test(t)) tipKey = "newObject";
      if (/\?/.test(t)) tipKey = "ternary";
      if (/\[/.test(t)) tipKey = "array";
      issues.push(makeIssue(line, t, "Statement not in the convertible subset.", tipKey));
      return { type: "unsupported", text: t, line };
    }

    if (t.includes("?")) {
      issues.push(makeIssue(line, t, "Ternary expressions are unsupported.", "ternary"));
      return { type: "unsupported", text: t, line };
    }

    issues.push(makeIssue(line, t, "Could not parse this statement.", "method"));
    return { type: "unsupported", text: t, line };
  }

  function parseExpr(expr, line, issues) {
    const e = expr.trim();
    if (!e) return { type: "literal", value: "0" };

    if (/^[0-9]+(\.[0-9]+)?$/.test(e)) return { type: "literal", value: e };
    if (e === "true" || e === "false") return { type: "literal", value: e };
    if (/^"[^"]*"$/.test(e)) return { type: "string", value: e.slice(1, -1) };

    if (/^opModeIsActive\s*\(\s*\)$/.test(e)) return { type: "opModeIsActive" };
    if (/^isStopRequested\s*\(\s*\)$/.test(e)) return { type: "isStopRequested" };

    const clip = e.match(/^Range\.clip\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
    if (clip) {
      return {
        type: "clip",
        value: parseExpr(clip[1].trim(), line, issues),
        min: parseExpr(clip[2].trim(), line, issues),
        max: parseExpr(clip[3].trim(), line, issues),
      };
    }

    const abs = e.match(/^Math\.abs\s*\(\s*(.+)\s*\)$/);
    if (abs) {
      return { type: "abs", expr: parseExpr(abs[1].trim(), line, issues) };
    }

    const gamepad = e.match(/^(gamepad[12])\.(\w+)$/);
    if (gamepad) return { type: "gamepad", pad: gamepad[1], field: gamepad[2] };

    // method call on device OR returning myBlock (isRed, firstTagId, …)
    const call = e.match(/^(\w+)\.(\w+)\s*\(\s*([^)]*)\s*\)$/);
    if (call) {
      if (isMyBlockClass(call[1])) {
        return {
          type: "myBlockExpr",
          className: call[1],
          method: call[2],
          args: call[3]
            ? splitCallArgs(call[3]).map((a) => parseExpr(a.trim(), line, issues))
            : [],
        };
      }
      const known = ["getPower", "getCurrentPosition", "getPosition", "seconds", "milliseconds"];
      if (!known.includes(call[2])) {
        issues.push(
          makeIssue(
            line,
            e,
            `Expression call ${call[1]}.${call[2]}() is not in the subset.`,
            "method",
            `Supported reads include getPower(), getCurrentPosition(), ElapsedTime.seconds(). Or compute in a local variable earlier.`
          )
        );
      }
      return {
        type: "call",
        object: call[1],
        method: call[2],
        args: call[3]
          ? splitCallArgs(call[3]).map((a) => parseExpr(a.trim(), line, issues))
          : [],
      };
    }

    if (/^[a-zA-Z_]\w*$/.test(e)) return { type: "var", name: e };

    // Binary ops — split carefully on lowest precedence
    const bin = splitBinary(e);
    if (bin) {
      return {
        type: "binary",
        op: bin.op,
        left: parseExpr(bin.left, line, issues),
        right: parseExpr(bin.right, line, issues),
      };
    }

    if (e.startsWith("!") || e.startsWith("-") || e.startsWith("+")) {
      return {
        type: "unary",
        op: e[0],
        expr: parseExpr(e.slice(1).trim(), line, issues),
      };
    }

    // Parentheses
    if (e.startsWith("(") && e.endsWith(")")) {
      return parseExpr(e.slice(1, -1), line, issues);
    }

    if (e.includes("?") && e.includes(":")) {
      issues.push(makeIssue(line, e, "Ternary in expression.", "ternary"));
    } else {
      issues.push(
        makeIssue(
          line,
          e,
          "Complex expression — simplify into temporary variables.",
          "method",
          "Split into: double turn = gamepad1.right_stick_x; double drive = -gamepad1.left_stick_y;"
        )
      );
    }
    return { type: "raw", value: e };
  }

  function splitBinary(e) {
    const ops = ["||", "&&", "==", "!=", "<=", ">=", "<", ">", "+", "-", "*", "/", "%"];
    for (const op of ops) {
      let depth = 0;
      for (let i = e.length - 1; i >= 1; i--) {
        const ch = e[i];
        if (ch === ")") depth++;
        else if (ch === "(") depth--;
        if (depth !== 0) continue;
        if (e.slice(i - op.length + 1, i + 1) === op) {
          // avoid unary minus
          if (op === "-" || op === "+") {
            const left = e.slice(0, i - op.length + 1).trim();
            if (!left) continue;
          }
          return {
            op,
            left: e.slice(0, i - op.length + 1).trim(),
            right: e.slice(i + 1).trim(),
          };
        }
      }
    }
    return null;
  }

  function collectHardware(nodes, bucket) {
    nodes.forEach((n) => {
      if (!n) return;
      if (n.type === "hardwareGet") {
        bucket.push({
          varName: n.varName,
          javaType: n.javaType,
          deviceName: n.deviceName,
        });
      }
      if (n.body) collectHardware(n.body, bucket);
      if (n.then) collectHardware(n.then, bucket);
      if (n.else) collectHardware(n.else, bucket);
    });
  }

  return { parse, SUGGESTIONS, isMyBlockClass, splitCallArgs };
})();
