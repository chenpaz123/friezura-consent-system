import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { deleteConsent } from '../deleteConsent';

const mockEq = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ delete: mockDelete }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

describe('deleteConsent action', () => {
  const mockId = 'test-id';
  const mockSuperAdminPin = '1234';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('SUPER_ADMIN_PIN', mockSuperAdminPin);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it('fails when SUPER_ADMIN_PIN is missing from environment', async () => {
    vi.stubEnv('SUPER_ADMIN_PIN', '');
    const result = await deleteConsent(mockId, mockSuperAdminPin);
    expect(result).toEqual({ success: false, error: "אין הרשאה לפעולה זו." });
  });

  it('fails when the provided pin doesn\'t match SUPER_ADMIN_PIN', async () => {
    const result = await deleteConsent(mockId, '0000');
    expect(result).toEqual({ success: false, error: "אין הרשאה לפעולה זו." });
  });

  it('fails when id is empty/missing', async () => {
    const result = await deleteConsent('', mockSuperAdminPin);
    expect(result).toEqual({ success: false, error: "מזהה רשומה חסר." });
  });

  it('fails when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const result = await deleteConsent(mockId, mockSuperAdminPin);
    expect(result).toEqual({
      success: false,
      error: "חסרה הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת — לא ניתן למחוק רשומות."
    });
  });

  it('fails when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const result = await deleteConsent(mockId, mockSuperAdminPin);
    expect(result).toEqual({
      success: false,
      error: "חסרה הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת — לא ניתן למחוק רשומות."
    });
  });

  it('fails when the Supabase deletion operation returns an error', async () => {
    const errorMessage = 'Supabase error';
    mockEq.mockResolvedValueOnce({ error: { message: errorMessage } });

    const result = await deleteConsent(mockId, mockSuperAdminPin);

    expect(result).toEqual({ success: false, error: errorMessage });
    expect(mockFrom).toHaveBeenCalledWith('consents');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', mockId);
  });

  it('succeeds when all inputs and environment variables are correct and Supabase succeeds', async () => {
    mockEq.mockResolvedValueOnce({ error: null });

    const result = await deleteConsent(mockId, mockSuperAdminPin);

    expect(result).toEqual({ success: true });
    expect(mockFrom).toHaveBeenCalledWith('consents');
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', mockId);
  });
});
