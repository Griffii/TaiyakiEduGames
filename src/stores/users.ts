// src/stores/users.ts
import { defineStore } from 'pinia';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/models';

type SupaSession = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session'] | null;

type OrgRole = 'admin' | 'teacher' | 'student';
type OrgCtx = {
  org_id: string;
  role: OrgRole | null;
  slug?: string | null;
  name?: string | null;
};
type OrgSettings = {
  org_id: string;
  version: number;
  theme: Record<string, any>;
  flags: Record<string, any>;
  org_code?: string | null;
};

const ORG_CTX_KEY = 'org_ctx';
const ORG_SETTINGS_KEY = (orgId: string, v: number) => `org_settings:${orgId}:v${v}`;

function applyThemeVars(vars?: Record<string, string>) {
  if (!vars) return;
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(String(k), String(v)));
}

export const useUserStore = defineStore('user', {
  state: () => ({
    // Auth/session
    session: null as SupaSession,
    sessionLoadedOnce: false,

    // Domain data
    profile: null as Profile | null,

    // UX flags
    loadingAuth: false,
    loadingProfile: false,

    // Error surface for UI
    error: null as string | null,

    // XP slice (per-user total)
    xpTotal: 0,
    xpLoaded: false,

    // Dev flag for UI/feature gates
    isDev: false,

    // -------- ORG (single-org assumption) --------
    orgCtx: null as OrgCtx | null,
    orgSettings: null as OrgSettings | null,
    loadingOrg: false,
  }),

  getters: {
    isAuthenticated: (s) => !!s.session,
    displayName: (s) =>
      (s.profile as any)?.name ||
      (s.profile as any)?.display_name ||
      s.session?.user.user_metadata?.display_name ||
      'Guest',
    userId: (s) => s.profile?.id ?? s.session?.user.id ?? null,
    loading: (s) => s.loadingAuth || s.loadingProfile || s.loadingOrg,
    needsSetup: (s) => !!s.session && !!s.profile && (s.profile as any)?.setup_complete === false,

    // ORG getters
    orgId: (s) => s.orgCtx?.org_id ?? null,
    orgRole: (s) => s.orgCtx?.role ?? null,
    orgName: (s) => s.orgCtx?.name ?? null,
    orgSlug: (s) => s.orgCtx?.slug ?? null,
    themeVars: (s) => (s.orgSettings?.theme?.cssVars ?? {}) as Record<string, string>,
    featureFlags: (s) => (s.orgSettings?.flags ?? {}) as Record<string, any>,
  },

  actions: {
    // -----------------------
    // Dev/staff detection
    // -----------------------
    async checkDevStatus() {
      if (!this.session?.user) { this.isDev = false; return false; }
      try {
        const { data, error } = await supabase.rpc('is_staff');
        this.isDev = !!data && !error;
      } catch {
        this.isDev = false;
      }
      return this.isDev;
    },

    // -----------------------
    // Session / Identity
    // -----------------------
    async refreshSession() {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.warn('supabase.auth.getSession error:', error);
      this.session = data.session ?? null;
      this.sessionLoadedOnce = true;

      if (this.session?.user) {
        await this.checkDevStatus().catch(() => { this.isDev = false; });
      } else {
        this.isDev = false;
      }

      return this.session;
    },

    async ensureIdentityLoaded() {
      if (!this.sessionLoadedOnce) {
        await this.refreshSession();
      }
      if (this.session && !this.profile && !this.loadingProfile) {
        await this.loadProfile();
      }
      // Hydrate org context/settings if not loaded yet
      if (this.session && !this.orgCtx && !this.loadingOrg) {
        await this.afterLoginHydrateOrg();
      }
    },

    // OAuth (kept for future)
    async signInWithGoogle(redirectTo?: string) {
      this.loadingAuth = true;
      try {
        await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
      } finally {
        this.loadingAuth = false;
      }
    },

    /**
     * Email/password sign in.
     * Loads profile, caches isDev, then hydrates org context + settings.
     */
    async signInWithPassword(email: string, password: string) {
      this.error = null;
      this.loadingAuth = true;

      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        await this.refreshSession(); // sets session + isDev
        if (this.session) {
          await this.loadProfile();
          await this.afterLoginHydrateOrg();
        }
      } catch (e: any) {
        this.error = e?.message || 'Invalid email or password';
        throw e;
      } finally {
        this.loadingAuth = false;
      }
    },

    async signOut() {
      await supabase.auth.signOut();
      this.session = null;
      this.profile = null;
      this.error = null;
      this.xpLoaded = false;
      this.xpTotal = 0;
      this.isDev = false;
      // org reset
      this.orgCtx = null;
      this.orgSettings = null;
      localStorage.removeItem(ORG_CTX_KEY);
      // keep versioned org_settings cache; it’s safe to leave or clear selectively if desired
    },

    // -----------------------
    // Profile
    // -----------------------
    async loadProfile() {
      if (!this.session?.user) {
        this.profile = null;
        return;
      }

      this.loadingProfile = true;
      this.error = null;

      try {
        const userId = this.session.user.id;
        const SELECT = 'id, name, display_name, email, avatar_url, setup_complete, settings';

        const { data, error } = await supabase
          .from('profiles')
          .select(SELECT)
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        this.profile = (data as any) ?? null;
      } catch (e: any) {
        console.error('loadProfile:', e);
        this.error = e?.message ?? String(e);
        this.profile = null;
      } finally {
        this.loadingProfile = false;
      }
    },

    async completeFirstRunSetup(params: { name: string; avatarUrl?: string | null }) {
      this.error = null;
      if (!this.session?.user) return false;

      try {
        const userId = this.session.user.id;

        const { error: pErr } = await supabase
          .from('profiles')
          .update({
            name: params.name,
            avatar_url: params.avatarUrl ?? null,
            setup_complete: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (pErr) throw pErr;

        const { error: pubErr } = await supabase
          .from('public_profiles')
          .upsert(
            { user_id: userId, display_name: params.name },
            { onConflict: 'user_id' }
          );

        if (pubErr) throw pubErr;

        await this.loadProfile();
        return true;
      } catch (e: any) {
        this.error = e?.message || 'Failed to save profile';
        return false;
      }
    },

    async saveProfileSetup(params: { displayName: string; avatarUrl?: string | null }) {
      return this.completeFirstRunSetup({ name: params.displayName, avatarUrl: params.avatarUrl ?? null });
    },

    // -----------------------
    // XP
    // -----------------------
    async loadXp(force = false) {
      if (!this.session?.user) {
        this.xpTotal = 0;
        this.xpLoaded = true;
        return;
      }
      if (this.xpLoaded && !force) return;

      try {
        const { data, error } = await supabase
          .from('user_xp_total')
          .select('xp_total')
          .eq('user_id', this.session.user.id)
          .maybeSingle();

        if (error) throw error;

        this.xpTotal = Number((data as any)?.xp_total ?? 0);
      } catch (e) {
        console.warn('loadXp error:', e);
        this.xpTotal = 0;
      } finally {
        this.xpLoaded = true;
      }
    },

    // -----------------------
    // Signup (email confirm flow)
    // -----------------------
    async signUpUser(email: string, password: string, displayName?: string, emailRedirectTo?: string) {
      this.error = null;
      this.loadingAuth = true;
      try {
        const redirect = emailRedirectTo ?? `${window.location.origin}/login?confirmed=1`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName ?? '' },
            emailRedirectTo: redirect,
          },
        });

        if (error) throw error;

        return { ok: true, needsEmailConfirm: true };
      } catch (e: any) {
        this.error = e?.message || 'Sign up failed';
        return { ok: false, needsEmailConfirm: false };
      } finally {
        this.loadingAuth = false;
      }
    },

    // -----------------------
    // ORG (single-org) — context + settings
    // -----------------------
    saveOrgCtx(ctx: OrgCtx | null) {
      this.orgCtx = ctx;
      if (!ctx) localStorage.removeItem(ORG_CTX_KEY);
      else localStorage.setItem(ORG_CTX_KEY, JSON.stringify(ctx));
    },

    saveOrgSettings(s: OrgSettings | null) {
      this.orgSettings = s;
      if (!s) return;
      localStorage.setItem(ORG_SETTINGS_KEY(s.org_id, s.version), JSON.stringify(s));
    },

    hydrateOrgFromLocalStorage() {
      try {
        const raw = localStorage.getItem(ORG_CTX_KEY);
        this.orgCtx = raw ? JSON.parse(raw) : null;
      } catch { this.orgCtx = null; }
      if (!this.orgCtx?.org_id) return;

      // probe cached settings by descending versions 10..1 (simple heuristic)
      for (let v = 10; v >= 1; v--) {
        const k = ORG_SETTINGS_KEY(this.orgCtx.org_id, v);
        const s = localStorage.getItem(k);
        if (s) { try { this.orgSettings = JSON.parse(s); break; } catch { } }
      }
      applyThemeVars(this.orgSettings?.theme?.cssVars);
    },

    /** Get org membership + org identity (single-org assumption: first row). */
    async loadOrgContext() {
      if (!this.session?.user?.id) { this.saveOrgCtx(null); return null; }
      this.loadingOrg = true;
      try {
        // 1) get membership (need role here)
        type MembershipRow = { org_id: string; role: OrgRole | null };
        const { data: mem, error: mErr } = await supabase
          .from('org_memberships')
          .select('org_id, role')
          .eq('user_id', this.session.user.id)
          .limit(1)
          .maybeSingle();

        if (mErr || !mem) { this.saveOrgCtx(null); return null; }

        // 2) read org identity
        let name: string | null = null;
        let slug: string | null = null;

        const { data: org, error: oErr } = await supabase
          .from('orgs')
          .select('name, slug')
          .eq('id', mem.org_id as string)
          .maybeSingle();

        if (!oErr && org) {
          name = (org as any).name ?? null;
          slug = (org as any).slug ?? null;
        }

        const ctx: OrgCtx = {
          org_id: mem.org_id as string,
          role: (mem as MembershipRow).role ?? null,
          name,
          slug,
        };
        this.saveOrgCtx(ctx);
        return ctx;
      } finally {
        this.loadingOrg = false;
      }
    },

    /** Load org settings; uses version to hit local cache when possible. */
    async loadOrgSettings(force = false) {
      if (!this.orgCtx?.org_id) { this.saveOrgSettings(null); return null; }

      // Single query, no maybeSingle() so it returns 200 + [] when empty (not 404)
      const { data, error } = await supabase
        .from('org_settings')
        .select('org_id, version, theme, flags, org_code')
        .eq('org_id', this.orgCtx.org_id)
        .order('version', { ascending: false }) // if you ever version rows
        .limit(1);

      if (error) { this.saveOrgSettings(null); return null; }

      const row = (data && data[0]) || null;
      if (!row) { this.saveOrgSettings(null); return null; }

      const s = {
        org_id: row.org_id as string,
        version: (row.version as number) ?? 1,
        theme: (row.theme as any) ?? {},
        flags: (row.flags as any) ?? {},
        org_code: (row as any)?.org_code ?? null,
      };
      this.saveOrgSettings(s);
      applyThemeVars(s.theme?.cssVars);
      return s;
    },


    /** Call after sign-in or app boot with an existing session. */
    async afterLoginHydrateOrg() {
      this.hydrateOrgFromLocalStorage();
      // If nothing cached OR cached ctx is missing name, re-fetch from DB
      const ctx = (this.orgCtx?.name ? this.orgCtx : await this.loadOrgContext()) ?? null;
      if (!ctx) { this.orgSettings = null; return; }
      await this.loadOrgSettings(false);
    }
  },
});
