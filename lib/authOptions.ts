import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import type { DefaultSession, NextAuthOptions } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: string;
      workspaceId: string;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role, workspaceId: user.workspaceId };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = (user as any).role;
        token.workspaceId = (user as any).workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        if (token.role && token.workspaceId) {
          session.user.role = token.role as string;
          session.user.workspaceId = token.workspaceId as string;
        } else {
          // Fallback to database query only if fields are missing from token
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
          });
          if (dbUser) {
            session.user.role = dbUser.role;
            session.user.workspaceId = dbUser.workspaceId;
          }
        }
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "project-loop-fallback-secret-2026-auth-session-key",
  pages: {
    signIn: "/login",
  },

};
