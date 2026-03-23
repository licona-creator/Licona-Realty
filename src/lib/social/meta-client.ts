/**
 * Meta (Instagram/Facebook) API Client
 *
 * Handles publishing, scheduling, and analytics for social posts.
 * All posts go through the approval queue before publishing.
 */

const META_GRAPH_API = 'https://graph.facebook.com/v19.0';

interface MetaTokens {
  accessToken: string;
  pageId: string;
  igBusinessAccountId: string;
}

// Content pillars for the 6-pillar strategy
export const CONTENT_PILLARS = {
  market_intelligence: {
    label: 'Market Intelligence',
    description: 'DFW market data, trends, pricing analysis',
    frequency: 'weekly',
    hashtags: ['#DFWRealEstate', '#NorthTexasMarket', '#RealEstateData'],
  },
  client_wins: {
    label: 'Client Wins',
    description: 'Closings, testimonials, milestones',
    frequency: 'bi-weekly',
    hashtags: ['#JustSold', '#JustListed', '#ClientWin', '#LiconaRealty'],
  },
  local_dfw: {
    label: 'Local DFW',
    description: 'Neighborhood spotlights, restaurants, events',
    frequency: 'weekly',
    hashtags: ['#DFWLife', '#NorthTexas', '#DallasLiving', '#FortWorthLife'],
  },
  education: {
    label: 'Education',
    description: 'Home buying tips, market education, investment advice',
    frequency: 'weekly',
    hashtags: ['#HomeBuyingTips', '#RealEstateEducation', '#FirstTimeHomeBuyer'],
  },
  behind_scenes: {
    label: 'Behind the Scenes',
    description: 'Day in the life, process transparency, personal brand',
    frequency: 'weekly',
    hashtags: ['#RealtorLife', '#BehindTheScenes', '#DayInTheLife'],
  },
  personal_brand: {
    label: 'Personal Brand',
    description: 'Anthony\'s story, values, bilingual content',
    frequency: 'bi-weekly',
    hashtags: ['#LiconaRealty', '#BilingualRealtor', '#HabloEspanol'],
  },
} as const;

// Optimal posting times for DFW audience
export const OPTIMAL_POST_TIMES = {
  instagram: {
    weekday: ['07:00', '12:00', '17:30'],
    weekend: ['09:00', '11:00', '16:00'],
  },
  facebook: {
    weekday: ['09:00', '13:00', '16:00'],
    weekend: ['10:00', '12:00'],
  },
};

// Meta Graph API helpers
async function metaFetch(endpoint: string, tokens: MetaTokens, options: RequestInit = {}) {
  const url = `${META_GRAPH_API}${endpoint}`;
  const separator = url.includes('?') ? '&' : '?';
  return fetch(`${url}${separator}access_token=${tokens.accessToken}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

// Publish to Instagram (container + publish flow)
export async function publishToInstagram(
  tokens: MetaTokens,
  imageUrl: string,
  caption: string
) {
  // Step 1: Create media container
  const containerRes = await metaFetch(
    `/${tokens.igBusinessAccountId}/media`,
    tokens,
    {
      method: 'POST',
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
      }),
    }
  );
  const container = await containerRes.json();
  if (!container.id) throw new Error('Failed to create media container');

  // Step 2: Publish
  const publishRes = await metaFetch(
    `/${tokens.igBusinessAccountId}/media_publish`,
    tokens,
    {
      method: 'POST',
      body: JSON.stringify({ creation_id: container.id }),
    }
  );
  return publishRes.json();
}

// Publish to Facebook Page
export async function publishToFacebook(
  tokens: MetaTokens,
  message: string,
  imageUrl?: string
) {
  const endpoint = imageUrl
    ? `/${tokens.pageId}/photos`
    : `/${tokens.pageId}/feed`;

  const body = imageUrl
    ? { url: imageUrl, message }
    : { message };

  const res = await metaFetch(endpoint, tokens, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return res.json();
}

// Get Instagram insights for a post
export async function getPostInsights(
  tokens: MetaTokens,
  mediaId: string
) {
  const metrics = 'impressions,reach,engagement,saved,likes,comments,shares';
  const res = await metaFetch(
    `/${mediaId}/insights?metric=${metrics}`,
    tokens
  );
  return res.json();
}

// Get Instagram account insights
export async function getAccountInsights(
  tokens: MetaTokens,
  period: 'day' | 'week' | 'days_28' = 'days_28'
) {
  const metrics = 'impressions,reach,follower_count,profile_views,website_clicks';
  const res = await metaFetch(
    `/${tokens.igBusinessAccountId}/insights?metric=${metrics}&period=${period}`,
    tokens
  );
  return res.json();
}

// Get recent media for analytics
export async function getRecentMedia(tokens: MetaTokens, limit = 25) {
  const fields = 'id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count';
  const res = await metaFetch(
    `/${tokens.igBusinessAccountId}/media?fields=${fields}&limit=${limit}`,
    tokens
  );
  return res.json();
}

// Generate hashtag set for a content pillar
export function getHashtags(pillar: keyof typeof CONTENT_PILLARS, custom: string[] = []): string[] {
  const base = CONTENT_PILLARS[pillar].hashtags;
  const branded = ['#LiconaRealty', '#AnthonyLicona'];
  return [...new Set([...base, ...branded, ...custom])];
}
