# Java → Blocks (FTC round-trip helper)

For **Blocks-first** teams: build in Blocks, make a **small** Java tweak, then convert back and see what still maps.

## Intended workflow

1. Write the OpMode in Blocks.
2. Export / open the Java and change a little (speed scale, clip, sleep, a simple `if`).
3. Paste into this tool → **Convert back**.
4. Download `.blk` and reopen in the Blocks editor (fix hardware names).

You do **not** need to write large pure-Java OpModes. If an edit cannot map to Blocks, the report suggests how to keep it block-shaped (or leave that piece in Java / a myBlock).

## Run

### Web UI

Open `index.html`, or:

```bash
npx serve .
```

### Command line (recommended for spotting round-trip errors)

Needs **Node.js** (same engine as the web parser). Python 3 wraps it:

```bash
cd ftc_java2blocks

# One file — print issues (exit 1 if any)
python3 j2b.py AllMotorsTeleOp.java

# Explicit top-level robot config (recommended)
python3 j2b.py ../MotorDiagnostics.java -o MotorDiagnostics.blk --config ../test_config.xml

# Auto-discovers ../test_config.xml by walking up from the Java file
python3 j2b.py ../diag_by_device/java/DiagLeftBack.java -o out.blk

# All Java in a folder
python3 j2b.py ../diag_by_device/java --summary --config ../test_config.xml

# Only show files that fail
python3 j2b.py ../*.java --quiet --summary

# Machine-readable
python3 j2b.py AllMotorsTeleOp.java --json
```

Or call Node directly:

```bash
node j2b_cli.js AllMotorsTeleOp.java
node j2b_cli.js AllMotorsTeleOp.java --blk out.blk --json
```

Exit codes: `0` = clean, `1` = round-trip issues, `2` = tool error.

## Deploy

Static hosting: **GitHub Pages** or **Netlify**.

## Safe vs risky edits

**Usually round-trips:** numbers, `* 0.5`, `Range.clip`, `Math.abs`, stick swaps, `setPower` / `sleep` / `telemetry` / `setZeroPowerBehavior`, `if` / `else if` / `while`, `double` / `int` / `boolean` / `String` locals.

**Robot config XML:** pass `--config test_config.xml` (or load it in the web UI). That file is the source of truth for hardware **device names**; the converter validates `hardwareMap.get(..., "name")` against it and stamps those names into the `.blk`.

**Breaks round-trip:** vision, threads, Road Runner, `switch`, lambdas, custom classes, arrays of motors, **`String + number` concatenation** (use separate `telemetry.addData` lines for numbers).

Generated `.blk` uses **real FTC Blocks type names** from the SDK (e.g. `dcMotor_setProperty_Number`, `linearOpMode_waitForStart`, `gamepad_getProperty_Number`) plus the required `<Extra>` trailer so **Upload Op Mode** on the RC can load it. Device names must match your active config. Always open and smoke-test after upload.