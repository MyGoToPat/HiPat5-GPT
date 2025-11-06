import { lookup as lookupBrand } from "./brandMap";
import { lookup as lookupGemini } from "./gemini";
import { lookup as lookupGeneric } from "./generic";

export const PROVIDERS = {
  brand:   lookupBrand,
  gemini:  lookupGemini,
  generic: lookupGeneric,
} as const;

export type ProviderKey = keyof typeof PROVIDERS;