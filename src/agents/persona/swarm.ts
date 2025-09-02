import { PersonaAgent } from "./types";
import { empathyDetector } from "./modules/empathy-detector";
import { learningProfiler } from "./modules/learning-profiler";
import { clarityCoach } from "./modules/clarity-coach";
import { privacyRedaction } from "./modules/privacy-redaction";
import { evidenceGate } from "./modules/evidence-gate";
import { concisenessEnforcer } from "./modules/conciseness-enforcer";
import { uncertaintyCalibrator } from "./modules/uncertainty-calibrator";
import { personaConsistency } from "./modules/persona-consistency";
import { timeContext } from "./modules/time-context";
import { accessibilityFormatter } from "./modules/accessibility-formatter";
import { audienceSwitcher } from "./modules/audience-switcher";
import { actionizer } from "./modules/actionizer";

export const personalitySwarm: PersonaAgent[] = [
  empathyDetector,
  learningProfiler,
  clarityCoach,
  privacyRedaction,
  evidenceGate,
  concisenessEnforcer,
  uncertaintyCalibrator,
  personaConsistency,
  timeContext,
  accessibilityFormatter,
  audienceSwitcher,
  actionizer,
];