// Google review links for K&D Auto Electric — single, non-secret config location.
//
// These are the verified working URLs returned by Google's own
// googleMapsLinks (captured from the Places API on 2026-08-01 and confirmed
// HTTP 200). The site no longer calls the Places API, so if these URLs ever
// need to change, update them HERE — do not reconstruct or guess new URLs.
export const googleReviewLinks = {
  // Read K&D's reviews on Google (Maps search for the business CID).
  readReviewsUrl:
    'https://maps.google.com/?cid=6714655095466963597&g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYBCAA',
  // Write a Google review for K&D (Maps write-review link).
  writeReviewUrl:
    'https://www.google.com/maps/place//data=!4m3!3m2!1s0x89cadc3a609b3a9b:0x5d2f3f3bca93328d!12e1?g_mp=CiVnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLkdldFBsYWNlEAIYBCAA',
};
