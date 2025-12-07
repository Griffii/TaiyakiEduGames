// src/stores/org.ts
import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/users'

export const useOrgStore = defineStore('org', () => {
  const user = useUserStore()
  const {
    orgCtx, orgSettings,
    orgId, orgRole, orgName, orgSlug,
    themeVars, featureFlags,
    loading: userLoading
  } = storeToRefs(user)

  // Re-expose the actions you already wrote in users.ts so components can call them from org store.
  async function ensureOrgHydrated() {
    await user.ensureIdentityLoaded()
  }
  async function refreshOrgContext() {
    await user.loadOrgContext()
  }
  async function refreshOrgSettings(force = false) {
    await user.loadOrgSettings(force)
  }

  return {
    // state (proxied)
    orgCtx, orgSettings,

    // getters (proxied)
    orgId, orgRole, orgName, orgSlug, themeVars, featureFlags,
    loading: userLoading,

    // actions (proxied)
    ensureOrgHydrated, refreshOrgContext, refreshOrgSettings,
  }
})
