// Standard English letter frequency table (percentages), used to score
// how "English-like" a candidate decryption is via chi-squared statistic.
export const ENGLISH_FREQ = {
  A: 8.2, B: 1.5, C: 2.8, D: 4.3, E: 12.7, F: 2.2, G: 2.0, H: 6.1, I: 7.0,
  J: 0.15, K: 0.77, L: 4.0, M: 2.4, N: 6.7, O: 7.5, P: 1.9, Q: 0.095,
  R: 6.0, S: 6.3, T: 9.1, U: 2.8, V: 0.98, W: 2.4, X: 0.15, Y: 2.0, Z: 0.074,
};

/** Lower score = more English-like. Only counts A-Z letters, case-insensitive. */
export function chiSquaredScore(text) {
  const counts = {};
  let total = 0;
  for (const ch of text.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") {
      counts[ch] = (counts[ch] || 0) + 1;
      total++;
    }
  }
  if (total === 0) return Infinity;

  let chiSq = 0;
  for (const letter in ENGLISH_FREQ) {
    const observed = counts[letter] || 0;
    const expected = (ENGLISH_FREQ[letter] / 100) * total;
    if (expected > 0) {
      chiSq += Math.pow(observed - expected, 2) / expected;
    }
  }
  return chiSq;
}

/** Fraction of characters that are printable ASCII (space, letters, digits, common punctuation). */
export function printableRatio(text) {
  if (!text.length) return 0;
  let printable = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if ((code >= 32 && code <= 126) || code === 9 || code === 10 || code === 13) {
      printable++;
    }
  }
  return printable / text.length;
}

/** Combined score for ranking XOR/Caesar decryption candidates: chi-squared letter
 *  frequency, plus heavy penalties for non-printable output and for characters that
 *  are neither letters nor spaces (digits/symbols dominate garbage, not real English).
 *  Lower = more likely to be correct English. This combination is what makes the
 *  crackers reliable even on short (~30-40 char) samples, where chi-squared alone
 *  can be fooled by statistical noise. */
export function xorCandidateScore(text) {
  const chi = chiSquaredScore(text);
  const printable = printableRatio(text);
  const printablePenalty = (1 - printable) * 1000;

  let letters = 0, spaces = 0;
  for (const ch of text) {
    if (/[a-zA-Z]/.test(ch)) letters++;
    else if (ch === " ") spaces++;
  }
  const len = text.length || 1;
  const otherRatio = 1 - (letters + spaces) / len;
  const otherPenalty = otherRatio * 400;

  return chi + printablePenalty + otherPenalty;
}

/** Index of Coincidence — measures how "non-random" the letter distribution is.
 *  Real English text: ~0.065-0.07. Random/uniform text: ~0.038. */
export function indexOfCoincidence(text) {
  const counts = {};
  let total = 0;
  for (const ch of text.toUpperCase()) {
    if (ch >= "A" && ch <= "Z") {
      counts[ch] = (counts[ch] || 0) + 1;
      total++;
    }
  }
  if (total < 2) return 0;
  let sum = 0;
  for (const letter in counts) {
    sum += counts[letter] * (counts[letter] - 1);
  }
  return sum / (total * (total - 1));
}
