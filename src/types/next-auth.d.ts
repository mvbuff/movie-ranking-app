import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      passwordResetRequired: boolean;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    passwordResetRequired: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    passwordResetRequired: boolean;
  }
} 