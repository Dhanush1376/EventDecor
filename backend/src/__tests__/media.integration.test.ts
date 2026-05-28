import request from "supertest";
import app from "../app";
import path from "path";
import fs from "fs";

describe("Media Optimization Integration Tests", () => {
  const testImageUrl = "/logo.png";
  const frontendPublicDir = path.resolve(__dirname, "../../../frontend/public");
  const testImagePath = path.join(frontendPublicDir, "logo.png");

  beforeAll(() => {
    // Create a mock logo.png if it doesn't exist during test run
    if (!fs.existsSync(frontendPublicDir)) {
      fs.mkdirSync(frontendPublicDir, { recursive: true });
    }
    if (!fs.existsSync(testImagePath)) {
      // 1x1 transparent PNG pixel base64
      const mockPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      fs.writeFileSync(testImagePath, Buffer.from(mockPngBase64, "base64"));
    }
  });

  it("should fail with 400 when url parameter is missing", async () => {
    const res = await request(app).get("/api/v1/media/optimize");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("URL query parameter is required");
  });

  it("should fail with 403 when directory traversal is attempted", async () => {
    const res = await request(app).get("/api/v1/media/optimize?url=../../package.json");
    expect(res.status).toBe(403);
    expect(res.body.message).toContain("Access denied");
  });

  it("should fail with 404 when the image does not exist", async () => {
    const res = await request(app).get("/api/v1/media/optimize?url=/non-existent-image.jpg");
    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Source image not found");
  });

  it("should successfully optimize, cache, and serve logo.png as webp", async () => {
    const res = await request(app)
      .get(`/api/v1/media/optimize?url=${encodeURIComponent(testImageUrl)}&w=50&h=50&fmt=webp`)
      .responseType("blob");

    expect(res.status).toBe(200);
    expect(res.header["content-type"]).toBe("image/webp");
    expect(res.header["cache-control"]).toContain("public");
    expect(res.header["cache-control"]).toContain("max-age=31536000");
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("should auto-negotiate format to webp or avif when fmt query is missing", async () => {
    const res = await request(app)
      .get(`/api/v1/media/optimize?url=${encodeURIComponent(testImageUrl)}&w=100`)
      .set("Accept", "image/avif,image/webp,image/apng,*/*;q=0.8")
      .responseType("blob");

    expect(res.status).toBe(200);
    // Should be avif because it is first in Accept header
    expect(res.header["content-type"]).toBe("image/avif");
  });
});
