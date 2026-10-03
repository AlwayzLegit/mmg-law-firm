import { describe, expect, it } from "vitest";

import { parseTopicsText } from "./topic-import";

describe("parseTopicsText", () => {
  it("parses the seo-keyword-targets markdown table, splitting ' / ' keywords", () => {
    const md = `
| Keyword | Vol | KD | CPC | Practice area | Build as |
| --- | --- | --- | --- | --- | --- |
| los angeles truck accident lawyer | 2,900 | **19** | $157 | truck-accidents | LA × truck |
| lyft accident lawyers / lawyer for uber accident | 2,400 / 1,300 | **17 / 22** | $154 / $173 | rideshare-accidents | Glendale × rideshare |
| neck injury lawyer | 1,600 | **10** | $122 | car-accidents (symptom intent) | blog |
| personal injury lawyer glendale | 720 | **13** | $44 | (homepage / Glendale county) | homepage |
`;
    const { topics, errors } = parseTopicsText(md);
    expect(errors).toEqual([]);
    expect(topics).toHaveLength(5);
    expect(topics[0]).toMatchObject({ keyword: "los angeles truck accident lawyer", volume: 2900, kd: 19, cpc: 157, practice_area_slug: "truck-accidents" });
    expect(topics[1].keyword).toBe("lyft accident lawyers");
    expect(topics[2].keyword).toBe("lawyer for uber accident");
    expect(topics[3].practice_area_slug).toBe("car-accidents");
    expect(topics[4].practice_area_slug).toBeUndefined();
  });

  it("parses CSV with quoted cells", () => {
    const csv = `keyword,intent,practice_area,target_url,priority,notes
"neck injury lawyer",informational,car-accidents,/practice-areas/car-accidents,10,"symptom intent, informational"
bad intent kw,weird,,,,`;
    const { topics, errors } = parseTopicsText(csv);
    expect(topics).toHaveLength(2);
    expect(topics[0]).toMatchObject({ keyword: "neck injury lawyer", intent: "informational", priority: 10, notes: "symptom intent, informational" });
    expect(topics[1].intent).toBeUndefined();
    expect(errors[0]).toMatch(/Unknown intent/);
  });

  it("rejects CSV without a keyword column", () => {
    expect(parseTopicsText("a,b\n1,2").errors[0]).toMatch(/keyword/);
  });
});
