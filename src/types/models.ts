// src/types/models.ts

// Basic
export type UUID = string;

/** Used by content tables (cards, decks, textbooks, textbook_decks, activities) */
export type Visibility = 'public' | 'logged_in' | 'hidden';

/** Profiles table (aligns to your current columns) */
export interface Profile {
  id: UUID;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;

  // jsonb NOT NULL
  settings: Record<string, any>;

  // Timestamps from DB
  created_at: string;         // ISO string
  updated_at: string | null;  // ISO string or null
  last_seen: string | null;   // ISO string or null

  /** Legacy/optional fields kept for compatibility (safe to remove later) */
  name?: string | null;
  setup_complete?: boolean;   // keep only if you didn't drop the column
}

/** Optional: public view of profiles (if you use public_profiles view) */
export interface PublicProfile {
  id: UUID;
  display_name: string | null;
  avatar_url: string | null;
}

/** user_xp_total (per-user aggregate) */
export interface UserXpTotalRow {
  user_id: UUID;
  xp_total: number;
  updated_at: string; // ISO string
}

/** Optional: staff_roles for admin tooling */
export type StaffRole = 'DEV' | 'ADMIN';
export interface StaffRoleRow {
  user_id: UUID;
  role: StaffRole;
  created_at: string; // ISO string
}
