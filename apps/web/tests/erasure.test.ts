import { describe, expect, it } from "vitest"
import { collectErasureKeys } from "../src/server/lib/erasure"

describe("collectErasureKeys", () => {
  it("collects CV uploads plus application CV/cover-letter keys", () => {
    const keys = collectErasureKeys(
      [{ key: "cv/u1/orig.pdf" }],
      [{ cv: "gen/u1/cv.pdf", cl: "gen/u1/cl.pdf" }],
    )
    expect(keys).toEqual(["cv/u1/orig.pdf", "gen/u1/cv.pdf", "gen/u1/cl.pdf"])
  })

  it("drops null keys so erasure never deletes an undefined object", () => {
    const keys = collectErasureKeys(
      [{ key: "cv/u1/orig.pdf" }, { key: null }],
      [
        { cv: null, cl: "gen/u1/cl.pdf" },
        { cv: null, cl: null },
      ],
    )
    expect(keys).toEqual(["cv/u1/orig.pdf", "gen/u1/cl.pdf"])
  })

  it("returns an empty array when the user has no stored objects", () => {
    expect(collectErasureKeys([], [])).toEqual([])
    expect(collectErasureKeys([{ key: null }], [{ cv: null, cl: null }])).toEqual([])
  })
})
