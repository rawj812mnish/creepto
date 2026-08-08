// Very small heuristic phishing checker. Not exhaustive — just flags
// obviously suspicious patterns so the user gets a warning after decrypting.

const URL_REGEX = /\bhttps?:\/\/[^\s"'<>]+/gi;

const SUSPICIOUS_TLDS = [
  "zip", "xyz", "top", "click", "gq", "tk", "ml", "ga", "cf", "work", "loan",
];

const KNOWN_BRANDS = [
  "paypal", "google", "microsoft", "apple", "amazon", "facebook", "instagram",
  "netflix", "bankofamerica", "chase", "wellsfargo", "github",
];

function isRawIp(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function looksLikeTyposquat(host) {
  const domain = host.toLowerCase().split(".")[0];
  return KNOWN_BRANDS.some((brand) => {
    if (domain === brand) return false; // exact match is fine
    // catch common leetspeak / digit substitutions e.g. g00gle, paypa1, micros0ft
    const normalized = domain
      .replace(/0/g, "o")
      .replace(/1/g, "l")
      .replace(/3/g, "e")
      .replace(/5/g, "s")
      .replace(/4/g, "a");
    return normalized === brand && domain !== brand;
  });
}

export function scanTextForSuspiciousUrls(text) {
  const matches = text.match(URL_REGEX) || [];
  const results = [];

  for (const raw of matches) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    const host = url.hostname;
    const flags = [];

    if (isRawIp(host)) flags.push("host is a raw IP address");

    const tld = host.split(".").pop();
    if (SUSPICIOUS_TLDS.includes(tld)) flags.push(`uncommon/high-risk TLD ".${tld}"`);

    if (raw.length > 90) flags.push("unusually long URL");

    if (raw.includes("@")) flags.push('contains "@" which can disguise the real destination');

    if (looksLikeTyposquat(host)) flags.push("looks like a typosquatted brand name");

    if (flags.length > 0) {
      results.push({ url: raw, flags });
    }
  }

  return results;
}
