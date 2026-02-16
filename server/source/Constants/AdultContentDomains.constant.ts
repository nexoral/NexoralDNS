/**
 * @fileoverview Predefined list of adult content domains for anti-porn mode
 * @module Constants/AdultContentDomains
 * @description Contains a comprehensive list of adult content domains that will be blocked
 * when anti-porn mode is enabled. This list includes major adult websites and their variations.
 *
 * @author NexoralDNS Team
 * @version 3.3.42-stable
 */

/**
 * Comprehensive list of adult content domains
 * Includes both exact domains and wildcard patterns
 */
export const ADULT_CONTENT_DOMAINS = [
  // Major Adult Content Sites
  { domain: 'pornhub.com', isWildcard: true },
  { domain: 'xvideos.com', isWildcard: true },
  { domain: 'xnxx.com', isWildcard: true },
  { domain: 'xhamster.com', isWildcard: true },
  { domain: 'redtube.com', isWildcard: true },
  { domain: 'youporn.com', isWildcard: true },
  { domain: 'tube8.com', isWildcard: true },
  { domain: 'pornhubpremium.com', isWildcard: true },
  { domain: 'spankbang.com', isWildcard: true },
  { domain: 'eporner.com', isWildcard: true },
  { domain: 'txxx.com', isWildcard: true },
  { domain: 'hclips.com', isWildcard: true },
  { domain: 'porn.com', isWildcard: true },
  { domain: 'pornone.com', isWildcard: true },
  { domain: 'porngo.com', isWildcard: true },
  { domain: 'sunporno.com', isWildcard: true },
  { domain: 'upornia.com', isWildcard: true },
  { domain: 'pornhat.com', isWildcard: true },
  { domain: 'pornerbros.com', isWildcard: true },
  { domain: 'porndig.com', isWildcard: true },
  { domain: 'pornid.xxx', isWildcard: true },
  { domain: 'porn300.com', isWildcard: true },
  { domain: 'freeones.com', isWildcard: true },
  { domain: 'brazzers.com', isWildcard: true },
  { domain: 'naughtyamerica.com', isWildcard: true },
  { domain: 'realitykings.com', isWildcard: true },
  { domain: 'mofos.com', isWildcard: true },
  { domain: 'fakehub.com', isWildcard: true },
  { domain: 'bangbros.com', isWildcard: true },

  // Live Cam Sites
  { domain: 'chaturbate.com', isWildcard: true },
  { domain: 'livejasmin.com', isWildcard: true },
  { domain: 'stripchat.com', isWildcard: true },
  { domain: 'cam4.com', isWildcard: true },
  { domain: 'camsoda.com', isWildcard: true },
  { domain: 'bongacams.com', isWildcard: true },
  { domain: 'myfreecams.com', isWildcard: true },
  { domain: 'flirt4free.com', isWildcard: true },
  { domain: 'imlive.com', isWildcard: true },

  // Image/Gallery Sites
  { domain: 'imagefap.com', isWildcard: true },
  { domain: 'imgur.com', isWildcard: false }, // Only block specific adult sections if needed
  { domain: 'imgbox.com', isWildcard: false },

  // Hentai/Anime Adult Content
  { domain: 'hentai.com', isWildcard: true },
  { domain: 'hentaihaven.org', isWildcard: true },
  { domain: 'nhentai.net', isWildcard: true },
  { domain: 'hanime.tv', isWildcard: true },
  { domain: 'hentaigasm.com', isWildcard: true },

  // Dating/Hookup Sites (commonly adult-oriented)
  { domain: 'adultfriendfinder.com', isWildcard: true },
  { domain: 'ashley-madison.com', isWildcard: true },
  { domain: 'fling.com', isWildcard: true },
  { domain: 'alt.com', isWildcard: true },

  // Content Aggregators
  { domain: 'reddit.com', isWildcard: false }, // Don't block entirely, specific subreddits only
  { domain: 'tumblr.com', isWildcard: false },

  // Additional Popular Sites
  { domain: 'onlyfans.com', isWildcard: true },
  { domain: 'manyvids.com', isWildcard: true },
  { domain: 'clips4sale.com', isWildcard: true },
  { domain: 'iwantclips.com', isWildcard: true },

  // International Sites
  { domain: 'xnxx.tv', isWildcard: true },
  { domain: 'xnxx.net', isWildcard: true },
  { domain: 'beeg.com', isWildcard: true },
  { domain: 'porntrex.com', isWildcard: true },
  { domain: 'tnaflix.com', isWildcard: true },
  { domain: 'empflix.com', isWildcard: true },
  { domain: 'drtuber.com', isWildcard: true },
  { domain: 'keezmovies.com', isWildcard: true },
  { domain: 'extremetube.com', isWildcard: true },

  // Torrent/Download Sites (Adult Content)
  { domain: 'pornbay.org', isWildcard: true },
  { domain: 'torrentz2.eu', isWildcard: false }, // Mixed content

  // Mobile-Specific
  { domain: 'mobile.pornhub.com', isWildcard: false },
  { domain: 'm.xhamster.com', isWildcard: false },

  // CDN and Media Delivery (used by adult sites)
  { domain: 'phncdn.com', isWildcard: true }, // Pornhub CDN
  { domain: 'xhcdn.com', isWildcard: true }, // xHamster CDN
  { domain: 'xvideos-cdn.com', isWildcard: true },
  { domain: 'trafficjunky.net', isWildcard: true }, // Adult ad network
  { domain: 'exoclick.com', isWildcard: true }, // Adult ad network
  { domain: 'juicyads.com', isWildcard: true }, // Adult ad network

  // Commonly misspelled or alternative TLDs
  { domain: 'pornhub.net', isWildcard: true },
  { domain: 'pornhub.org', isWildcard: true },
  { domain: 'xvideos.net', isWildcard: true },
  { domain: 'xvideos.org', isWildcard: true },

  // Additional Sites
  { domain: 'motherless.com', isWildcard: true },
  { domain: 'heavy-r.com', isWildcard: true },
  { domain: 'xbef.com', isWildcard: true },
  { domain: 'vjav.com', isWildcard: true },
  { domain: 'javhd.com', isWildcard: true },
  { domain: '4tube.com', isWildcard: true },
  { domain: 'pornmd.com', isWildcard: true },
  { domain: 'youjizz.com', isWildcard: true },
  { domain: 'tube8.com', isWildcard: true },
  { domain: 'pornhd.com', isWildcard: true },
  { domain: 'xmoviesforyou.com', isWildcard: true },
  { domain: 'tamilsex.com', isWildcard: true },
  { domain: 'desisex.com', isWildcard: true },
];

/**
 * Metadata for the adult content domain group
 */
export const ADULT_CONTENT_GROUP_METADATA = {
  name: 'Adult Content (Anti-Porn)',
  description: 'Comprehensive list of adult content websites automatically managed by NexoralDNS anti-porn mode. This list is regularly updated to include new sites and variations.',
  isSystemGroup: true, // Mark as system-managed group
  category: 'content_filtering',
  lastUpdated: new Date('2025-01-02'),
  version: '1.0.0',
};

/**
 * Get formatted domains for database insertion
 */
export function getFormattedAdultContentDomains(): Array<{ domain: string; isWildcard: boolean }> {
  return ADULT_CONTENT_DOMAINS;
}

/**
 * Get total count of domains in the list
 */
export function getAdultContentDomainsCount(): number {
  return ADULT_CONTENT_DOMAINS.length;
}
