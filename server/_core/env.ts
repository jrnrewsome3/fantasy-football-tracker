export const ENV = {
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** Clerk secret key (server-only) */
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  /** Optional: grant admin role to this Clerk user id */
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  /** OpenAI-compatible API base (default: OpenAI) */
  openaiApiUrl: process.env.OPENAI_API_URL ?? "https://api.openai.com",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};
