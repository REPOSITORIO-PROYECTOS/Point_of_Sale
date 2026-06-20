import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 10;

export async function hashPortalPassword(plainPassword: string): Promise<string> {
  if (!plainPassword.trim()) {
    throw new Error('La contraseña no puede estar vacía');
  }

  return bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
}

export async function verifyPortalPassword(
  plainPassword: string,
  passwordHash: string | undefined,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  return bcrypt.compare(plainPassword, passwordHash);
}
