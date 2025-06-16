import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import { compare } from 'bcrypt';

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        name: { label: "Username", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.name || !credentials.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { name: credentials.name }
        });

        if (!user || !user.password) {
          return null;
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('Your account is pending approval.');
        }

        const isValidPassword = await compare(credentials.password, user.password);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
}; 