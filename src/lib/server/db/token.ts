import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db/prisma';
import { initLogger } from '$lib/config/loggerConfig';
import type { TokenType } from '@prisma/client';

const logger = initLogger('DB/Token');

export function createToken() {
  return crypto.randomBytes(64).toString('base64');
}

export async function upsertToken(
  email: string,
  type: TokenType,
  token: string,
  expiry: Date
): Promise<string | null> {
  try {
    await prisma.token.upsert({
      create: {
        email,
        token,
        type,
        expiresUTC: expiry
      },
      update: {
        expiresUTC: expiry
      },
      where: {
        email_token: {
          email,
          token
        }
      }
    });
    logger.info(type, 'token upserted for', email);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003' &&
      error.meta?.field_name === 'email'
    ) {
      logger.info('attempted to create a token for a nonexistent user, abort');

      return null;
    } else {
      // make sure loggers catch this error if it's one we're not expecting
      throw error;
    }
  }
  return token;
}

export async function validateToken(
  email: string,
  token: string,
  type: TokenType
): Promise<boolean> {
  const res = await prisma.token.findFirst({
    where: {
      email,
      token,
      type
    },
    select: {
      expiresUTC: true
    }
  });

  if (!res) {
    logger.info(type, 'token for', email, 'is invalid as it does not exist');
    return false;
  }

  if (new Date(res.expiresUTC).getTime() < Date.now()) {
    logger.info(type, 'token for', email, 'has expired');
    return false;
  }

  logger.info(type, 'token for', email, 'is valid');
  return true;
}

export async function clearTokensByEmail(email: string, type: TokenType): Promise<void> {
  await prisma.token.deleteMany({
    where: {
      email,
      type
    }
  });
  logger.info(type, 'tokens expired for', email);
}
