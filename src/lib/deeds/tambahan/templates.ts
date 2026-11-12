import type { DeedTemplate } from "../types";
import { buatTemplate } from "./build";
import { TAMBAHAN } from "./index";

export const TEMPLATE_TAMBAHAN: DeedTemplate[] = TAMBAHAN.map(buatTemplate);
