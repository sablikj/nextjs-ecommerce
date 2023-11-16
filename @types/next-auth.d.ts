import { DefaultSession } from "next-auth";

// Adding a custom ID property to the next-auth session

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
