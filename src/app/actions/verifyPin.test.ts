import { verifyPin } from './verifyPin';

describe('verifyPin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns valid: false when no pin is provided', async () => {
    process.env.ADMIN_PIN = '1234';
    process.env.SUPER_ADMIN_PIN = '5678';

    const result = await verifyPin('');
    expect(result).toEqual({ valid: false, isSuperAdmin: false });
  });

  it('returns valid: true, isSuperAdmin: true when pin matches SUPER_ADMIN_PIN', async () => {
    process.env.ADMIN_PIN = '1234';
    process.env.SUPER_ADMIN_PIN = '5678';

    const result = await verifyPin('5678');
    expect(result).toEqual({ valid: true, isSuperAdmin: true });
  });

  it('returns valid: true, isSuperAdmin: false when pin matches ADMIN_PIN', async () => {
    process.env.ADMIN_PIN = '1234';
    process.env.SUPER_ADMIN_PIN = '5678';

    const result = await verifyPin('1234');
    expect(result).toEqual({ valid: true, isSuperAdmin: false });
  });

  it('returns valid: false, isSuperAdmin: false when pin is incorrect', async () => {
    process.env.ADMIN_PIN = '1234';
    process.env.SUPER_ADMIN_PIN = '5678';

    const result = await verifyPin('9999');
    expect(result).toEqual({ valid: false, isSuperAdmin: false });
  });

  it('returns valid: false when environment variables are missing', async () => {
    delete process.env.ADMIN_PIN;
    delete process.env.SUPER_ADMIN_PIN;

    const result = await verifyPin('1234');
    expect(result).toEqual({ valid: false, isSuperAdmin: false });
  });

  it('gracefully handles missing super admin pin but existing admin pin', async () => {
    process.env.ADMIN_PIN = '1234';
    delete process.env.SUPER_ADMIN_PIN;

    const result = await verifyPin('1234');
    expect(result).toEqual({ valid: true, isSuperAdmin: false });
  });

  it('gracefully handles missing admin pin but existing super admin pin', async () => {
    delete process.env.ADMIN_PIN;
    process.env.SUPER_ADMIN_PIN = '5678';

    const result = await verifyPin('5678');
    expect(result).toEqual({ valid: true, isSuperAdmin: true });
  });
});