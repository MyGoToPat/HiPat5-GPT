import { PersonaAgent, PersonaContext, PersonaDraft } from "../types";

export const uncertaintyCalibrator: PersonaAgent = {
  id: "uncertainty-calibrator",
  title: "Uncertainty Calibrator",
  order: 7,
  enabled: true,
  async run(ctx: PersonaContext, draft: PersonaDraft): Promise<PersonaDraft> {
    // Example stub: add a note when metadata says low confidence.
    const low = draft.meta?.lowConfidence === true;
    if (low) draft.text += " I cannot confirm this.";
    return draft;
  },
};