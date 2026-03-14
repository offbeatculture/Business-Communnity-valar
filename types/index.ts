// =============================================
// Database Table Types
// =============================================

export type Profile = {
  id: string
  user_id: string
  full_name: string
  avatar_url: string | null
  business_name: string | null
  industry: string | null
  city: string | null
  bio: string | null
  gstin: string | null
  role: 'member' | 'admin'
  tagline: string | null
  banner_color: string | null
  created_at: string
  updated_at: string
}

export type Subscription = {
  id: string
  user_id: string
  razorpay_payment_id: string
  razorpay_order_id: string | null
  plan_name: string
  amount_paid: number
  currency: string
  status: 'active' | 'expired' | 'cancelled'
  starts_at: string
  expires_at: string
  created_at: string
}

export type Resource = {
  id: string
  title: string
  description: string | null
  category: string
  type: 'cheat_sheet' | 'template'
  file_url: string | null
  external_url: string | null
  view_count: number
  download_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type VideoSummary = {
  id: string
  title: string
  youtube_url: string
  youtube_video_id: string | null
  category: string
  video_duration_minutes: number | null
  read_time_minutes: number | null
  one_line_takeaway: string | null
  key_points: { point: string; timestamp?: string }[] | null
  action_items: string[] | null
  full_summary: string | null
  view_count: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  user_id: string
  content: string
  category: 'win' | 'question' | 'discussion'
  is_pinned: boolean
  like_count: number
  comment_count: number
  prompt_id?: string | null
  daily_prompts?: { prompt_text: string } | null
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
}

export type Like = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type SavedPost = {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export type Category = {
  id: string
  name: string
  slug: string
  sort_order: number
  created_at: string
}

export type Invoice = {
  id: string
  user_id: string
  subscription_id: string
  invoice_number: string
  invoice_date: string
  customer_name: string
  customer_email: string
  customer_gstin: string | null
  customer_business_name: string | null
  customer_address: string | null
  customer_state: string | null
  description: string
  sac_code: string
  base_amount: number
  tax_rate: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  total_amount: number
  pdf_url: string | null
  created_at: string
}

export type AdminSetting = {
  id: string
  key: string
  value: string
  updated_at: string
}

// =============================================
// Extended Types (with joins)
// =============================================

export type PostWithAuthor = Post & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'avatar_url' | 'business_name'>
}

export type CommentWithAuthor = Comment & {
  profiles: Pick<Profile, 'full_name' | 'avatar_url'>
}

export type PostWithDetails = PostWithAuthor & {
  comments: CommentWithAuthor[]
  user_has_liked: boolean
  user_has_saved: boolean
}

// =============================================
// Resource Documents (multi-document support)
// =============================================

export type ResourceDocument = {
  id: string
  resource_id: string
  label: string
  file_url: string
  sort_order: number
  download_count: number
  created_at: string
}

// =============================================
// Content union type
// =============================================

export type ContentItem =
  | (Resource & { content_type: 'resource'; documents?: ResourceDocument[] })
  | (VideoSummary & { content_type: 'video_summary' })

// =============================================
// API Request/Response Types
// =============================================

export type CreateOrderRequest = {
  plan_id: string
  email: string
  name: string
}

export type CreateOrderResponse = {
  order_id: string
  amount: number
  currency: string
  key_id: string
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number
  page: number
  per_page: number
  has_more: boolean
}

// =============================================
// Plan Configuration Type
// =============================================

export type Plan = {
  id: string
  name: string
  duration_days: number
  price: number // in paise
  description: string
  features: string[]
}

// =============================================
// Industry options
// =============================================

export const INDUSTRIES = [
  'Manufacturing',
  'Services',
  'D2C/E-commerce',
  'Retail',
  'Food & Beverage',
  'IT/Tech',
  'Education',
  'Healthcare',
  'Other',
] as const

export type Industry = (typeof INDUSTRIES)[number]

// =============================================
// Profile & Admin Extended Types
// =============================================

export type ProfileWithSubscription = Profile & {
  subscription_status: 'active' | 'expired' | 'none'
  subscription_expires_at: string | null
}

export type AdminStats = {
  totalMembers: number
  activeSubscriptions: number
  postsThisMonth: number
  newMembersThisMonth: number
}

export type ProfileStats = {
  postCount: number
  commentCount: number
  likesReceived: number
}

// =============================================
// Engagement System Types
// =============================================

export type MemberLevel = {
  id: string
  user_id: string
  total_gp: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_visit_date: string | null
  grace_used_at: string | null
  created_at: string
  updated_at: string
}

export type EngagementLogEntry = {
  id: string
  user_id: string
  action: string
  gp_earned: number
  reference_id: string | null
  earned_date: string
  created_at: string
}

export type DailyPrompt = {
  id: string
  prompt_text: string
  category: 'reflection' | 'challenge' | 'number' | 'advice' | 'wins'
  scheduled_date: string
  is_active: boolean
  created_by: string | null
  created_at: string
}

export type WeeklyHighlightMember = {
  user_id: string
  full_name: string
  avatar_url: string | null
}

export type WeeklyHighlights = {
  most_helpful: (WeeklyHighlightMember & { total_likes_gp: number })[]
  top_responders: (WeeklyHighlightMember & { prompt_count: number })[]
  rising_star: (WeeklyHighlightMember & { total_gp: number }) | null
}

export type AwardPointsResult = {
  gp_earned: number
  total_gp: number
  new_level: number
  capped: boolean
}

export type RecordVisitResult = {
  already_visited: boolean
  current_streak: number
  streak_broken?: boolean
  grace_used?: boolean
  streak_bonus?: number
  total_gp: number
}
