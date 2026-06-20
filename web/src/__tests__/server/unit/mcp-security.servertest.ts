const mockEnv = vi.hoisted(() => ({
  env: {
    ALETHEIA_MCP_ALLOWED_HOSTS: [] as string[],
    NEXTAUTH_URL: "https://aletheia.example.com",
    NODE_ENV: "production",
  },
}));

vi.mock("@/src/env.mjs", () => mockEnv);

import type { NextApiRequest } from "next";
import { validateMcpRequestSecurity } from "@/src/features/mcp/server/security";

const mockRequest = (headers: NextApiRequest["headers"]): NextApiRequest =>
  ({ headers }) as NextApiRequest;

describe("MCP request security", () => {
  beforeEach(() => {
    mockEnv.env.NEXTAUTH_URL = "https://aletheia.example.com";
    mockEnv.env.NODE_ENV = "production";
    mockEnv.env.ALETHEIA_MCP_ALLOWED_HOSTS = [];
  });

  it("allows an exact additional host from ALETHEIA_MCP_ALLOWED_HOSTS", () => {
    mockEnv.env.ALETHEIA_MCP_ALLOWED_HOSTS = ["internal-aletheia.example.com"];

    expect(
      validateMcpRequestSecurity(
        mockRequest({
          host: "internal-aletheia.example.com",
          origin: "https://internal-aletheia.example.com",
        }),
      ),
    ).toBe("https://internal-aletheia.example.com");
  });

  it("rejects hosts that are not configured exactly", () => {
    mockEnv.env.ALETHEIA_MCP_ALLOWED_HOSTS = [
      "*.example.com",
      "internal-aletheia.example.com/api",
    ];

    expect(() =>
      validateMcpRequestSecurity(mockRequest({ host: "evil.example.com" })),
    ).toThrow("Invalid Host header: evil.example.com");
  });
});
