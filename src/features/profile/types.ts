export type CurrentUserProfile = Readonly<{
  account: Readonly<{
    id: string;
    username: string | null;
    status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
    phone: string;
  }>;
  profile: Readonly<{
    id: string;
    displayName: string | null;
    bio: string | null;
    avatar: string | null;
  }>;
}>;
