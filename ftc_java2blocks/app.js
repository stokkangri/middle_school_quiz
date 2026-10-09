/* UI for Java → Blocks translator */

(() => {
  // Blocks-shaped OpMode with one typical Java tweak: half-speed scale (* 0.5)
  const SAMPLE = `package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.util.Range;

@TeleOp(name = "Simple Drive")
public class SimpleDrive extends LinearOpMode {
    DcMotor left;
    DcMotor right;

    @Override
    public void runOpMode() {
        left = hardwareMap.get(DcMotor.class, "left");
        right = hardwareMap.get(DcMotor.class, "right");
        left.setDirection(DcMotor.Direction.REVERSE);

        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;
            double turn = gamepad1.right_stick_x;
            // Small Java tweak: half speed so new drivers stay controllable
            double leftPower = Range.clip((drive + turn) * 0.5, -1.0, 1.0);
            double rightPower = Range.clip((drive - turn) * 0.5, -1.0, 1.0);

            left.setPower(leftPower);
            right.setPower(rightPower);

            telemetry.addData("drive", drive);
            telemetry.update();
        }
    }
}
`;

  // Matches test_config.xml — 4 drive + lift + 2 positional servos (default demo)
  const SAMPLE_ALL_MOTORS = "package org.firstinspires.ftc.teamcode;\n\nimport com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;\nimport com.qualcomm.robotcore.eventloop.opmode.TeleOp;\nimport com.qualcomm.robotcore.hardware.DcMotor;\nimport com.qualcomm.robotcore.hardware.Servo;\nimport com.qualcomm.robotcore.util.Range;\n\n/**\n * Teaching TeleOp matched to test_config.xml:\n *   Hub 2 drive: left_front, left_back, right_front, right_back\n *   Hub 1:       lift_up (DC), left_servo + right_servo (positional Servos)\n *\n * Written in block-shaped Java so the Java→Blocks converter can round-trip it,\n * including these // comments as comment blocks.\n */\n@TeleOp(name = \"All Motors Demo\")\npublic class AllMotorsTeleOp extends LinearOpMode {\n\n  private DcMotor left_front;\n  private DcMotor left_back;\n  private DcMotor right_front;\n  private DcMotor right_back;\n  private DcMotor lift_up;\n  private Servo left_servo;\n  private Servo right_servo;\n\n  @Override\n  public void runOpMode() {\n    // --- Map names must match test_config.xml exactly ---\n    left_front = hardwareMap.get(DcMotor.class, \"left_front\");\n    left_back = hardwareMap.get(DcMotor.class, \"left_back\");\n    right_front = hardwareMap.get(DcMotor.class, \"right_front\");\n    right_back = hardwareMap.get(DcMotor.class, \"right_back\");\n    lift_up = hardwareMap.get(DcMotor.class, \"lift_up\");\n    // Servo = positional (0.0 .. 1.0). Use setPosition, not setPower.\n    left_servo = hardwareMap.get(Servo.class, \"left_servo\");\n    right_servo = hardwareMap.get(Servo.class, \"right_servo\");\n\n    // If a wheel runs backward, flip ONLY that motor's direction\n    left_front.setDirection(DcMotor.Direction.REVERSE);\n    left_back.setDirection(DcMotor.Direction.REVERSE);\n    right_front.setDirection(DcMotor.Direction.FORWARD);\n    right_back.setDirection(DcMotor.Direction.FORWARD);\n    lift_up.setDirection(DcMotor.Direction.FORWARD);\n    left_servo.setDirection(Servo.Direction.FORWARD);\n    right_servo.setDirection(Servo.Direction.FORWARD);\n\n    // Safe starting pose near middle (adjust later for your claw/arm)\n    left_servo.setPosition(0.5);\n    right_servo.setPosition(0.5);\n\n    waitForStart();\n\n    while (opModeIsActive()) {\n      // ===== DRIVE (all 4 mecanum motors every loop) =====\n      // drive  = forward/back  (left stick Y, negated so up = forward)\n      // strafe = left/right    (left stick X) — front/back powers DIFFER here\n      // turn   = spin          (right stick X) — left side opposite right side\n      double drive = -gamepad1.left_stick_y;\n      double strafe = gamepad1.left_stick_x;\n      double turn = gamepad1.right_stick_x;\n\n      // Mecanum mix: same-side front/back match for drive+turn; differ for strafe\n      double fl = drive + strafe + turn;\n      double bl = drive - strafe + turn;\n      double fr = drive - strafe - turn;\n      double br = drive + strafe - turn;\n\n      // Keep powers legal (-1..1)\n      fl = Range.clip(fl, -1.0, 1.0);\n      bl = Range.clip(bl, -1.0, 1.0);\n      fr = Range.clip(fr, -1.0, 1.0);\n      br = Range.clip(br, -1.0, 1.0);\n\n      // Command EVERY drive motor each time through the loop\n      left_front.setPower(fl);\n      left_back.setPower(bl);\n      right_front.setPower(fr);\n      right_back.setPower(br);\n\n      // ===== LIFT (5th DC motor on Expansion Hub 1) =====\n      // Right trigger up, left trigger down; both released = stop\n      double liftPower = gamepad1.right_trigger - gamepad1.left_trigger;\n      liftPower = Range.clip(liftPower, -1.0, 1.0);\n      lift_up.setPower(liftPower);\n\n      // ===== POSITIONAL SERVOS (aim to an angle with setPosition 0..1) =====\n      // Pick two poses kids can feel. Tune numbers for full safe travel.\n      // A = left open-ish, B = left closed-ish\n      if (gamepad1.a) {\n        left_servo.setPosition(0.8);\n      }\n      if (gamepad1.b) {\n        left_servo.setPosition(0.2);\n      }\n      // X = right open-ish, Y = right closed-ish\n      if (gamepad1.x) {\n        right_servo.setPosition(0.8);\n      }\n      if (gamepad1.y) {\n        right_servo.setPosition(0.2);\n      }\n\n      // Show kids what each device is doing\n      telemetry.addData(\"FL\", fl);\n      telemetry.addData(\"BL\", bl);\n      telemetry.addData(\"FR\", fr);\n      telemetry.addData(\"BR\", br);\n      telemetry.addData(\"lift\", liftPower);\n      telemetry.addData(\"left_servo\", left_servo.getPosition());\n      telemetry.addData(\"right_servo\", right_servo.getPosition());\n      telemetry.update();\n    }\n  }\n}\n";

  const javaInput = document.getElementById("java-input");
  const preview = document.getElementById("blocks-preview");
  const report = document.getElementById("report");
  const status = document.getElementById("status-pill");
  const btnConvert = document.getElementById("convert-btn");
  const btnSample = document.getElementById("load-sample");
  const btnAllMotors = document.getElementById("load-all-motors");
  const btnDl = document.getElementById("download-blk");
  const btnCopy = document.getElementById("copy-xml");

  let lastXml = "";
  let lastDownloadName = "ConvertedOpMode";
  let robotConfig = null;

  const configInput = document.getElementById("config-input");
  const configLabel = document.getElementById("config-label");

  if (configInput) {
    configInput.addEventListener("change", () => {
      const file = configInput.files && configInput.files[0];
      if (!file) {
        robotConfig = null;
        if (configLabel) {
          configLabel.textContent =
            "Using names from hardwareMap.get — load test_config.xml for validation";
        }
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        robotConfig = Java2BlocksConfig.parseRobotXml(
          String(reader.result || ""),
          file.name
        );
        if (configLabel) {
          configLabel.textContent = `${file.name}: ${(robotConfig.deviceNames || []).join(
            ", "
          )}`;
        }
        convert();
      };
      reader.readAsText(file);
    });
  }

  function setStatus(kind, text) {
    status.className = `status ${kind}`;
    status.textContent = text;
  }

  function safeFileBase(name) {
    return (
      String(name || "ConvertedOpMode")
        .replace(/[^\w\- ]+/g, "")
        .trim()
        .replace(/\s+/g, "_") || "ConvertedOpMode"
    );
  }

  function fallbackDownload(filename, blob) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function saveBlkFile() {
    if (!lastXml) return;
    const suggested = `${safeFileBase(lastDownloadName)}.blk`;
    const blob = new Blob([lastXml], { type: "text/plain;charset=utf-8" });

    // Chromium / Edge / recent Chrome: real Save dialog (folder + rename)
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [
            {
              description: "FTC Blocks OpMode",
              accept: { "text/plain": [".blk"], "application/xml": [".blk"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        setStatus("ok", "Saved .blk");
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return; // user cancelled
        // Fall through to legacy download if picker fails
      }
    }

    fallbackDownload(suggested, blob);
    setStatus(
      "warn",
      "Downloaded — use browser Save As if you need another folder/name"
    );
  }

  function renderReport(issues, ir, result) {
    if (result && result.library) {
      report.innerHTML = `
        <div class="ok-box">
          <strong>myBlocks library</strong> — deploy <code>${escapeHtml(
            ir.opModeName || "this file"
          )}</code> as Java on the RC (do not convert to <code>.blk</code>).
          Convert Sample Auto / TeleOp OpModes that call it instead.
        </div>`;
      return;
    }

    const hard = (issues || []).filter((i) => i.level !== "info");
    const infos = (issues || []).filter((i) => i.level === "info");

    if (!hard.length) {
      const infoHtml = infos.length
        ? `<p class="meta">${infos
            .map((i) => escapeHtml(i.message))
            .join(" · ")}</p>`
        : "";
      report.innerHTML = `
        <div class="ok-box">
          <strong>Looks round-trip friendly</strong> — your Java still matches the Blocks-shaped subset.
          Download <code>.blk</code>, open it in Blocks, and confirm device names match your robot config.
          myBlock calls (<code>*MyBlocks.method</code>) map to Blocks procedure/myBlock calls — keep the library Java on the RC.
        </div>
        <p class="meta">OpMode: <code>${escapeHtml(ir.opModeName || "")}</code> · ${escapeHtml(
        ir.flavor || ""
      )} ·
          hardware: ${(ir.hardware || []).map((h) => h.deviceName).join(", ") || "(none)"}</p>
        ${infoHtml}`;
      return;
    }

    const items = hard
      .map(
        (iss) => `
      <article class="issue">
        <header>
          <span class="line">line ${iss.line || "?"}</span>
          <span class="msg">${escapeHtml(iss.message)}</span>
        </header>
        ${iss.code ? `<pre class="snip">${escapeHtml(iss.code)}</pre>` : ""}
        <p class="tip"><strong>To stay in Blocks:</strong> ${escapeHtml(iss.tip || "")}</p>
      </article>`
      )
      .join("");

    report.innerHTML = `
      <p class="meta">${hard.length} edit(s) may not round-trip — preview still shows what could be mapped.</p>
      ${items}`;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function convert() {
    const src = javaInput.value;
    const result = Java2BlocksParser.parse(src);
    const issues = (result.issues || []).slice();
    if (!result.library && robotConfig) {
      const cfgIssues = Java2BlocksConfig.validateHardware(
        result.ir.hardware || [],
        robotConfig
      );
      cfgIssues.forEach((i) => issues.push(i));
    }
    const html = Java2BlocksConvert.toPreviewHTML(result.ir);
    preview.innerHTML = html;
    lastXml = result.library
      ? ""
      : Java2BlocksConvert.toBlkXml(result.ir, { config: robotConfig });
    lastDownloadName = result.ir.opModeName || "ConvertedOpMode";
    renderReport(issues, result.ir, result);

    const hard = issues.filter((i) => i.level !== "info").length;
    if (result.library) {
      setStatus("ok", "Library — deploy as Java");
      btnDl.disabled = true;
      btnCopy.disabled = true;
      return;
    }
    if (!result.ok && !(result.ir.run && result.ir.run.length)) {
      setStatus("err", "Failed");
    } else if (hard) {
      setStatus("warn", `${hard} non-block edit(s)`);
    } else {
      setStatus("ok", robotConfig ? "Round-trip OK · config checked" : "Round-trip OK");
    }

    btnDl.disabled = false;
    btnCopy.disabled = false;
  }

  btnSample.addEventListener("click", () => {
    javaInput.value = SAMPLE;
    convert();
  });

  if (btnAllMotors) {
    btnAllMotors.addEventListener("click", () => {
      javaInput.value = SAMPLE_ALL_MOTORS;
      convert();
    });
  }

  btnConvert.addEventListener("click", convert);

  btnDl.addEventListener("click", () => {
    saveBlkFile();
  });

  btnCopy.addEventListener("click", async () => {
    if (!lastXml) return;
    try {
      await navigator.clipboard.writeText(lastXml);
      setStatus("ok", "XML copied");
    } catch {
      setStatus("warn", "Copy failed");
    }
  });

  // Auto-load all-motors demo (matches test_config.xml)
  javaInput.value = SAMPLE_ALL_MOTORS;
  convert();
})();
