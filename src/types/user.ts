export interface Profile {
  id: string
  email: string
  display_name: string
  handle: string
  avatar_url: string | null
  plan: 'free' | 'pro'
  onboarded: boolean
  created_at: string
  updated_at: string
}
