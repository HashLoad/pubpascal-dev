// Publish-time validation enforcement flag (ESP-002, ADR-043).
//
// Lenient launch (BR1): enforcement is OFF by default. The flag is scaffolded so a
// future demand can flip it without re-architecting. While off (and with the
// registry empty), the enforce branch in `submitPackage` is inert.

export function isPublishValidationEnforced(): boolean {
  return process.env.PUBLISH_VALIDATION_ENFORCE === "true";
}
