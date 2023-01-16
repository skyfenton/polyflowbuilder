// types for all data in the DB

import type { User } from './userDataTypes';

export type DBUserModel = User & {
  id: string; // UUID
  emailValid: 0 | 1;
  password: string;
  createDate: Date | null;
  lastLoginDate: Date | null;
  // for User.data property, JSON is encoded as string in db, but decoded in db hook
};
