import * as bcrypt from 'bcryptjs';

const ROUNDS = 10;

/** Empreinte fixe pour comparer même si le compte n’existe pas (évite un oracle de temps). */
export const DUMMY_PASSWORD_HASH =
  '$2b$10$u1/7JOG3VIvi/Tl/A9OSL.n1pJ8fAJSh.9QUU5wlMXgdtHth8wmkG';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, passwordHash);
  } catch {
    return false;
  }
}
