/**
 * @fileoverview Comprehensive Ad Blocking Domains List
 * @module Constants/AdBlockingDomains
 * @description Contains comprehensive list of advertising and tracking domains
 * Based on research from Hagezi, AdGuard, EasyList, and industry data (2026)
 *
 * @author NexoralDNS Team
 * @version 3.3.42-stable
 * @sources
 * - Hagezi DNS Blocklists: https://github.com/hagezi/dns-blocklists
 * - AdGuard DNS Filter: https://github.com/AdguardTeam/AdGuardSDNSFilter
 * - EasyList: https://easylist.to/
 * - Privacy Web Almanac 2025: https://almanac.httparchive.org/en/2025/privacy
 */

/**
 * Comprehensive list of advertising and tracking domains
 * Covers major ad networks, analytics, trackers, and ad CDNs
 *
 * Statistics (2026):
 * - Google Analytics appears on 44% of websites
 * - DoubleClick appears on 32% of websites
 * - Facebook tracking appears on 22% of websites
 * - Ad/tracking traffic comprises ~20% of all web traffic
 */
export const AD_BLOCKING_DOMAINS = [
  // ========================================
  // GOOGLE ADVERTISING & ANALYTICS (Largest ad network globally)
  // ========================================

  // Google Ads / AdSense / DoubleClick
  { domain: 'doubleclick.net', isWildcard: true },
  { domain: 'googleadservices.com', isWildcard: true },
  { domain: 'googlesyndication.com', isWildcard: true },
  { domain: 'googletagservices.com', isWildcard: true },
  { domain: 'google-analytics.com', isWildcard: true },
  { domain: 'googletagmanager.com', isWildcard: true },
  { domain: 'adservice.google.com', isWildcard: false },
  { domain: 'pagead2.googlesyndication.com', isWildcard: false },
  { domain: 'afs.googlesyndication.com', isWildcard: false },
  { domain: 'www.googleadservices.com', isWildcard: false },
  { domain: 'adssettings.google.com', isWildcard: false },
  { domain: 'static.doubleclick.net', isWildcard: false },
  { domain: 'googleads.g.doubleclick.net', isWildcard: false },
  { domain: 'pubads.g.doubleclick.net', isWildcard: false },
  { domain: 'stats.g.doubleclick.net', isWildcard: false },
  { domain: 'ad.doubleclick.net', isWildcard: false },
  { domain: 'cm.g.doubleclick.net', isWildcard: false },
  { domain: 'securepubads.g.doubleclick.net', isWildcard: false },

  // Google Analytics & Tag Manager
  { domain: 'www.google-analytics.com', isWildcard: false },
  { domain: 'ssl.google-analytics.com', isWildcard: false },
  { domain: 'www.googletagmanager.com', isWildcard: false },
  { domain: 'analytics.google.com', isWildcard: false },

  // ========================================
  // FACEBOOK / META ADVERTISING & TRACKING
  // ========================================

  { domain: 'facebook.com', isWildcard: false }, // Specific subdomains only
  { domain: 'connect.facebook.net', isWildcard: false },
  { domain: 'pixel.facebook.com', isWildcard: false },
  { domain: 'an.facebook.com', isWildcard: false },
  { domain: 'analytics.facebook.com', isWildcard: false },
  { domain: 'graph.facebook.com', isWildcard: false },
  { domain: 'b-graph.facebook.com', isWildcard: false },
  { domain: 'edge-chat.facebook.com', isWildcard: false },
  { domain: 'www.facebook.com', isWildcard: false }, // Facebook tracking pixels

  // ========================================
  // MAJOR AD NETWORKS & EXCHANGES
  // ========================================

  // Amazon Advertising
  { domain: 'amazon-adsystem.com', isWildcard: true },
  { domain: 'amazonclix.com', isWildcard: true },
  { domain: 'assoc-amazon.com', isWildcard: true },
  { domain: 'aax-us-east.amazon-adsystem.com', isWildcard: false },

  // Microsoft Advertising (Bing Ads)
  { domain: 'ads.microsoft.com', isWildcard: false },
  { domain: 'bat.bing.com', isWildcard: false },
  { domain: 'flex.msn.com', isWildcard: false },
  { domain: 'ad.atdmt.com', isWildcard: false },
  { domain: 'live.rads.msn.com', isWildcard: false },

  // Yahoo / Verizon Media
  { domain: 'adtech.de', isWildcard: true },
  { domain: 'advertising.com', isWildcard: true },
  { domain: 'yieldmanager.com', isWildcard: true },
  { domain: 'adserver.yahoo.com', isWildcard: false },

  // AppNexus (Xandr)
  { domain: 'adnxs.com', isWildcard: true },
  { domain: 'ib.adnxs.com', isWildcard: false },

  // Criteo
  { domain: 'criteo.com', isWildcard: true },
  { domain: 'static.criteo.net', isWildcard: false },
  { domain: 'dis.criteo.com', isWildcard: false },

  // Outbrain
  { domain: 'outbrain.com', isWildcard: true },
  { domain: 'widgets.outbrain.com', isWildcard: false },
  { domain: 'log.outbrain.com', isWildcard: false },

  // Taboola
  { domain: 'taboola.com', isWildcard: true },
  { domain: 'cdn.taboola.com', isWildcard: false },
  { domain: 'trc.taboola.com', isWildcard: false },

  // OpenX
  { domain: 'openx.net', isWildcard: true },
  { domain: 'servedbyopenx.com', isWildcard: true },

  // Rubicon Project (Magnite)
  { domain: 'rubiconproject.com', isWildcard: true },
  { domain: 'ads.rubiconproject.com', isWildcard: false },

  // Index Exchange
  { domain: 'indexww.com', isWildcard: true },
  { domain: 'casalemedia.com', isWildcard: true },

  // PubMatic
  { domain: 'pubmatic.com', isWildcard: true },
  { domain: 'ads.pubmatic.com', isWildcard: false },

  // The Trade Desk
  { domain: 'adsrvr.org', isWildcard: true },
  { domain: 'adnxs.com', isWildcard: true },

  // Media.net
  { domain: 'media.net', isWildcard: true },
  { domain: 'contextual.media.net', isWildcard: false },

  // ========================================
  // ANALYTICS & TRACKING SERVICES
  // ========================================

  // Adobe Analytics (Omniture)
  { domain: 'omtrdc.net', isWildcard: true },
  { domain: '2o7.net', isWildcard: true },
  { domain: 'demdex.net', isWildcard: true },
  { domain: 'everesttech.net', isWildcard: true },

  // Hotjar
  { domain: 'hotjar.com', isWildcard: true },
  { domain: 'static.hotjar.com', isWildcard: false },

  // Mixpanel
  { domain: 'mixpanel.com', isWildcard: true },
  { domain: 'api.mixpanel.com', isWildcard: false },

  // Segment
  { domain: 'segment.com', isWildcard: true },
  { domain: 'cdn.segment.com', isWildcard: false },

  // Quantcast
  { domain: 'quantserve.com', isWildcard: true },
  { domain: 'quantcast.com', isWildcard: true },

  // Comscore
  { domain: 'comscore.com', isWildcard: true },
  { domain: 'scorecardresearch.com', isWildcard: true },

  // Nielsen
  { domain: 'imrworldwide.com', isWildcard: true },
  { domain: 'nlsn.com', isWildcard: true },

  // Chartbeat
  { domain: 'chartbeat.com', isWildcard: true },
  { domain: 'static.chartbeat.com', isWildcard: false },

  // ========================================
  // SOCIAL MEDIA TRACKING & WIDGETS
  // ========================================

  // Twitter/X Advertising
  { domain: 'ads-twitter.com', isWildcard: true },
  { domain: 'analytics.twitter.com', isWildcard: false },
  { domain: 'static.ads-twitter.com', isWildcard: false },

  // LinkedIn Tracking
  { domain: 'ads.linkedin.com', isWildcard: false },
  { domain: 'px.ads.linkedin.com', isWildcard: false },
  { domain: 'analytics.pointdrive.linkedin.com', isWildcard: false },

  // Pinterest Tracking
  { domain: 'ads.pinterest.com', isWildcard: false },
  { domain: 'ct.pinterest.com', isWildcard: false },
  { domain: 'log.pinterest.com', isWildcard: false },

  // Reddit Tracking
  { domain: 'redd.it', isWildcard: false },
  { domain: 'alb.reddit.com', isWildcard: false },

  // TikTok Pixel
  { domain: 'analytics.tiktok.com', isWildcard: false },
  { domain: 'ads.tiktok.com', isWildcard: false },

  // ========================================
  // MOBILE AD NETWORKS
  // ========================================

  // AdMob (Google)
  { domain: 'admob.com', isWildcard: true },
  { domain: 'app-measurement.com', isWildcard: true },

  // InMobi
  { domain: 'inmobi.com', isWildcard: true },
  { domain: 'w.inmobi.com', isWildcard: false },

  // Unity Ads
  { domain: 'unityads.unity3d.com', isWildcard: false },
  { domain: 'ads.unity3d.com', isWildcard: false },

  // Vungle
  { domain: 'vungle.com', isWildcard: true },
  { domain: 'api.vungle.com', isWildcard: false },

  // IronSource
  { domain: 'ironsrc.com', isWildcard: true },
  { domain: 'outcome-ssp.supersonicads.com', isWildcard: false },

  // ========================================
  // VIDEO AD PLATFORMS
  // ========================================

  // SpotX
  { domain: 'spotxchange.com', isWildcard: true },
  { domain: 'spotx.tv', isWildcard: true },

  // FreeWheel
  { domain: 'fwmrm.net', isWildcard: true },
  { domain: 'scdn.co', isWildcard: false },

  // Brightcove Ads
  { domain: 'brightcove.com', isWildcard: false }, // Partial block
  { domain: 'bcove.me', isWildcard: false },

  // ========================================
  // AD SERVING & CONTENT DELIVERY
  // ========================================

  // AdColony
  { domain: 'adcolony.com', isWildcard: true },
  { domain: 'ads30.adcolony.com', isWildcard: false },

  // Smaato
  { domain: 'smaato.net', isWildcard: true },
  { domain: 'soma.smaato.net', isWildcard: false },

  // MoPub (Twitter)
  { domain: 'mopub.com', isWildcard: true },
  { domain: 'ads.mopub.com', isWildcard: false },

  // Chartboost
  { domain: 'chartboost.com', isWildcard: true },
  { domain: 'live.chartboost.com', isWildcard: false },

  // ========================================
  // RETARGETING & REMARKETING
  // ========================================

  // AdRoll
  { domain: 'adroll.com', isWildcard: true },
  { domain: 'd.adroll.com', isWildcard: false },

  // Perfect Audience
  { domain: 'perfectaudience.com', isWildcard: true },

  // Retargetly
  { domain: 'retargetly.com', isWildcard: true },

  // ========================================
  // AFFILIATE & CONVERSION TRACKING
  // ========================================

  // Commission Junction
  { domain: 'cj.com', isWildcard: false }, // Specific subdomains
  { domain: 'emjcd.com', isWildcard: true },

  // ShareASale
  { domain: 'shareasale.com', isWildcard: true },
  { domain: 'www.shareasale.com', isWildcard: false },

  // Rakuten Advertising
  { domain: 'rakuten.com', isWildcard: false }, // Specific ad domains
  { domain: 'ad.linksynergy.com', isWildcard: false },

  // Impact
  { domain: 'impact-ad.jp', isWildcard: true },
  { domain: 'ojrq.net', isWildcard: true },

  // ========================================
  // POP-UPS & AGGRESSIVE ADS
  // ========================================

  // PopAds
  { domain: 'popads.net', isWildcard: true },

  // PropellerAds
  { domain: 'propellerads.com', isWildcard: true },
  { domain: 'onclickads.net', isWildcard: true },

  // AdCash
  { domain: 'adcash.com', isWildcard: true },

  // PopCash
  { domain: 'popcash.net', isWildcard: true },

  // ========================================
  // CDN & INFRASTRUCTURE (Ad-related)
  // ========================================

  // Ad CDNs
  { domain: 'adnxs.com', isWildcard: true },
  { domain: 'adsafeprotected.com', isWildcard: true },
  { domain: 'advertising.com', isWildcard: true },
  { domain: 'adtechus.com', isWildcard: true },
  { domain: 'advertising.yahoo.com', isWildcard: false },

  // ========================================
  // ADDITIONAL HIGH-TRAFFIC AD DOMAINS
  // ========================================

  // Moat (Oracle)
  { domain: 'moatads.com', isWildcard: true },

  // BidSwitch
  { domain: 'bidswitch.net', isWildcard: true },

  // Smart AdServer
  { domain: 'smartadserver.com', isWildcard: true },

  // Teads
  { domain: 'teads.tv', isWildcard: true },

  // Sizmek
  { domain: 'sizmek.com', isWildcard: true },

  // Flashtalking
  { domain: 'flashtalking.com', isWildcard: true },

  // Improve Digital
  { domain: 'improvedigital.com', isWildcard: true },

  // Triple Lift
  { domain: 'triplelift.com', isWildcard: true },

  // GumGum
  { domain: 'gumgum.com', isWildcard: true },

  // Sovrn
  { domain: 'lijit.com', isWildcard: true },
  { domain: 'sovrn.com', isWildcard: true },
];

/**
 * Metadata for the ad blocking domain group
 */
export const AD_BLOCKING_GROUP_METADATA = {
  name: 'Ads & Trackers (Anti-Ads)',
  description: 'Comprehensive ad blocking and tracking prevention list covering major ad networks, analytics platforms, and tracking services. Based on Hagezi, AdGuard, and EasyList (2026). Blocks ~20% of typical web traffic identified as advertising/tracking.',
  isSystemGroup: true,
  category: 'ad_blocking',
  lastUpdated: new Date('2026-02-16'),
  version: '1.0.0',
  sources: [
    'Hagezi DNS Blocklists',
    'AdGuard DNS Filter',
    'EasyList',
    'Privacy Web Almanac 2025'
  ],
};

/**
 * Get formatted domains for database insertion
 */
export function getFormattedAdBlockingDomains(): Array<{ domain: string; isWildcard: boolean }> {
  return AD_BLOCKING_DOMAINS;
}

/**
 * Get total count of domains in the list
 */
export function getAdBlockingDomainsCount(): number {
  return AD_BLOCKING_DOMAINS.length;
}

/**
 * Get domains by category
 */
export function getAdBlockingDomainsByCategory(category: 'google' | 'facebook' | 'analytics' | 'mobile' | 'video' | 'all'): Array<{ domain: string; isWildcard: boolean }> {
  // This is a simple implementation - could be enhanced with actual categorization
  if (category === 'all') {
    return AD_BLOCKING_DOMAINS;
  }

  // Filter based on domain patterns (simplified)
  return AD_BLOCKING_DOMAINS.filter(item => {
    const domain = item.domain.toLowerCase();
    switch (category) {
      case 'google':
        return domain.includes('google') || domain.includes('doubleclick');
      case 'facebook':
        return domain.includes('facebook');
      case 'analytics':
        return domain.includes('analytics') || domain.includes('tracking');
      case 'mobile':
        return domain.includes('admob') || domain.includes('inmobi') || domain.includes('unity');
      case 'video':
        return domain.includes('spotx') || domain.includes('freewheel') || domain.includes('brightcove');
      default:
        return false;
    }
  });
}
