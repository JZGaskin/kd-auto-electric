/**
 * Mock Google Places API (New) responses for automated tests.
 * Ordinary test runs never call the paid Google API.
 */

export const PLACE_ID = 'ChIJE5eH5pFzNIgR-V3-VYbY-cw';

export function summaryResponse(overrides = {}) {
  return {
    reviewSummary: {
      text: {
        text: 'Customers describe K&D Auto Electric as a locally owned repair shop with fast, honest service. Reviewers frequently mention the team going above and beyond, especially for stranded travelers, and note fair pricing and trustworthy staff.',
        languageCode: 'en',
      },
      disclosureText: { text: 'Summarized with Gemini', languageCode: 'en' },
      reviewsUri: 'https://www.google.com/maps/place/?q=place_id:ChIJE5eH5pFzNIgR-V3-VYbY-cw',
      flagContentUri: 'https://support.google.com/local-listings/flaggedreview?placeid=ChIJE5eH5pFzNIgR-V3-VYbY-cw',
    },
    googleMapsLinks: {
      writeAReviewUri: 'https://www.google.com/maps/review/write?placeid=ChIJE5eH5pFzNIgR-V3-VYbY-cw',
      placeUri: 'https://www.google.com/maps/place/?q=place_id:ChIJE5eH5pFzNIgR-V3-VYbY-cw',
    },
    ...overrides,
  };
}

/** Place that exists but has no reviewSummary (common — not guaranteed). */
export function noSummaryResponse() {
  return {
    googleMapsLinks: {
      writeAReviewUri: 'https://www.google.com/maps/review/write?placeid=ChIJE5eH5pFzNIgR-V3-VYbY-cw',
      placeUri: 'https://www.google.com/maps/place/?q=place_id:ChIJE5eH5pFzNIgR-V3-VYbY-cw',
    },
  };
}

/** Place with no links at all. */
export function bareResponse() {
  return {};
}

/** Google error body — must never reach the browser raw. */
export function googleErrorBody() {
  return { error: { code: 403, message: 'API key not valid. Please pass a valid API key.', status: 'PERMISSION_DENIED' } };
}

export function summaryWithBadLinks(overrides = {}) {
  return summaryResponse({
    reviewSummary: {
      text: { text: 'Some summary text that must not be displayed.', languageCode: 'en' },
      disclosureText: { text: 'Summarized with Gemini', languageCode: 'en' },
      reviewsUri: 'http://evil.example.com/not-google',
      flagContentUri: 'https://evil.example.com/flag',
    },
    googleMapsLinks: { writeAReviewUri: 'javascript:alert(1)' },
    ...overrides,
  });
}
