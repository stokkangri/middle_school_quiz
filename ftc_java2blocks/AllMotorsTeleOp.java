package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.Range;

/**
 * Teaching TeleOp matched to test_config.xml:
 *   Hub 2 drive: left_front, left_back, right_front, right_back
 *   Hub 1:       lift_up (DC), left_servo + right_servo (positional Servos)
 *
 * Written in block-shaped Java so the Java→Blocks converter can round-trip it,
 * including these // comments as comment blocks.
 */
@TeleOp(name = "All Motors Demo")
public class AllMotorsTeleOp extends LinearOpMode {

  private DcMotor left_front;
  private DcMotor left_back;
  private DcMotor right_front;
  private DcMotor right_back;
  private DcMotor lift_up;
  private Servo left_servo;
  private Servo right_servo;

  @Override
  public void runOpMode() {
    // --- Map names must match test_config.xml exactly ---
    left_front = hardwareMap.get(DcMotor.class, "left_front");
    left_back = hardwareMap.get(DcMotor.class, "left_back");
    right_front = hardwareMap.get(DcMotor.class, "right_front");
    right_back = hardwareMap.get(DcMotor.class, "right_back");
    lift_up = hardwareMap.get(DcMotor.class, "lift_up");
    // Servo = positional (0.0 .. 1.0). Use setPosition, not setPower.
    left_servo = hardwareMap.get(Servo.class, "left_servo");
    right_servo = hardwareMap.get(Servo.class, "right_servo");

    // If a wheel runs backward, flip ONLY that motor's direction
    left_front.setDirection(DcMotor.Direction.REVERSE);
    left_back.setDirection(DcMotor.Direction.REVERSE);
    right_front.setDirection(DcMotor.Direction.FORWARD);
    right_back.setDirection(DcMotor.Direction.FORWARD);
    lift_up.setDirection(DcMotor.Direction.FORWARD);
    left_servo.setDirection(Servo.Direction.FORWARD);
    right_servo.setDirection(Servo.Direction.FORWARD);

    // Safe starting pose near middle (adjust later for your claw/arm)
    left_servo.setPosition(0.5);
    right_servo.setPosition(0.5);

    waitForStart();

    while (opModeIsActive()) {
      // ===== DRIVE (all 4 mecanum motors every loop) =====
      // drive  = forward/back  (left stick Y, negated so up = forward)
      // strafe = left/right    (left stick X) — front/back powers DIFFER here
      // turn   = spin          (right stick X) — left side opposite right side
      double drive = -gamepad1.left_stick_y;
      double strafe = gamepad1.left_stick_x;
      double turn = gamepad1.right_stick_x;

      // Mecanum mix: same-side front/back match for drive+turn; differ for strafe
      double fl = drive + strafe + turn;
      double bl = drive - strafe + turn;
      double fr = drive - strafe - turn;
      double br = drive + strafe - turn;

      // Keep powers legal (-1..1)
      fl = Range.clip(fl, -1.0, 1.0);
      bl = Range.clip(bl, -1.0, 1.0);
      fr = Range.clip(fr, -1.0, 1.0);
      br = Range.clip(br, -1.0, 1.0);

      // Command EVERY drive motor each time through the loop
      left_front.setPower(fl);
      left_back.setPower(bl);
      right_front.setPower(fr);
      right_back.setPower(br);

      // ===== LIFT (5th DC motor on Expansion Hub 1) =====
      // Right trigger up, left trigger down; both released = stop
      double liftPower = gamepad1.right_trigger - gamepad1.left_trigger;
      liftPower = Range.clip(liftPower, -1.0, 1.0);
      lift_up.setPower(liftPower);

      // ===== POSITIONAL SERVOS (aim to an angle with setPosition 0..1) =====
      // Pick two poses kids can feel. Tune numbers for full safe travel.
      // A = left open-ish, B = left closed-ish
      if (gamepad1.a) {
        left_servo.setPosition(0.8);
      }
      if (gamepad1.b) {
        left_servo.setPosition(0.2);
      }
      // X = right open-ish, Y = right closed-ish
      if (gamepad1.x) {
        right_servo.setPosition(0.8);
      }
      if (gamepad1.y) {
        right_servo.setPosition(0.2);
      }

      // Show kids what each device is doing
      telemetry.addData("FL", fl);
      telemetry.addData("BL", bl);
      telemetry.addData("FR", fr);
      telemetry.addData("BR", br);
      telemetry.addData("lift", liftPower);
      telemetry.addData("left_servo", left_servo.getPosition());
      telemetry.addData("right_servo", right_servo.getPosition());
      telemetry.update();
    }
  }
}
