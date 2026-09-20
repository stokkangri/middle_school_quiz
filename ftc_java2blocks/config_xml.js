/* FTC robot configuration XML → device name table */

const Java2BlocksConfig = (() => {
  const MOTOR_TAGS = /Motor|motor/i;
  const SERVO_TAGS = /^Servo$/i;
  const CR_SERVO_TAGS = /Continuous|CRServo|CrServo/i;
  const IMU_TAGS = /IMU|BNO055/i;

  function javaTypeForTag(tag) {
    if (CR_SERVO_TAGS.test(tag)) return "CRServo";
    if (SERVO_TAGS.test(tag)) return "Servo";
    if (IMU_TAGS.test(tag)) return "IMU";
    if (MOTOR_TAGS.test(tag)) return "DcMotor";
    return "Unknown";
  }

  /**
   * Parse an FTC Robot config XML string (e.g. test_config.xml).
   * Returns { devices, byName, sourceLabel }.
   */
  function parseRobotXml(xml, sourceLabel) {
    const devices = [];
    const byName = Object.create(null);
    const text = String(xml || "");

    // Match device elements with a name= attribute (self-closing or with body)
    const re =
      /<([A-Za-z][\w.]*)\b([^>]*?)\bname\s*=\s*"([^"]+)"([^>]*)\/?>/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const tag = m[1];
      if (tag === "Robot" || tag === "LynxUsbDevice" || tag === "LynxModule") {
        continue;
      }
      const attrs = (m[2] || "") + " " + (m[4] || "");
      const name = m[3];
      const portM = attrs.match(/\bport\s*=\s*"([^"]+)"/);
      const javaType = javaTypeForTag(tag);
      if (javaType === "Unknown") continue;

      const device = {
        name,
        tag,
        javaType,
        port: portM ? portM[1] : null,
      };
      devices.push(device);
      byName[name] = device;
    }

    return {
      devices,
      byName,
      sourceLabel: sourceLabel || "robot_config.xml",
      deviceNames: devices.map((d) => d.name),
    };
  }

  function validateHardware(irHardware, config) {
    const issues = [];
    if (!config || !config.byName) return issues;
    (irHardware || []).forEach((h) => {
      const name = h.deviceName;
      if (!name) return;
      const cfg = config.byName[name];
      if (!cfg) {
        const known = (config.deviceNames || []).join(", ") || "(none)";
        issues.push({
          line: 0,
          code: `hardwareMap.get(..., "${name}")`,
          message: `Device "${name}" is not in config ${config.sourceLabel}.`,
          tip: `Use an exact name from the robot config: ${known}. Or activate/pass the matching XML.`,
        });
        return;
      }
      // Soft type check: DcMotorEx vs DcMotor OK; Servo vs CRServo not OK
      const jt = h.javaType || "";
      if (
        cfg.javaType === "Servo" &&
        (jt === "CRServo" || jt === "DcMotor" || jt === "DcMotorEx")
      ) {
        issues.push({
          line: 0,
          code: `${jt} ${h.varName} → "${name}"`,
          message: `Config defines "${name}" as ${cfg.tag} (Servo), but Java uses ${jt}.`,
          tip: "Change the Java type or the config device type so they match.",
        });
      }
      if (cfg.javaType === "DcMotor" && (jt === "Servo" || jt === "CRServo")) {
        issues.push({
          line: 0,
          code: `${jt} ${h.varName} → "${name}"`,
          message: `Config defines "${name}" as a motor (${cfg.tag}), but Java uses ${jt}.`,
          tip: "Change the Java type or the config device type so they match.",
        });
      }
    });
    return issues;
  }

  return { parseRobotXml, validateHardware, javaTypeForTag };
})();
