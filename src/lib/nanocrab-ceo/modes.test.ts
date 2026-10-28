import { describe, expect, it } from "vitest"

import { DEFAULT_MODE, getModeConfig, MODES, UNIVERSAL_PRINCIPLES } from "./modes"

describe("operating modes", () => {
  it("defaults to AI CEO mode", () => {
    expect(DEFAULT_MODE).toBe("ceo")
  })

  it("has NanoCrab lead in CEO mode and the founder lead in Co-Founder mode", () => {
    expect(getModeConfig("ceo")).toMatchObject({
      planningLead: "nanocrab",
      founderRole: "Founder",
    })
    expect(getModeConfig("cofounder")).toMatchObject({
      planningLead: "founder",
      founderRole: "CEO",
      aiRole: "AI Co-Founder",
    })
  })

  it("keeps the founder in control and forbids income guarantees in every mode", () => {
    const text = UNIVERSAL_PRINCIPLES.join(" ").toLowerCase()
    expect(text).toContain("final decision")
    expect(text).toContain("explicit approval")
    expect(text).toContain("guarantee")
    expect(Object.keys(MODES)).toEqual(["ceo", "cofounder"])
  })
})
