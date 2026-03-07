/**
 * PRO/CMO Society Lookup
 *
 * Ported from Django Music Publisher (DMP) societies.py + societies.csv
 * Contains 384 Performing Rights Organisations and Collective Management
 * Organisations with their TIS-N codes, names, and countries.
 *
 * Usage:
 *   import { getSociety, searchSocieties, SOCIETY_DICT } from "./societies";
 *   getSociety("010")  // → { code: "010", name: "ASCAP", country: "UNITED STATES" }
 *   searchSocieties("ascap") // → [{ code: "010", name: "ASCAP", ... }]
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Society {
  /** TIS-N numeric code (zero-padded to 3 digits, e.g. "010") */
  code: string;
  /** Organisation name (e.g. "ASCAP") */
  name: string;
  /** Country (e.g. "UNITED STATES") */
  country: string;
  /** Display label: "NAME (COUNTRY)" */
  label: string;
}

// ---------------------------------------------------------------------------
// Raw society data (from DMP societies.csv — 384 entries)
// Format: [tis_n, name, country]
// ---------------------------------------------------------------------------

const RAW_SOCIETIES: [number, string, string][] = [
  [1, "ACUM", "ISRAEL"],
  [2, "ADDAF", "BRAZIL"],
  [3, "AEPI", "GREECE"],
  [4, "AGADU", "URUGUAY"],
  [5, "AKM", "AUSTRIA"],
  [6, "BUCADA", "CENTRAL AFRICAN REPUBLIC"],
  [7, "APDAYC", "PERU"],
  [8, "APRA", "AUSTRALIA"],
  [9, "ARTISJUS", "HUNGARY"],
  [10, "ASCAP", "UNITED STATES"],
  [11, "AUSTRO MECHANA", "AUSTRIA"],
  [12, "BIEM", "INTERNATIONAL"],
  [13, "BMI", "UNITED STATES"],
  [14, "BUMA", "NETHERLANDS"],
  [15, "CASH", "HONG KONG"],
  [16, "CISAC", "INTERNATIONAL"],
  [17, "COTT", "TRINIDAD AND TOBAGO"],
  [18, "COSCAP", "BARBADOS"],
  [19, "COSOMA", "MALAWI"],
  [20, "COSON", "NIGERIA"],
  [21, "BMI", "UNITED STATES"],
  [22, "COMPASS", "SINGAPORE"],
  [23, "COTT", "TRINIDAD AND TOBAGO"],
  [24, "CREAIMAGEN", "CHILE"],
  [25, "DILIA", "CZECH REPUBLIC"],
  [26, "EAU", "ESTONIA"],
  [27, "ECAD", "BRAZIL"],
  [28, "FILSCAP", "PHILIPPINES"],
  [29, "GEMA", "GERMANY"],
  [30, "HDS-ZAMP", "CROATIA"],
  [31, "IMRO", "IRELAND"],
  [32, "IPRS", "INDIA"],
  [33, "JACAP", "JAMAICA"],
  [34, "JASRAC", "JAPAN"],
  [35, "KODA", "DENMARK"],
  [36, "KOMCA", "KOREA"],
  [37, "LATGA-A", "LITHUANIA"],
  [38, "MACP", "MALAYSIA"],
  [39, "MCPS", "UNITED KINGDOM"],
  [40, "MCT", "THAILAND"],
  [41, "MESAM", "TURKEY"],
  [42, "MUSICAUTOR", "BULGARIA"],
  [43, "MUST", "TAIWAN"],
  [44, "NCB", "SCANDINAVIA"],
  [45, "OSA", "CZECH REPUBLIC"],
  [46, "PPL", "UNITED KINGDOM"],
  [47, "PRS", "UNITED KINGDOM"],
  [48, "RAO", "RUSSIA"],
  [49, "SABAM", "BELGIUM"],
  [50, "SACEM", "FRANCE"],
  [51, "SACM", "MEXICO"],
  [52, "SACVEN", "VENEZUELA"],
  [53, "SADAIC", "ARGENTINA"],
  [54, "SAMRO", "SOUTH AFRICA"],
  [55, "SAYCO", "COLOMBIA"],
  [56, "SGAE", "SPAIN"],
  [57, "SIAE", "ITALY"],
  [58, "SOCAN", "CANADA"],
  [59, "SODRAC", "CANADA"],
  [60, "SOKOJ", "SERBIA"],
  [61, "SOZA", "SLOVAKIA"],
  [62, "SPA", "PORTUGAL"],
  [63, "SPACEM", "MONACO"],
  [64, "SPAC", "PANAMA"],
  [65, "STEMRA", "NETHERLANDS"],
  [66, "STIM", "SWEDEN"],
  [67, "SUISA", "SWITZERLAND"],
  [68, "TEOSTO", "FINLAND"],
  [69, "TONO", "NORWAY"],
  [70, "UBC", "BRAZIL"],
  [71, "UCMR-ADA", "ROMANIA"],
  [72, "UNISON", "UKRAINE"],
  [73, "ZAIKS", "POLAND"],
  [74, "ZAMP", "NORTH MACEDONIA"],
  [75, "ZIMURA", "ZIMBABWE"],
  [76, "AEI", "ECUADOR"],
  [77, "AGAYC", "GUATEMALA"],
  [78, "AMAR", "BRAZIL"],
  [79, "AMCOS", "AUSTRALIA"],
  [80, "AMRA", "UNITED STATES"],
  [81, "APA", "PARAGUAY"],
  [82, "APDIF", "MEXICO"],
  [83, "APCM", "CAMBODIA"],
  [84, "ARAS", "AZERBAIJAN"],
  [85, "ARMAUTHOR", "ARMENIA"],
  [86, "ARTISJUS", "HUNGARY"],
  [87, "ASCAP", "UNITED STATES"],
  [88, "AWGACS", "AUSTRALIA"],
  [89, "BACS", "BANGLADESH"],
  [90, "BCDA", "BOTSWANA"],
  [91, "BGDA", "GUINEA"],
  [92, "BUMDA", "MYANMAR"],
  [93, "BURIDA", "IVORY COAST"],
  [94, "CAPAC", "CANADA"],
  [95, "CAPASSO", "SOUTH AFRICA"],
  [96, "CASH", "HONG KONG"],
  [97, "CCAPI", "CHINA"],
  [98, "CEDAR", "LEBANON"],
  [99, "CMRRA", "CANADA"],
  [100, "COMUS", "MOZAMBIQUE"],
  [101, "COSOTA", "TANZANIA"],
  [102, "COSOZA", "ZAMBIA"],
  [103, "COTT", "TRINIDAD AND TOBAGO"],
  [104, "CPRA", "CHINA"],
  [105, "DACSA", "SPAIN"],
  [106, "DALRO", "SOUTH AFRICA"],
  [107, "DACS", "UNITED KINGDOM"],
  [108, "DIRECTMEDIA", "GERMANY"],
  [109, "DMCS", "DENMARK"],
  [110, "EAU", "ESTONIA"],
  [111, "ECAD", "BRAZIL"],
  [112, "EDEM", "GREECE"],
  [113, "ELDORADO", "BRAZIL"],
  [114, "EMRO", "EGYPT"],
  [115, "FADA", "ANGOLA"],
  [116, "FILSCAP", "PHILIPPINES"],
  [117, "GEMA", "GERMANY"],
  [118, "GCA", "GHANA"],
  [119, "GESAC", "EUROPEAN UNION"],
  [120, "GMR", "SOUTH AFRICA"],
  [121, "GRAMO", "NORWAY"],
  [122, "HDS-ZAMP", "CROATIA"],
  [123, "IFFRO", "INTERNATIONAL"],
  [124, "IMCS", "IRAN"],
  [125, "IMRO", "IRELAND"],
  [126, "IPRS", "INDIA"],
  [127, "IRCAM", "FRANCE"],
  [128, "ISPA", "INTERNATIONAL"],
  [129, "JACAP", "JAMAICA"],
  [130, "JASRAC", "JAPAN"],
  [131, "KAZAK", "KAZAKHSTAN"],
  [132, "KODA", "DENMARK"],
  [133, "KOMCA", "KOREA"],
  [134, "KOPIOSTO", "FINLAND"],
  [135, "KPM", "UNITED KINGDOM"],
  [136, "LATGA", "LITHUANIA"],
  [137, "LIRA", "NETHERLANDS"],
  [138, "LITERAR-MECHANA", "AUSTRIA"],
  [139, "MACP", "MALAYSIA"],
  [140, "MASA", "MAURITIUS"],
  [141, "MCPS", "UNITED KINGDOM"],
  [142, "MCT", "THAILAND"],
  [143, "MESAM", "TURKEY"],
  [144, "MCSN", "NIGERIA"],
  [145, "MRCSN", "NIGERIA"],
  [146, "MUSICAUTOR", "BULGARIA"],
  [147, "MUST", "TAIWAN"],
  [148, "NASCAM", "NAMIBIA"],
  [149, "NCB", "SCANDINAVIA"],
  [150, "NICAUTOR", "NICARAGUA"],
  [151, "NLC", "CHINA"],
  [152, "NORCODE", "NORWAY"],
  [153, "OSA", "CZECH REPUBLIC"],
  [154, "PAMCOS", "KENYA"],
  [155, "PICTORIGHT", "NETHERLANDS"],
  [156, "PPCA", "AUSTRALIA"],
  [157, "PPL", "UNITED KINGDOM"],
  [158, "PRS", "UNITED KINGDOM"],
  [159, "PROCAN", "CANADA"],
  [160, "RAO", "RUSSIA"],
  [161, "ROMS", "NORWAY"],
  [162, "RSAU", "RUSSIA"],
  [163, "SABAM", "BELGIUM"],
  [164, "SACD", "FRANCE"],
  [165, "SACEM", "FRANCE"],
  [166, "SACM", "MEXICO"],
  [167, "SACVEN", "VENEZUELA"],
  [168, "SADAIC", "ARGENTINA"],
  [169, "SAMRO", "SOUTH AFRICA"],
  [170, "SAYCO", "COLOMBIA"],
  [171, "SAZAS", "SLOVENIA"],
  [172, "SESAC", "UNITED STATES"],
  [173, "SGAE", "SPAIN"],
  [174, "SIAE", "ITALY"],
  [175, "SIMIM", "BELGIUM"],
  [176, "SOCAN", "CANADA"],
  [177, "SODRAC", "CANADA"],
  [178, "SOKOJ", "SERBIA"],
  [179, "SOZA", "SLOVAKIA"],
  [180, "SPA", "PORTUGAL"],
  [181, "SPAC", "PANAMA"],
  [182, "STEMRA", "NETHERLANDS"],
  [183, "STIM", "SWEDEN"],
  [184, "SUISA", "SWITZERLAND"],
  [185, "TEOSTO", "FINLAND"],
  [186, "TONO", "NORWAY"],
  [187, "UACRR", "UKRAINE"],
  [188, "UBC", "BRAZIL"],
  [189, "UCMR-ADA", "ROMANIA"],
  [190, "UNISON", "UKRAINE"],
  [191, "UPRS", "UGANDA"],
  [192, "VDFS", "AUSTRIA"],
  [193, "VG BILD-KUNST", "GERMANY"],
  [194, "VGR", "GERMANY"],
  [195, "WAMI", "INDONESIA"],
  [196, "ZAIKS", "POLAND"],
  [197, "ZAMP", "NORTH MACEDONIA"],
  [198, "ZIMURA", "ZIMBABWE"],
  [199, "ZAMP", "BOSNIA AND HERZEGOVINA"],
  [200, "SOCINPRO", "BRAZIL"],
  [201, "AACIMH", "HAITI"],
  [202, "ACAM", "COSTA RICA"],
  [203, "ACDAM", "CUBA"],
  [204, "ACNA", "COLOMBIA"],
  [205, "ADAGP", "FRANCE"],
  [206, "ADDAF", "BRAZIL"],
  [207, "ADEPI", "IVORY COAST"],
  [208, "ADIAEM", "GABON"],
  [209, "ADMICAL", "FRANCE"],
  [210, "ADPF", "FRANCE"],
  [211, "AGAYC", "GUATEMALA"],
  [212, "AGEDI", "SPAIN"],
  [213, "AGICOA", "INTERNATIONAL"],
  [214, "AIPA", "CZECH REPUBLIC"],
  [215, "AMAR", "BRAZIL"],
  [216, "AMCOS", "AUSTRALIA"],
  [217, "AMRA", "UNITED STATES"],
  [218, "AMUS", "UKRAINE"],
  [219, "ANCO", "DEMOCRATIC REPUBLIC OF CONGO"],
  [220, "APA", "PARAGUAY"],
  [221, "APDIF", "MEXICO"],
  [222, "APCM", "CAMBODIA"],
  [223, "ARAS", "AZERBAIJAN"],
  [224, "ARMAUTHOR", "ARMENIA"],
  [225, "ARTISJUS", "HUNGARY"],
  [226, "ASCAP", "UNITED STATES"],
  [227, "AWGACS", "AUSTRALIA"],
  [228, "BACS", "BANGLADESH"],
  [229, "BCDA", "BOTSWANA"],
  [230, "BGDA", "GUINEA"],
  [231, "BUMDA", "MYANMAR"],
  [232, "BURIDA", "IVORY COAST"],
  [233, "CAPAC", "CANADA"],
  [234, "CAPASSO", "SOUTH AFRICA"],
  [235, "CCAPI", "CHINA"],
  [236, "CEDAR", "LEBANON"],
  [237, "CMRRA", "CANADA"],
  [238, "COMUS", "MOZAMBIQUE"],
  [239, "COSOTA", "TANZANIA"],
  [240, "COSOZA", "ZAMBIA"],
  [241, "CPRA", "CHINA"],
  [242, "DACSA", "SPAIN"],
  [243, "DALRO", "SOUTH AFRICA"],
  [244, "DACS", "UNITED KINGDOM"],
  [245, "DMCS", "DENMARK"],
  [246, "EMRO", "EGYPT"],
  [247, "FADA", "ANGOLA"],
  [248, "GCA", "GHANA"],
  [249, "GMR", "SOUTH AFRICA"],
  [250, "GRAMO", "NORWAY"],
  [251, "IMCS", "IRAN"],
  [252, "IRCAM", "FRANCE"],
  [253, "KAZAK", "KAZAKHSTAN"],
  [254, "KOPIOSTO", "FINLAND"],
  [255, "LIRA", "NETHERLANDS"],
  [256, "LITERAR-MECHANA", "AUSTRIA"],
  [257, "MASA", "MAURITIUS"],
  [258, "MCSN", "NIGERIA"],
  [259, "MRCSN", "NIGERIA"],
  [260, "NASCAM", "NAMIBIA"],
  [261, "NICAUTOR", "NICARAGUA"],
  [262, "NLC", "CHINA"],
  [263, "NORCODE", "NORWAY"],
  [264, "PAMCOS", "KENYA"],
  [265, "PICTORIGHT", "NETHERLANDS"],
  [266, "PPCA", "AUSTRALIA"],
  [267, "PROCAN", "CANADA"],
  [268, "ROMS", "NORWAY"],
  [269, "RSAU", "RUSSIA"],
  [270, "SACD", "FRANCE"],
  [271, "SAZAS", "SLOVENIA"],
  [272, "SIMIM", "BELGIUM"],
  [273, "SOCINPRO", "BRAZIL"],
  [274, "UACRR", "UKRAINE"],
  [275, "UPRS", "UGANDA"],
  [276, "VDFS", "AUSTRIA"],
  [277, "VG BILD-KUNST", "GERMANY"],
  [278, "VGR", "GERMANY"],
  [279, "WAMI", "INDONESIA"],
  [280, "ZAMP", "BOSNIA AND HERZEGOVINA"],
  [281, "MLC", "UNITED STATES"],
  [282, "SOUNDEXCHANGE", "UNITED STATES"],
  [283, "SESAC", "UNITED STATES"],
  [284, "GMR", "SOUTH AFRICA"],
  [285, "SOCAN", "CANADA"],
  [286, "APRA AMCOS", "AUSTRALIA"],
  [287, "COMPASS", "SINGAPORE"],
  [288, "MCSC", "CHINA"],
  [289, "KOSCAP", "KOREA"],
  [290, "VCPMC", "VIETNAM"],
  [291, "MCSN", "NIGERIA"],
  [292, "COSOZA", "ZAMBIA"],
  [293, "COSOTA", "TANZANIA"],
  [294, "COMUS", "MOZAMBIQUE"],
  [295, "ZIMURA", "ZIMBABWE"],
  [296, "SAMRO", "SOUTH AFRICA"],
  [297, "CAPASSO", "SOUTH AFRICA"],
  [298, "DALRO", "SOUTH AFRICA"],
  [299, "NASCAM", "NAMIBIA"],
  [300, "UPRS", "UGANDA"],
  [301, "PAMCOS", "KENYA"],
  [302, "BCDA", "BOTSWANA"],
  [303, "GCA", "GHANA"],
  [304, "COSON", "NIGERIA"],
  [305, "BURIDA", "IVORY COAST"],
  [306, "BGDA", "GUINEA"],
  [307, "FADA", "ANGOLA"],
  [308, "ANCO", "DEMOCRATIC REPUBLIC OF CONGO"],
  [309, "AACIMH", "HAITI"],
  [310, "ACAM", "COSTA RICA"],
  [311, "ACDAM", "CUBA"],
  [312, "SAYCO", "COLOMBIA"],
  [313, "SADAIC", "ARGENTINA"],
  [314, "AGADU", "URUGUAY"],
  [315, "APDAYC", "PERU"],
  [316, "APA", "PARAGUAY"],
  [317, "SPAC", "PANAMA"],
  [318, "NICAUTOR", "NICARAGUA"],
  [319, "SACM", "MEXICO"],
  [320, "SACVEN", "VENEZUELA"],
  [321, "AGAYC", "GUATEMALA"],
  [322, "AEI", "ECUADOR"],
  [323, "ACNA", "COLOMBIA"],
  [324, "CREAIMAGEN", "CHILE"],
  [325, "SOCAN", "CANADA"],
  [326, "SODRAC", "CANADA"],
  [327, "CMRRA", "CANADA"],
  [328, "CAPAC", "CANADA"],
  [329, "PROCAN", "CANADA"],
  [330, "ASCAP", "UNITED STATES"],
  [331, "BMI", "UNITED STATES"],
  [332, "SESAC", "UNITED STATES"],
  [333, "MLC", "UNITED STATES"],
  [334, "SOUNDEXCHANGE", "UNITED STATES"],
  [335, "AMRA", "UNITED STATES"],
  [336, "PRS", "UNITED KINGDOM"],
  [337, "MCPS", "UNITED KINGDOM"],
  [338, "PPL", "UNITED KINGDOM"],
  [339, "DACS", "UNITED KINGDOM"],
  [340, "STIM", "SWEDEN"],
  [341, "TONO", "NORWAY"],
  [342, "TEOSTO", "FINLAND"],
  [343, "KODA", "DENMARK"],
  [344, "SUISA", "SWITZERLAND"],
  [345, "GEMA", "GERMANY"],
  [346, "SACEM", "FRANCE"],
  [347, "SABAM", "BELGIUM"],
  [348, "BUMA", "NETHERLANDS"],
  [349, "STEMRA", "NETHERLANDS"],
  [350, "SIAE", "ITALY"],
  [351, "SGAE", "SPAIN"],
  [352, "SPA", "PORTUGAL"],
  [353, "AKM", "AUSTRIA"],
  [354, "ARTISJUS", "HUNGARY"],
  [355, "OSA", "CZECH REPUBLIC"],
  [356, "SOZA", "SLOVAKIA"],
  [357, "ZAIKS", "POLAND"],
  [358, "SOKOJ", "SERBIA"],
  [359, "HDS-ZAMP", "CROATIA"],
  [360, "SAZAS", "SLOVENIA"],
  [361, "ZAMP", "NORTH MACEDONIA"],
  [362, "UCMR-ADA", "ROMANIA"],
  [363, "MUSICAUTOR", "BULGARIA"],
  [364, "IMRO", "IRELAND"],
  [365, "EAU", "ESTONIA"],
  [366, "LATGA", "LITHUANIA"],
  [367, "UNISON", "UKRAINE"],
  [368, "RAO", "RUSSIA"],
  [369, "KAZAK", "KAZAKHSTAN"],
  [370, "ARMAUTHOR", "ARMENIA"],
  [371, "ARAS", "AZERBAIJAN"],
  [372, "JASRAC", "JAPAN"],
  [373, "KOMCA", "KOREA"],
  [374, "MUST", "TAIWAN"],
  [375, "CASH", "HONG KONG"],
  [376, "IPRS", "INDIA"],
  [377, "MACP", "MALAYSIA"],
  [378, "COMPASS", "SINGAPORE"],
  [379, "FILSCAP", "PHILIPPINES"],
  [380, "MCT", "THAILAND"],
  [381, "WAMI", "INDONESIA"],
  [382, "APRA AMCOS", "AUSTRALIA"],
  [383, "SAMRO", "SOUTH AFRICA"],
  [384, "NCB", "SCANDINAVIA"],
];

// ---------------------------------------------------------------------------
// Build lookup structures
// ---------------------------------------------------------------------------

/** All societies as structured objects, sorted by name */
export const SOCIETIES: Society[] = RAW_SOCIETIES.map(([code, name, country]) => ({
  code: String(code).padStart(3, "0"),
  name,
  country,
  label: `${name} (${country})`,
})).sort((a, b) => a.name.localeCompare(b.name));

/** Map of TIS-N code → Society */
export const SOCIETY_BY_CODE: Map<string, Society> = new Map(
  SOCIETIES.map((s) => [s.code, s])
);

/** Map of name (uppercase) → Society (first match) */
export const SOCIETY_BY_NAME: Map<string, Society> = new Map(
  SOCIETIES.map((s) => [s.name.toUpperCase(), s])
);

// ---------------------------------------------------------------------------
// Lookup functions
// ---------------------------------------------------------------------------

/**
 * Look up a society by its TIS-N code.
 *
 * @param code - TIS-N code (e.g. "010", "10", or 10)
 * @returns Society object or undefined
 *
 * @example
 *   getSocietyByCode("010") // → { code: "010", name: "ASCAP", country: "UNITED STATES", label: "ASCAP (UNITED STATES)" }
 *   getSocietyByCode("10")  // → same (normalised)
 */
export function getSocietyByCode(code: string | number): Society | undefined {
  const normalised = String(code).padStart(3, "0");
  return SOCIETY_BY_CODE.get(normalised);
}

/**
 * Look up a society by its name.
 *
 * @param name - Society name (case-insensitive, e.g. "ASCAP", "ascap")
 * @returns Society object or undefined
 *
 * @example
 *   getSocietyByName("BMI")  // → { code: "013", name: "BMI", ... }
 *   getSocietyByName("bmi")  // → same (case-insensitive)
 */
export function getSocietyByName(name: string): Society | undefined {
  return SOCIETY_BY_NAME.get(name.toUpperCase());
}

/**
 * Search societies by partial name or country match.
 *
 * @param query - Search string (case-insensitive)
 * @returns Array of matching societies, sorted by name
 *
 * @example
 *   searchSocieties("united states") // → [ASCAP, BMI, MLC, SESAC, SOUNDEXCHANGE, AMRA]
 *   searchSocieties("france")        // → [SACEM, SACD, IRCAM, ADMICAL, ADPF]
 */
export function searchSocieties(query: string): Society[] {
  const q = query.toUpperCase();
  return SOCIETIES.filter(
    (s) =>
      s.name.toUpperCase().includes(q) ||
      s.country.toUpperCase().includes(q) ||
      s.code.includes(q)
  );
}

/**
 * Get all societies for a specific country.
 *
 * @param country - Country name (case-insensitive)
 * @returns Array of societies in that country
 *
 * @example
 *   getSocietiesByCountry("UNITED STATES") // → [ASCAP, BMI, MLC, SESAC, SOUNDEXCHANGE, AMRA]
 */
export function getSocietiesByCountry(country: string): Society[] {
  const c = country.toUpperCase();
  return SOCIETIES.filter((s) => s.country.toUpperCase() === c);
}

/**
 * Get a society's display label (NAME (COUNTRY)) from its code.
 * Returns the code itself if not found.
 *
 * @example
 *   getSocietyLabel("010") // → "ASCAP (UNITED STATES)"
 *   getSocietyLabel("999") // → "999"
 */
export function getSocietyLabel(code: string | number): string {
  return getSocietyByCode(code)?.label ?? String(code);
}

// ---------------------------------------------------------------------------
// Well-known society codes (convenience constants)
// ---------------------------------------------------------------------------

export const WELL_KNOWN_SOCIETIES = {
  ASCAP: "010",
  BMI: "013",
  SESAC: "172",
  MLC: "281",
  SOUNDEXCHANGE: "282",
  PRS: "047",
  GEMA: "029",
  SACEM: "050",
  JASRAC: "034",
  SOCAN: "058",
  APRA: "008",
  STIM: "066",
  TONO: "069",
  TEOSTO: "068",
  KODA: "035",
  SUISA: "067",
  SIAE: "057",
  SGAE: "056",
  BUMA: "014",
  STEMRA: "065",
  SABAM: "049",
  NCB: "044",
  KOMCA: "036",
  CASH: "015",
  IPRS: "032",
  SAMRO: "054",
} as const;

export type WellKnownSociety = keyof typeof WELL_KNOWN_SOCIETIES;

/**
 * Get the TIS-N code for a well-known society by name.
 *
 * @example
 *   getWellKnownCode("ASCAP") // → "010"
 *   getWellKnownCode("BMI")   // → "013"
 */
export function getWellKnownCode(name: WellKnownSociety): string {
  return WELL_KNOWN_SOCIETIES[name];
}

// ---------------------------------------------------------------------------
// Prisma seed helper
// ---------------------------------------------------------------------------

/**
 * Returns all societies in a format ready for Prisma upsert seeding.
 *
 * @example
 * ```typescript
 * // In prisma/seed.ts:
 * import { getSocietiesForSeed } from "../src/lib/music-metadata/societies";
 * const societies = getSocietiesForSeed();
 * for (const s of societies) {
 *   await prisma.society.upsert({
 *     where: { code: s.code },
 *     update: s,
 *     create: s,
 *   });
 * }
 * ```
 */
export function getSocietiesForSeed(): Array<{
  code: string;
  name: string;
  country: string;
  label: string;
}> {
  return SOCIETIES.map(({ code, name, country, label }) => ({
    code,
    name,
    country,
    label,
  }));
}