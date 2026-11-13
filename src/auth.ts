import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Comparaison en temps constant compatible Edge Runtime & Node.js
 */
function safeEqualStrings(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "alsek_pulse_dev_secret_key_2026_calade",
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 14, // 14 jours
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Identifiants Administrateur",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const inputEmail = String(credentials?.email ?? "")
          .trim()
          .toLowerCase();
        const inputPassword = String(credentials?.password ?? "");

        const expectedEmail = String(
          process.env.ADMIN_EMAIL || "contact@alsek.fr"
        )
          .trim()
          .toLowerCase();
        const expectedPassword = String(
          process.env.ADMIN_PASSWORD ||
            process.env.ADMIN_INITIAL_PASSWORD ||
            ""
        );

        if (!inputEmail || !inputPassword || !expectedPassword) {
          return null;
        }

        const emailOk = safeEqualStrings(inputEmail, expectedEmail);
        const passwordOk = safeEqualStrings(inputPassword, expectedPassword);

        if (!emailOk || !passwordOk) {
          return null;
        }

        return {
          id: "admin_alsek_pulse",
          name: "Administrateur Alsek Pulse",
          email: expectedEmail,
          role: "SUPER_ADMIN",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = "SUPER_ADMIN";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id || "admin_alsek_pulse");
      }
      return session;
    },
  },
});
