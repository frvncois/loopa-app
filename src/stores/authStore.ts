import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/user'

export const useAuthStore = defineStore('auth', () => {
  // ── State ──
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true) // true until initial session check completes
  const profileLoading = ref(false)

  // ── Getters ──
  const isAuthenticated = computed(() => !!session.value)
  const displayName = computed(() => profile.value?.display_name || user.value?.email || '')
  const handle = computed(() => profile.value?.handle || '')
  const avatarUrl = computed(() => profile.value?.avatar_url || null)
  const needsOnboarding = computed(() => profile.value !== null && !profile.value.onboarded)

  // ── Profile ──
  async function fetchProfile(): Promise<void> {
    if (!user.value) { profile.value = null; return }
    profileLoading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.value.id)
        .single()
      if (error) throw error
      profile.value = data as Profile
    } catch (e) {
      console.error('[Loopa] Failed to fetch profile:', e)
      profile.value = null
    } finally {
      profileLoading.value = false
    }
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'display_name' | 'handle' | 'avatar_url' | 'onboarded'>>): Promise<{ error: string | null }> {
    if (!user.value) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.value.id)
    if (error) return { error: error.message }
    if (profile.value) {
      profile.value = { ...profile.value, ...updates }
    }
    return { error: null }
  }

  // ── Auth actions ──
  async function signUpWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInWithEmail(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signInWithGoogle(): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function logout(): Promise<void> {
    await supabase.auth.signOut()
    session.value = null
    user.value = null
    profile.value = null
  }

  // ── Session initialization ──
  // Called once on app start to restore session from Supabase's localStorage persistence.
  async function initialize(): Promise<void> {
    loading.value = true
    try {
      const { data: { session: existingSession } } = await supabase.auth.getSession()
      session.value = existingSession
      user.value = existingSession?.user ?? null
      if (user.value) {
        await fetchProfile()
      }
    } catch (e) {
      console.error('[Loopa] Auth init error:', e)
    } finally {
      loading.value = false
    }

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    supabase.auth.onAuthStateChange(async (event, newSession) => {
      session.value = newSession
      user.value = newSession?.user ?? null
      if (event === 'SIGNED_IN' && user.value) {
        await fetchProfile()
      } else if (event === 'SIGNED_OUT') {
        profile.value = null
      }
    })
  }

  // ── Check handle availability ──
  async function isHandleAvailable(h: string): Promise<boolean> {
    if (!h || h.length < 3) return false
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('handle', h)
      .maybeSingle()
    if (error) return false
    return !data || data.id === user.value?.id
  }

  return {
    // State
    session, user, profile, loading, profileLoading,
    // Getters
    isAuthenticated, displayName, handle, avatarUrl, needsOnboarding,
    // Actions
    initialize,
    signUpWithEmail, signInWithEmail, signInWithGoogle, logout,
    fetchProfile, updateProfile, isHandleAvailable
  }
})
