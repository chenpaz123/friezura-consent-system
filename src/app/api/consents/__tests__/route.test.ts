import { NextRequest } from "next/server";
import { POST } from "../route";
import { supabaseServer } from "@/lib/supabase/server";

jest.mock("@/lib/supabase/server", () => ({
  supabaseServer: {
    from: jest.fn(),
  },
}));

describe("POST /api/consents (Error Paths)", () => {
  const validPayload = {
    customerPhone: "050-1234567",
    fullName: "John Doe",
    dogName: "Rex",
    agreedToTerms: true,
    signatureData: "data:image/png;base64,mock",
    hasMedicalIssue: false,
    hasBehavioralIssue: false,
  };

  const createMockRequest = (body: any) => {
    return new NextRequest("http://localhost/api/consents", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 500 when customer upsert fails", async () => {
    const req = createMockRequest(validPayload);

    // Mock the customer upsert to fail
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "customers") {
        return {
          upsert: jest.fn().mockResolvedValue({ error: { message: "DB Error customers" } }),
        };
      }
      return {};
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB Error customers");
  });

  it("returns 500 when dog insert fails (when no dogId is provided)", async () => {
    const req = createMockRequest(validPayload); // No dogId, so it should try to insert a dog

    // Mock customer success, dog failure
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "customers") {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "dogs") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: { message: "DB Error dogs" } }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB Error dogs");
  });

  it("returns 500 when consent insert fails", async () => {
    // We add a dogId so it skips the dog creation, or we can mock both success.
    // Let's test with dogId provided.
    const payload = { ...validPayload, dogId: "dog-123" };
    const req = createMockRequest(payload);

    // Mock customer success, consent failure
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "customers") {
        return {
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      if (table === "consents") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ error: { message: "DB Error consents" } }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe("DB Error consents");
  });
});
