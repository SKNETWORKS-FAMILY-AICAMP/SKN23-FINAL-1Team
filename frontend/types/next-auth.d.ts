import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      user_id?: number;
      nickname?: string;
      social_type?: string;
      provider_id?: string;
      backend_access_token?: string;
      backend_refresh_token?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user_id?: number;
    nickname?: string;
    social_type?: string;
    provider_id?: string;
    backend_access_token?: string;
    backend_refresh_token?: string;
    image?: string;
  }
}
