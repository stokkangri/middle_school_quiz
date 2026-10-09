/* IR → visual Blocks HTML + Blockly-ish .blk XML */

const Java2BlocksConvert = (() => {
  /** Known @ExportToBlocks signatures for RobotMyBlocks (lookup string must match RC reflection). */
  const MYBLOCK_META = {
    initRobot: {
      heading: "Robot",
      comment: "Init once — maps test_config devices and sets PIDF",
      tooltip: "Call at the start of Auto or TeleOp",
      labels: [],
      types: [],
    },
    driveForward: {
      heading: "Drive",
      comment: "Drive forward (+) or back (−) using encoders + PIDF",
      tooltip: "",
      labels: ["Inches", "Max power 0..1"],
      types: ["double", "double"],
    },
    strafeRight: {
      heading: "Drive",
      comment: "Strafe right (+) or left (−) — mecanum",
      tooltip: "",
      labels: ["Inches", "Max power 0..1"],
      types: ["double", "double"],
    },
    turnDegrees: {
      heading: "Drive",
      comment: "Spin right (+) or left (−) degrees (encoder estimate — tune)",
      tooltip: "",
      labels: ["Degrees", "Max power 0..1"],
      types: ["double", "double"],
    },
    driveArcade: {
      heading: "Drive",
      comment: "TeleOp mecanum: forward, strafe, turn in −1..1",
      tooltip: "",
      labels: ["Forward", "Strafe", "Turn"],
      types: ["double", "double", "double"],
    },
    stopDrive: {
      heading: "Drive",
      comment: "Stop all drive motors",
      tooltip: "",
      labels: [],
      types: [],
    },
    liftMoveInches: {
      heading: "Lift",
      comment: "Move lift by encoder inches (approx) with PIDF",
      tooltip: "",
      labels: ["Inches", "Max power 0..1"],
      types: ["double", "double"],
    },
    liftPower: {
      heading: "Lift",
      comment: "TeleOp lift power −1..1 (no PID hold)",
      tooltip: "",
      labels: ["Power"],
      types: ["double"],
    },
    liftStop: {
      heading: "Lift",
      comment: "Stop lift motor",
      tooltip: "",
      labels: [],
      types: [],
    },
    leftServo: {
      heading: "Servo",
      comment: "left_servo position 0..1",
      tooltip: "",
      labels: ["Position"],
      types: ["double"],
    },
    rightServo: {
      heading: "Servo",
      comment: "right_servo position 0..1",
      tooltip: "",
      labels: ["Position"],
      types: ["double"],
    },
    servosOpen: {
      heading: "Servo",
      comment: "Open-ish poses (0.8)",
      tooltip: "",
      labels: [],
      types: [],
    },
    servosClose: {
      heading: "Servo",
      comment: "Closed-ish poses (0.2)",
      tooltip: "",
      labels: [],
      types: [],
    },
  };

  function myBlockLookupString(className, method, types, returnType) {
    const pkg = "org.firstinspires.ftc.teamcode." + className;
    const params = (types || []).join(",");
    return `${pkg} ${method}(${params}) ${returnType || "void"}`;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function exprToText(e) {
    if (!e) return "?";
    switch (e.type) {
      case "literal":
        return e.value;
      case "string":
        return `"${e.value}"`;
      case "var":
        return e.name;
      case "opModeIsActive":
        return "opModeIsActive()";
      case "isStopRequested":
        return "isStopRequested()";
      case "gamepad":
        return `${e.pad}.${e.field}`;
      case "call":
        return `${e.object}.${e.method}(${(e.args || []).map(exprToText).join(", ")})`;
      case "clip":
        return `clip(${exprToText(e.value)}, ${exprToText(e.min)}, ${exprToText(e.max)})`;
      case "abs":
        return `Math.abs(${exprToText(e.expr)})`;
      case "binary":
        return `(${exprToText(e.left)} ${e.op} ${exprToText(e.right)})`;
      case "unary":
        return `${e.op}${exprToText(e.expr)}`;
      case "raw":
        return e.value;
      default:
        return "?";
    }
  }

  function chip(text) {
    return `<span class="chip">${esc(text)}</span>`;
  }

  function renderNodes(nodes, depth = 0) {
    if (!nodes || !nodes.length) return "";
    return nodes.map((n) => renderNode(n, depth)).join("");
  }

  function renderNode(n, depth) {
    if (!n) return "";
    const pad = depth ? ` style="margin-left:${depth * 14}px"` : "";

    switch (n.type) {
      case "comment":
        return `<div class="blk comment"${pad}>// ${esc(n.text)}</div>`;
      case "unsupported":
        return `<div class="blk bad"${pad}>⚠ unsupported: ${esc(n.text)}</div>`;
      case "hardwareGet":
        return `<div class="blk set"${pad}>set ${chip(n.varName)} to hardwareMap.get(${esc(n.javaType)}, ${chip(
          `"${n.deviceName}"`
        )})</div>`;
      case "newElapsed":
        return `<div class="blk set"${pad}>set ${chip(n.varName)} to new ElapsedTime()</div>`;
      case "declare":
        return `<div class="blk set"${pad}>set ${chip(n.varName)} to ${
          n.value ? chip(exprToText(n.value)) : chip("0")
        }</div>`;
      case "assign":
        return `<div class="blk set"${pad}>set ${chip(n.varName)} to ${chip(exprToText(n.value))}</div>`;
      case "setPower":
        return `<div class="blk call"${pad}>call ${chip(n.motor + ".setPower")} ${chip(
          exprToText(n.value)
        )}</div>`;
      case "setPosition":
        return `<div class="blk call"${pad}>call ${chip(n.servo + ".setPosition")} ${chip(
          exprToText(n.value)
        )}</div>`;
      case "setDirection":
        return `<div class="blk call"${pad}>call ${chip(n.device + ".setDirection")} ${chip(
          n.direction
        )}</div>`;
      case "sleep":
        return `<div class="blk call"${pad}>call sleep ${chip(exprToText(n.ms))} ms</div>`;
      case "idle":
        return `<div class="blk call"${pad}>call idle</div>`;
      case "myBlockCall": {
        const args = (n.args || []).map((a) => chip(exprToText(a))).join(" ");
        return `<div class="blk call myblock"${pad}>myBlock ${chip(
          `${n.className}.${n.method}`
        )} ${args}</div>`;
      }
      case "telemetryAdd":
        return `<div class="blk call"${pad}>telemetry.addData ${chip(`"${n.key}"`)} ${chip(
          exprToText(n.value)
        )}</div>`;
      case "telemetryUpdate":
        return `<div class="blk call"${pad}>telemetry.update</div>`;
      case "while":
        return `<div class="blk loop"${pad}>repeat while ${chip(exprToText(n.cond))}
          <div class="nest">${renderNodes(n.body, 0)}</div>
        </div>`;
      case "if":
        return `<div class="blk logic"${pad}>if ${chip(exprToText(n.cond))}
          <div class="nest">${renderNodes(n.then, 0)}</div>
          ${
            n.else && n.else.length
              ? `else<div class="nest">${renderNodes(n.else, 0)}</div>`
              : ""
          }
        </div>`;
      case "for":
        return `<div class="blk loop"${pad}>for ${chip(n.varName)} from ${chip(
          exprToText(n.init)
        )} while ${chip(exprToText(n.cond))}
          <div class="nest">${renderNodes(n.body, 0)}</div>
        </div>`;
      default:
        return `<div class="blk comment"${pad}>[${esc(n.type)}]</div>`;
    }
  }

  function toPreviewHTML(ir) {
    const hw = (ir.hardware || [])
      .map(
        (h) =>
          `<div class="blk hw">device ${chip(h.deviceName)} → ${chip(h.varName)} (${esc(
            h.javaType
          )})</div>`
      )
      .join("");

    return `
      <div class="blk event">OpMode ${esc(ir.flavor)} · ${esc(ir.opModeName)}</div>
      ${hw}
      <div class="blk section">initialization</div>
      ${renderNodes(ir.init)}
      <div class="blk call wait">call waitForStart</div>
      <div class="blk section">run</div>
      ${renderNodes(ir.run)}
    `;
  }

  // Real FTC Blocks .blk export (types from SDK Blocks 11.x sample OpModes)
  let idCounter = 0;
  const varIds = Object.create(null);
  let deviceKind = Object.create(null); // deviceName|varName -> DcMotor | CRServo | Servo
  let stringVars = Object.create(null); // varName -> true (Blocks text telemetry)
  let varToDevice = Object.create(null); // Java var → config device name (e.g. motor → left_back)

  function nid() {
    idCounter += 1;
    // Blockly-ish ids (avoid XML-breaking characters)
    return `j2b_${idCounter}`;
  }

  function varId(name) {
    if (!varIds[name]) varIds[name] = `v_${nid()}`;
    return varIds[name];
  }

  /** Map local Java names (motor, left) to robot-config device names. */
  function resolveHw(name) {
    if (!name) return name;
    return varToDevice[name] || name;
  }

  function hwId(deviceName, kind) {
    const resolved = resolveHw(deviceName);
    const k = kind || deviceKind[resolved] || deviceKind[deviceName] || "DcMotor";
    if (k === "CRServo") return `${resolved}AsCRServo`;
    if (k === "Servo") return `${resolved}AsServo`;
    return `${resolved}AsDcMotor`;
  }

  function dataIdent(deviceName) {
    const resolved = resolveHw(deviceName);
    return `<data>{"IDENTIFIER":"${esc(resolved)}"}</data>`;
  }

  const GP_NUM = {
    left_stick_x: "LeftStickX",
    left_stick_y: "LeftStickY",
    right_stick_x: "RightStickX",
    right_stick_y: "RightStickY",
    left_trigger: "LeftTrigger",
    right_trigger: "RightTrigger",
  };
  const GP_BOOL = {
    a: "A",
    b: "B",
    x: "X",
    y: "Y",
    dpad_up: "DpadUp",
    dpad_down: "DpadDown",
    dpad_left: "DpadLeft",
    dpad_right: "DpadRight",
    left_bumper: "LeftBumper",
    right_bumper: "RightBumper",
    start: "Start",
    back: "Back",
  };

  function collectVars(nodes, set) {
    (nodes || []).forEach((n) => {
      if (!n) return;
      if (n.type === "declare" || n.type === "assign" || n.type === "for") {
        if (n.varName) set.add(n.varName);
      }
      if (n.type === "declare" && n.javaType === "String" && n.varName) {
        stringVars[n.varName] = true;
      }
      if (n.type === "assign" && n.varName && n.value && n.value.type === "string") {
        stringVars[n.varName] = true;
      }
      if (n.type === "newElapsed" && n.varName) set.add(n.varName);
      if (n.body) collectVars(n.body, set);
      if (n.then) collectVars(n.then, set);
      if (n.else) collectVars(n.else, set);
    });
  }

  function indexHardware(ir, config) {
    deviceKind = Object.create(null);
    varToDevice = Object.create(null);
    (ir.hardware || []).forEach((h) => {
      deviceKind[h.deviceName] = h.javaType;
      if (h.varName) deviceKind[h.varName] = h.javaType;
      if (h.varName) varToDevice[h.varName] = h.deviceName;
      varToDevice[h.deviceName] = h.deviceName;
    });
    // Robot config XML is source of truth for device kinds / known names
    if (config && config.devices) {
      config.devices.forEach((d) => {
        if (!d || !d.name) return;
        deviceKind[d.name] = d.javaType || deviceKind[d.name] || "DcMotor";
        varToDevice[d.name] = d.name;
      });
    }
  }

  function exprXml(e) {
    if (!e) {
      return `<shadow type="math_number" id="${nid()}"><field name="NUM">0</field></shadow>`;
    }
    if (e.type === "literal") {
      if (e.value === "true" || e.value === "false") {
        return `<block type="logic_boolean" id="${nid()}"><field name="BOOL">${e.value.toUpperCase()}</field></block>`;
      }
      return `<block type="math_number" id="${nid()}"><field name="NUM">${esc(e.value)}</field></block>`;
    }
    if (e.type === "string") {
      return `<block type="text" id="${nid()}"><field name="TEXT">${esc(e.value)}</field></block>`;
    }
    if (e.type === "var") {
      const id = varId(e.name);
      return `<block type="variables_get" id="${nid()}"><field name="VAR" id="${id}">${esc(
        e.name
      )}</field></block>`;
    }
    if (e.type === "opModeIsActive") {
      return `<block type="linearOpMode_opModeIsActive" id="${nid()}"/>`;
    }
    if (e.type === "isStopRequested") {
      return `<block type="linearOpMode_isStopRequested" id="${nid()}"/>`;
    }
    if (e.type === "gamepad") {
      const field = e.field.toLowerCase();
      if (GP_NUM[field]) {
        return `<block type="gamepad_getProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          e.pad
        )}</field><field name="PROP">${GP_NUM[field]}</field>${dataIdent(e.pad)}</block>`;
      }
      if (GP_BOOL[field]) {
        return `<block type="gamepad_getProperty_Boolean" id="${nid()}"><field name="IDENTIFIER">${esc(
          e.pad
        )}</field><field name="PROP">${GP_BOOL[field]}</field>${dataIdent(e.pad)}</block>`;
      }
      // Fallback: treat as boolean button/property name
      const prop = e.field.charAt(0).toUpperCase() + e.field.slice(1);
      return `<block type="gamepad_getProperty_Boolean" id="${nid()}"><field name="IDENTIFIER">${esc(
        e.pad
      )}</field><field name="PROP">${esc(prop)}</field>${dataIdent(e.pad)}</block>`;
    }
    if (e.type === "unary" && e.op === "-") {
      return `<block type="math_single" id="${nid()}"><field name="OP">NEG</field><value name="NUM">${exprXml(
        e.expr
      )}</value></block>`;
    }
    if (e.type === "unary" && e.op === "!") {
      return `<block type="logic_negate" id="${nid()}"><value name="BOOL">${exprXml(
        e.expr
      )}</value></block>`;
    }
    if (e.type === "binary") {
      // String concatenation must not become math_arithmetic (Number sockets reject text)
      if (e.op === "+" && (exprIsText(e.left) || exprIsText(e.right))) {
        const safe = safeTextFromExpr(e);
        if (safe.type === "textJoin") return textJoinXml(safe.parts);
        if (safe.type === "string") {
          return `<block type="text" id="${nid()}"><field name="TEXT">${esc(safe.value)}</field></block>`;
        }
      }
      const opMap = {
        "+": "ADD",
        "-": "MINUS",
        "*": "MULTIPLY",
        "/": "DIVIDE",
        "%": "MODULO",
        "==": "EQ",
        "!=": "NEQ",
        "<": "LT",
        ">": "GT",
        "<=": "LTE",
        ">=": "GTE",
        "&&": "AND",
        "||": "OR",
      };
      if (["&&", "||"].includes(e.op)) {
        return `<block type="logic_operation" id="${nid()}"><field name="OP">${
          opMap[e.op]
        }</field><value name="A">${exprXml(e.left)}</value><value name="B">${exprXml(
          e.right
        )}</value></block>`;
      }
      if (["==", "!=", "<", ">", "<=", ">="].includes(e.op)) {
        return `<block type="logic_compare" id="${nid()}"><field name="OP">${
          opMap[e.op]
        }</field><value name="A">${exprXml(e.left)}</value><value name="B">${exprXml(
          e.right
        )}</value></block>`;
      }
      return `<block type="math_arithmetic" id="${nid()}"><field name="OP">${
        opMap[e.op] || "ADD"
      }</field><value name="A">${exprXml(e.left)}</value><value name="B">${exprXml(
        e.right
      )}</value></block>`;
    }
    if (e.type === "clip") {
      return `<block type="range_clip" id="${nid()}"><value name="NUMBER">${exprXml(
        e.value
      )}</value><value name="MIN">${exprXml(e.min)}</value><value name="MAX">${exprXml(
        e.max
      )}</value></block>`;
    }
    if (e.type === "abs") {
      return `<block type="math_single" id="${nid()}"><field name="OP">ABS</field><value name="NUM">${exprXml(
        e.expr
      )}</value></block>`;
    }
    if (e.type === "call") {
      const kind = deviceKind[e.object];
      if (e.method === "getPower" && kind === "CRServo") {
        return `<block type="crServo_getProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(e.object, "CRServo")
        )}</field><field name="PROP">Power</field>${dataIdent(e.object)}</block>`;
      }
      if (e.method === "getPosition") {
        return `<block type="servo_getProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(e.object, "Servo")
        )}</field><field name="PROP">Position</field>${dataIdent(e.object)}</block>`;
      }
      if (e.method === "getPower") {
        return `<block type="dcMotor_getProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(e.object, "DcMotor")
        )}</field><field name="PROP">Power</field>${dataIdent(e.object)}</block>`;
      }
      if (e.method === "getCurrentPosition") {
        return `<block type="dcMotor_getProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(e.object, "DcMotor")
        )}</field><field name="PROP">CurrentPosition</field>${dataIdent(e.object)}</block>`;
      }
      if (e.method === "milliseconds" || e.method === "seconds") {
        const prop = e.method === "milliseconds" ? "Milliseconds" : "Seconds";
        const id = varId(e.object);
        return `<block type="elapsedTime2_getProperty_Number" id="${nid()}"><field name="PROP">${prop}</field><value name="ELAPSEDTIME"><block type="variables_get" id="${nid()}"><field name="VAR" id="${id}">${esc(
          e.object
        )}</field></block></value></block>`;
      }
      return `<block type="math_number" id="${nid()}"><field name="NUM">0</field></block>`;
    }
    if (e.type === "raw") {
      return `<block type="text" id="${nid()}"><field name="TEXT">${esc(e.value)}</field></block>`;
    }
    return `<block type="math_number" id="${nid()}"><field name="NUM">0</field></block>`;
  }

  function exprIsText(e) {
    if (!e) return false;
    if (e.type === "string" || e.type === "raw") return true;
    if (e.type === "var" && stringVars[e.name]) return true;
    if (e.type === "binary" && e.op === "+") {
      return exprIsText(e.left) || exprIsText(e.right);
    }
    return false;
  }

  function flattenTextAdd(e, parts) {
    if (e && e.type === "binary" && e.op === "+" && (exprIsText(e.left) || exprIsText(e.right))) {
      flattenTextAdd(e.left, parts);
      flattenTextAdd(e.right, parts);
    } else if (e) {
      parts.push(e);
    }
  }

  function allPartsAreTextual(parts) {
    return parts.every(
      (p) =>
        p.type === "string" ||
        p.type === "raw" ||
        (p.type === "var" && stringVars[p.name])
    );
  }

  function textJoinXml(parts) {
    const items = parts.length ? parts.slice() : [
      { type: "string", value: "" },
      { type: "string", value: "" },
    ];
    while (items.length < 2) items.push({ type: "string", value: "" });
    const mut = `<mutation items="${items.length}"></mutation>`;
    const adds = items
      .map((p, i) => `<value name="ADD${i}">${exprXml(p)}</value>`)
      .join("");
    return `<block type="text_join" id="${nid()}">${mut}${adds}</block>`;
  }

  /** Mixed "H=" + high is illegal in Blocks Number sockets — use text or a safe hint. */
  function safeTextFromExpr(e) {
    if (!e) return { type: "string", value: "" };
    if (e.type === "string") return e;
    if (e.type === "binary" && e.op === "+") {
      const parts = [];
      flattenTextAdd(e, parts);
      if (allPartsAreTextual(parts)) {
        return { type: "textJoin", parts };
      }
      return {
        type: "string",
        value: "(see separate number telemetry — avoid String + number in Java)",
      };
    }
    return e;
  }

  function chainStatements(nodes) {
    function build(list) {
      if (!list.length) return "";
      const head = stmtXml(list[0]);
      if (!head) return build(list.slice(1));
      const rest = build(list.slice(1));
      if (!rest) return head;
      // Support </block> and /> so statement chains are never dropped
      if (/<\/block>\s*$/.test(head)) {
        return head.replace(/<\/block>\s*$/, `<next>${rest}</next></block>`);
      }
      if (/\/>\s*$/.test(head)) {
        return head.replace(/\/>\s*$/, `><next>${rest}</next></block>`);
      }
      return head;
    }
    return build((nodes || []).filter(Boolean));
  }

  function stmtXml(n) {
    if (!n) return "";
    switch (n.type) {
      case "unsupported":
      case "comment": {
        const text = String(n.text || n.type).slice(0, 140);
        return `<block type="comment" id="${nid()}"><field name="COMMENT">${esc(text)}</field></block>`;
      }
      case "hardwareGet":
        // Hardware comes from the active robot config in FTC Blocks — keep a teaching comment.
        return `<block type="comment" id="${nid()}"><field name="COMMENT">${esc(
          `Config device: ${n.deviceName} (${n.javaType}) as ${n.varName}`
        )}</field></block>`;
      case "declare":
      case "assign": {
        const id = varId(n.varName);
        return `<block type="variables_set" id="${nid()}"><field name="VAR" id="${id}">${esc(
          n.varName
        )}</field><value name="VALUE">${exprXml(
          n.value || { type: "literal", value: "0" }
        )}</value></block>`;
      }
      case "setPower": {
        const kind = deviceKind[n.motor];
        if (kind === "CRServo") {
          return `<block type="crServo_setProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
            hwId(n.motor, "CRServo")
          )}</field><field name="PROP">Power</field>${dataIdent(
            n.motor
          )}<value name="VALUE">${exprXml(n.value)}</value></block>`;
        }
        return `<block type="dcMotor_setProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(n.motor, "DcMotor")
        )}</field><field name="PROP">Power</field>${dataIdent(
          n.motor
        )}<value name="VALUE">${exprXml(n.value)}</value></block>`;
      }
      case "setPosition":
        return `<block type="servo_setProperty_Number" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(n.servo, "Servo")
        )}</field><field name="PROP">Position</field>${dataIdent(
          n.servo
        )}<value name="VALUE">${exprXml(n.value)}</value></block>`;
      case "setDirection": {
        const kind = deviceKind[n.device];
        let enumType = "dcMotor_typedEnum_direction";
        let setType = "dcMotor_setProperty_Direction";
        let ident = hwId(n.device, "DcMotor");
        if (kind === "CRServo") {
          enumType = "crServo_typedEnum_direction";
          setType = "crServo_setProperty_Direction";
          ident = hwId(n.device, "CRServo");
        } else if (kind === "Servo") {
          enumType = "servo_typedEnum_direction";
          setType = "servo_setProperty_Direction";
          ident = hwId(n.device, "Servo");
        }
        return `<block type="${setType}" id="${nid()}"><field name="IDENTIFIER">${esc(
          ident
        )}</field><field name="PROP">Direction</field>${dataIdent(
          n.device
        )}<value name="VALUE"><block type="${enumType}" id="${nid()}"><field name="DIRECTION">${esc(
          n.direction
        )}</field></block></value></block>`;
      }
      case "setZeroPowerBehavior":
        return `<block type="dcMotor_setProperty_ZeroPowerBehavior" id="${nid()}"><field name="IDENTIFIER">${esc(
          hwId(n.motor, "DcMotor")
        )}</field><field name="PROP">ZeroPowerBehavior</field>${dataIdent(
          n.motor
        )}<value name="VALUE"><block type="dcMotor_typedEnum_zeroPowerBehavior" id="${nid()}"><field name="ZEROPOWERBEHAVIOR">${esc(
          n.behavior
        )}</field></block></value></block>`;
      case "sleep":
        return `<block type="linearOpMode_sleep_Number" id="${nid()}"><value name="MILLISECONDS">${exprXml(
          n.ms
        )}</value></block>`;
      case "telemetryAdd": {
        // FTC Blocks: numeric socket vs text socket are different block types
        let val = n.value;
        if (val && val.type === "binary" && val.op === "+" && (exprIsText(val.left) || exprIsText(val.right))) {
          val = safeTextFromExpr(val);
        }
        if (exprIsText(val) || (val && val.type === "textJoin") || (val && val.type === "string")) {
          const textXml =
            val && val.type === "textJoin"
              ? textJoinXml(val.parts)
              : exprXml(val);
          return `<block type="telemetry_addTextData" id="${nid()}"><value name="KEY"><block type="text" id="${nid()}"><field name="TEXT">${esc(
            n.key
          )}</field></block></value><value name="TEXT">${textXml}</value></block>`;
        }
        return `<block type="telemetry_addNumericData_Number" id="${nid()}"><value name="KEY"><block type="text" id="${nid()}"><field name="TEXT">${esc(
          n.key
        )}</field></block></value><value name="NUMBER">${exprXml(val)}</value></block>`;
      } case "telemetryUpdate":
        return `<block type="telemetry_update" id="${nid()}"></block>`;
      case "idle":
        return `<block type="linearOpMode_idle" id="${nid()}"></block>`;
      case "myBlockCall": {
        // FTC myBlocks are misc_callJava_* — NOT Blockly procedures_callnoreturn.
        // Runtime looks up Java via methodLookupString (see BlocksClassFilter.getLookupString).
        const className = n.className || "RobotMyBlocks";
        const method = n.method || "myBlock";
        const args = n.args || [];
        const meta = MYBLOCK_META[method] || {
          heading: "call Java method",
          comment: "",
          tooltip: "",
          labels: args.map((_, i) => `ARG${i}`),
          types: args.map(() => "double"),
        };
        const types = meta.types.length ? meta.types : args.map(() => "double");
        const labels = meta.labels.length ? meta.labels : types.map((t) => t);
        const paramCount = types.length;
        const lookup = myBlockLookupString(className, method, types, "void");
        let argAttrs = "";
        for (let i = 0; i < paramCount; i++) {
          argAttrs +=
            ` argLabel${i}="${esc(labels[i] || "")}"` +
            ` argType${i}="${esc(types[i] || "double")}"` +
            ` argAuto${i}=""`;
        }
        const values = args
          .map(
            (a, i) =>
              `<value name="ARG${i}">${exprXml(a || { type: "literal", value: "0" })}</value>`
          )
          .join("");
        // Pad missing args with 0 if signature longer than call (shouldn't happen)
        let pad = "";
        for (let i = args.length; i < paramCount; i++) {
          pad += `<value name="ARG${i}"><block type="math_number" id="${nid()}"><field name="NUM">0</field></block></value>`;
        }
        return (
          `<block type="misc_callJava_noReturn" id="${nid()}">` +
          `<mutation createDropdownFunctionName=""` +
          ` methodLookupString="${esc(lookup)}"` +
          ` fullClassName="org.firstinspires.ftc.teamcode.${esc(className)}"` +
          ` simpleName="${esc(className)}"` +
          ` parameterCount="${paramCount}"` +
          ` returnType="void"` +
          ` color="289"` +
          ` heading="${esc(meta.heading || "call Java method")}"` +
          ` comment="${esc(meta.comment || "")}"` +
          ` tooltip="${esc(meta.tooltip || "")}"` +
          ` accessMethod="callJava"` +
          ` convertReturnValue=""` +
          `${argAttrs}></mutation>` +
          `<field name="HEADING">${esc(meta.heading || "call Java method")}</field>` +
          `<field name="CLASS_NAME">${esc(className)}</field>` +
          `<field name="METHOD_NAME">${esc(method)}</field>` +
          `${values}${pad}` +
          `</block>`
        );
      }
      case "while":
        return `<block type="controls_whileUntil" id="${nid()}"><field name="MODE">WHILE</field><value name="BOOL">${exprXml(
          n.cond
        )}</value><statement name="DO">${chainStatements(n.body)}</statement></block>`;
      case "if":
        return `<block type="controls_if" id="${nid()}"><value name="IF0">${exprXml(
          n.cond
        )}</value><statement name="DO0">${chainStatements(n.then)}</statement>${
          n.else && n.else.length
            ? `<statement name="ELSE">${chainStatements(n.else)}</statement>`
            : ""
        }</block>`;
      case "for": {
        const id = varId(n.varName);
        return `<block type="controls_for" id="${nid()}"><field name="VAR" id="${id}">${esc(
          n.varName
        )}</field><value name="FROM">${exprXml(n.init)}</value><statement name="DO">${chainStatements(
          n.body
        )}</statement></block>`;
      }
      case "newElapsed": {
        const id = varId(n.varName);
        return `<block type="variables_set" id="${nid()}"><field name="VAR" id="${id}">${esc(
          n.varName
        )}</field><value name="VALUE"><block type="elapsedTime2_create" id="${nid()}"></block></value></block>`;
      }
      case "waitForStart":
        // Full open/close tag so chainStatements can inject <next>
        return `<block type="linearOpMode_waitForStart" id="${nid()}"></block>`;
      default:
        return "";
    }
  }

  function toBlkXml(ir, options) {
    const opts = options || {};
    const config = opts.config || null;

    idCounter = 0;
    Object.keys(varIds).forEach((k) => delete varIds[k]);
    Object.keys(stringVars).forEach((k) => delete stringVars[k]);
    Object.keys(varToDevice).forEach((k) => delete varToDevice[k]);
    indexHardware(ir, config);

    const varNames = new Set();
    collectVars(ir.init, varNames);
    collectVars(ir.run, varNames);

    // Pre-assign ids so get/set match
    [...varNames].forEach((name) => varId(name));

    const varsXml = [...varNames]
      .map((name) => `<variable id="${varIds[name]}">${esc(name)}</variable>`)
      .join("");

    // Skip waitForStart nodes inside init/run; we insert one official block.
    const initNodes = (ir.init || []).filter((n) => n && n.type !== "waitForStart");
    const runNodes = (ir.run || []).filter((n) => n && n.type !== "waitForStart");

    const stack = chainStatements([
      ...initNodes,
      { type: "waitForStart" },
      ...runNodes,
    ]);

    const flavor = ir.flavor === "Autonomous" ? "AUTONOMOUS" : "TELEOP";
    const configNote = config
      ? ` Robot config: ${config.sourceLabel} (${(config.deviceNames || []).join(", ")}).`
      : " Activate a config whose device names match hardwareMap.get(...) strings.";

    return `<xml xmlns="https://developers.google.com/blockly/xml">
<variables>${varsXml}</variables>
<block type="procedures_defnoreturn" id="${nid()}" deletable="false" x="25" y="50">
<field name="NAME">runOpMode</field>
<comment pinned="false" h="80" w="400">Generated by Java→Blocks from ${esc(
      ir.opModeName
    )}.${esc(configNote)}</comment>
<statement name="STACK">
${stack}
</statement>
</block>
</xml>
<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<Extra>
<OpModeMeta flavor="${flavor}" group="" />
<Enabled value="true" />
</Extra>
`;
  }

  return { toPreviewHTML, toBlkXml, exprToText };
})();
