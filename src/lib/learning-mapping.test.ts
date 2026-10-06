import { describe, expect, it } from "vitest";
import { parseLearningSections } from "./learning-mapping";

describe("parseLearningSections", () => {
    it("keeps well-formed educational sections", () => {
        expect(parseLearningSections({
            sections: [
                { heading: "Use moderate heat", body: "Gentle heat helps aromatics soften without burning." },
            ],
        })).toEqual([
            { heading: "Use moderate heat", body: "Gentle heat helps aromatics soften without burning." },
        ]);
    });

    it("ignores malformed sections without throwing", () => {
        expect(parseLearningSections({ sections: [null, { heading: "Incomplete" }, "text"] })).toEqual([]);
        expect(parseLearningSections(null)).toEqual([]);
    });
});