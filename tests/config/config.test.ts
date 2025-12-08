import { describe, it, expect } from "vitest";
import { DEFAULT_USER_CONFIG, loadConfig } from "../../src/config/index.js";

describe("Config: Defaults", () => {
  it("should have sensible defaults", () => {
    expect(DEFAULT_USER_CONFIG.format).toBe("markdown");
    expect(DEFAULT_USER_CONFIG.useGitIgnore).toBe(true);
    expect(typeof DEFAULT_USER_CONFIG.maxFileSize).toBe("number");
  });

  it("should merge CLI overrides correctly", async () => {
    const overrides = {
      format: "xml" as const,
      verbose: true,
      maxFileSize: 500,
    };

    // Load config from current directory (".") but force overrides
    const config = await loadConfig(".", overrides);

    expect(config.format).toBe("xml");
    expect(config.verbose).toBe(true);
    expect(config.maxFileSize).toBe(500);
  });
});
