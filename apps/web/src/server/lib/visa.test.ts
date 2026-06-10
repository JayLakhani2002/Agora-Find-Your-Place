import { describe, expect, it } from "vitest"
import { weeklyHoursForVisa } from "./visa"

describe("weeklyHoursForVisa", () => {
  it("caps student-type visas at 20h/week (legal limit)", () => {
    expect(weeklyHoursForVisa("student_visa_16b")).toBe(20)
    expect(weeklyHoursForVisa("chancenkarte_20a")).toBe(20)
    expect(weeklyHoursForVisa("near_graduation")).toBe(20)
  })

  it("allows 40h/week for EU citizens and Blue Card holders", () => {
    expect(weeklyHoursForVisa("eu_citizen")).toBe(40)
    expect(weeklyHoursForVisa("blue_card")).toBe(40)
  })

  it("defaults to the conservative 20h cap for any unknown visa type", () => {
    expect(weeklyHoursForVisa("something_unexpected")).toBe(20)
    expect(weeklyHoursForVisa("")).toBe(20)
  })
})
