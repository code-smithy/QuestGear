import {
  extractImageUrls,
  getItemCoverImageUrl,
  getItemTextDescription,
  splitDescriptionByImageUrls
} from "@/features/items/itemImages";

describe("item image helpers", () => {
  it("extracts jpg and png image links from plain and markdown descriptions", () => {
    expect(
      extractImageUrls(
        "Box photo https://example.com/box.jpg and [tokens](https://cdn.example.com/tokens.png?size=large)"
      )
    ).toEqual(["https://example.com/box.jpg", "https://cdn.example.com/tokens.png?size=large"]);
  });

  it("uses the first description image as fallback cover", () => {
    expect(
      getItemCoverImageUrl({
        coverPhotoUrl: null,
        description: "See https://example.com/main.png and https://example.com/side.jpg"
      })
    ).toBe("https://example.com/main.png");
  });

  it("keeps regular text without image references", () => {
    expect(getItemTextDescription("Alpha https://example.com/main.png Beta")).toBe("Alpha Beta");
  });

  it("splits description content into text and image parts", () => {
    expect(splitDescriptionByImageUrls("Front https://example.com/front.jpg Back")).toEqual([
      { type: "text", value: "Front " },
      { type: "image", value: "https://example.com/front.jpg" },
      { type: "text", value: " Back" }
    ]);
  });
});
