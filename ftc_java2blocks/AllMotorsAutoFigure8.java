package org.firstinspires.ftc.teamcode;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;

/**
 * Autonomous demo: figure-8 (time-based), then servo wiggle ×3.
 *
 * Written fully inside runOpMode() (no helper methods) so Java→Blocks can convert it.
 *
 * TUNING locals below:
 *   figure8Scale, loopDrive, loopTurn, halfLoopMs
 *   servoA, servoB, servoHoldMs, servoWiggles, pauseBetweenMs
 *
 * DS STOP aborts anytime (opModeIsActive checks in every wait loop).
 */
@Autonomous(name = "Figure8 + Servo Wiggle")
public class AllMotorsAutoFigure8 extends LinearOpMode {

  private DcMotor left_front;
  private DcMotor left_back;
  private DcMotor right_front;
  private DcMotor right_back;
  private DcMotor lift_up;
  private Servo left_servo;
  private Servo right_servo;

  @Override
  public void runOpMode() {
    // --- Tunables (edit these) ---
    double figure8Scale = 1.0;
    double loopDrive = 0.35;
    double loopTurn = 0.35;
    double halfLoopMs = 2000;
    double servoA = 0.8;
    double servoB = 0.2;
    double servoHoldMs = 400;
    int servoWiggles = 3;
    double pauseBetweenMs = 250;

    double halfMs = halfLoopMs * figure8Scale;
    double drivePower = loopDrive * figure8Scale;
    double turnPower = loopTurn * figure8Scale;

    // --- Hardware map (names = test_config.xml) ---
    left_front = hardwareMap.get(DcMotor.class, "left_front");
    left_back = hardwareMap.get(DcMotor.class, "left_back");
    right_front = hardwareMap.get(DcMotor.class, "right_front");
    right_back = hardwareMap.get(DcMotor.class, "right_back");
    lift_up = hardwareMap.get(DcMotor.class, "lift_up");
    left_servo = hardwareMap.get(Servo.class, "left_servo");
    right_servo = hardwareMap.get(Servo.class, "right_servo");

    left_front.setDirection(DcMotor.Direction.REVERSE);
    left_back.setDirection(DcMotor.Direction.REVERSE);
    right_front.setDirection(DcMotor.Direction.FORWARD);
    right_back.setDirection(DcMotor.Direction.FORWARD);
    lift_up.setDirection(DcMotor.Direction.FORWARD);
    left_servo.setDirection(Servo.Direction.FORWARD);
    right_servo.setDirection(Servo.Direction.FORWARD);

    // Hold lift still; park servos mid-range before start
    lift_up.setPower(0.0);
    left_servo.setPosition(0.5);
    right_servo.setPosition(0.5);

    ElapsedTime timer = new ElapsedTime();

    telemetry.addData("Ready", "Figure-8 Auto");
    telemetry.addData("scale", figure8Scale);
    telemetry.addData("halfMs", halfMs);
    telemetry.addData("Tip", "DS STOP = abort anytime");
    telemetry.update();

    waitForStart();

    if (opModeIsActive()) {
      // --- Figure 8 right half ---
      telemetry.addData("Step", "Figure-8 right half");
      telemetry.update();
      timer = new ElapsedTime();
      while (opModeIsActive() && timer.milliseconds() < halfMs) {
        double fl = drivePower + turnPower;
        double bl = drivePower + turnPower;
        double fr = drivePower - turnPower;
        double br = drivePower - turnPower;
        left_front.setPower(fl);
        left_back.setPower(bl);
        right_front.setPower(fr);
        right_back.setPower(br);
        telemetry.addData("t_ms", timer.milliseconds());
        telemetry.addData("drive", drivePower);
        telemetry.addData("turn", turnPower);
        telemetry.update();
      }
      left_front.setPower(0.0);
      left_back.setPower(0.0);
      right_front.setPower(0.0);
      right_back.setPower(0.0);

      // pause
      timer = new ElapsedTime();
      while (opModeIsActive() && timer.milliseconds() < pauseBetweenMs) {
        idle();
      }

      // --- Figure 8 left half ---
      telemetry.addData("Step", "Figure-8 left half");
      telemetry.update();
      timer = new ElapsedTime();
      while (opModeIsActive() && timer.milliseconds() < halfMs) {
        double fl2 = drivePower + (0.0 - turnPower);
        double bl2 = drivePower + (0.0 - turnPower);
        double fr2 = drivePower - (0.0 - turnPower);
        double br2 = drivePower - (0.0 - turnPower);
        left_front.setPower(fl2);
        left_back.setPower(bl2);
        right_front.setPower(fr2);
        right_back.setPower(br2);
        telemetry.addData("t_ms", timer.milliseconds());
        telemetry.addData("drive", drivePower);
        telemetry.addData("turn", 0.0 - turnPower);
        telemetry.update();
      }
      left_front.setPower(0.0);
      left_back.setPower(0.0);
      right_front.setPower(0.0);
      right_back.setPower(0.0);

      timer = new ElapsedTime();
      while (opModeIsActive() && timer.milliseconds() < pauseBetweenMs) {
        idle();
      }

      // --- Servo wiggle ---
      telemetry.addData("Step", "Servo wiggle");
      telemetry.update();
      int i = 0;
      while (opModeIsActive() && i < servoWiggles) {
        left_servo.setPosition(servoA);
        right_servo.setPosition(servoA);
        timer = new ElapsedTime();
        while (opModeIsActive() && timer.milliseconds() < servoHoldMs) {
          idle();
        }

        left_servo.setPosition(servoB);
        right_servo.setPosition(servoB);
        timer = new ElapsedTime();
        while (opModeIsActive() && timer.milliseconds() < servoHoldMs) {
          idle();
        }

        i = i + 1;
        telemetry.addData("wiggle", i);
        telemetry.update();
      }
      left_servo.setPosition(0.5);
      right_servo.setPosition(0.5);

      left_front.setPower(0.0);
      left_back.setPower(0.0);
      right_front.setPower(0.0);
      right_back.setPower(0.0);
      telemetry.addData("Step", "Done");
      telemetry.update();
      sleep(500);
    }
  }
}
