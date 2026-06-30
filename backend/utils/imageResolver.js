import axios from "axios";

// Standard official portraits for prominent leaders to guarantee high-quality/exact matches.
const OFFICIAL_IMAGE_LOOKUP = {
  "narendra modi": "https://upload.wikimedia.org/wikipedia/commons/8/80/Shri_Narendra_Modi_official_portrait_cropped.jpg",
  "rahul gandhi": "https://upload.wikimedia.org/wikipedia/commons/c/cd/Rahul_Gandhi_2023.jpg",
  "arvind kejriwal": "https://upload.wikimedia.org/wikipedia/commons/d/de/Arvind_Kejriwal_2022.jpg",
  "amit shah": "https://upload.wikimedia.org/wikipedia/commons/f/ff/Amit_Shah_official_portrait.jpg",
  "yogi adityanath": "https://upload.wikimedia.org/wikipedia/commons/4/44/Yogi_Adityanath_Official_Portrait_2017.jpg",
  "naveen patnaik": "https://upload.wikimedia.org/wikipedia/commons/b/b3/Naveen_Patnaik_at_investors_meet.jpg",
  "mamata banerjee": "https://upload.wikimedia.org/wikipedia/commons/e/ee/Mamata_Banerjee_portrait.jpg",
  "akhilesh yadav": "https://upload.wikimedia.org/wikipedia/commons/2/23/Akhilesh_Yadav_at_Investors_Meet.jpg",
};

/**
 * Searches reliable public sources (dictionary & Wikimedia Commons) for an official profile picture.
 * @param {string} name - Name of the creator
 * @returns {Promise<string|null>} Resolved image URL or null
 */
export const resolveOfficialPublicImage = async (name) => {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();

  // 1. Direct match on prominent political figures
  for (const [key, url] of Object.entries(OFFICIAL_IMAGE_LOOKUP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      console.log(`[imageResolver] Found verified official portrait in lookup dictionary for: "${name}" -> ${url}`);
      return url;
    }
  }

  // 2. Fallback: Wikimedia Commons search API with name verification
  try {
    console.log(`[imageResolver] Querying Wikimedia Commons for: "${name}"`);
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=pageimages|imageinfo&generator=search&gsrsearch=${encodeURIComponent(name)}&gsrlimit=3&piprop=thumbnail&pithumbsize=500&iiprop=url&origin=*`;
    
    const response = await axios.get(searchUrl, { timeout: 4000 });
    const data = response.data;
    
    if (data.query && data.query.pages) {
      const pages = Object.values(data.query.pages);
      for (const page of pages) {
        const pageTitle = (page.title || "").toLowerCase();
        // Check if any multi-character part of the searched name is present in the file name/title to verify match
        const parts = normalized.split(" ").filter(part => part.length > 2);
        const matchesName = parts.some(part => pageTitle.includes(part));
        
        if (matchesName) {
          if (page.thumbnail && page.thumbnail.source) {
            console.log(`[imageResolver] Resolved verified Wikimedia Commons image for "${name}": ${page.thumbnail.source}`);
            return page.thumbnail.source;
          }
          if (page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
            console.log(`[imageResolver] Resolved verified Wikimedia Commons URL for "${name}": ${page.imageinfo[0].url}`);
            return page.imageinfo[0].url;
          }
        }
      }
    }
  } catch (error) {
    console.warn(`[imageResolver] Wikimedia Commons API search failed for name "${name}":`, error.message);
  }

  return null;
};
