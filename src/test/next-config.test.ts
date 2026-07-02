import nextConfig from "../../next.config";

describe("next config", () => {
  test("avoids trailing-slash redirects for slashless API endpoints", () => {
    expect(nextConfig.trailingSlash).toBe(true);
    expect(nextConfig.skipTrailingSlashRedirect).toBe(true);
  });
});
