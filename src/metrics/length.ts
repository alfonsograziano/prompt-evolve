/**
 * Calculates how closely the length of the candidate text matches the ideal text.
 *
 * This metric is important for evaluating generated text, ensuring that outputs are not excessively verbose or too brief compared to a reference (ideal) text.
 * The function returns a score between 0 and 1:
 *   - 1.0 means the candidate and ideal are the same length.
 *   - The score decreases linearly as the candidate diverges from the ideal, reaching 0 when the candidate is twice as long or zero length.
 *
 * @param candidate - The generated or test string to evaluate.
 * @param ideal - The reference or ideal string to compare against.
 * @returns A number between 0 and 1 representing length adherence.
 */
export function lengthAdherence(candidate: string, ideal: string): number {
  const cLen = candidate.split(/\s+/).length;
  const iLen = ideal.split(/\s+/).length;
  // 1.0 when same length, linearly down to 0 at twice/zero length
  return Math.max(0, 1 - Math.abs(cLen - iLen) / iLen);
}

/**
 * Compares the length of the candidate text to the ideal text and returns a JSON object
 * indicating whether the candidate is shorter, longer, or equal in length, along with the word count and character count differences.
 *
 * @param candidate - The generated or test string to evaluate.
 * @param ideal - The reference or ideal string to compare against.
 * @returns An object with the comparison result, word count difference, and character count difference.
 *   Example: { relation: 'shorter' | 'longer' | 'equal', difference: number, differenceInChars: number }
 */
export function lengthComparison(
  candidate: string,
  ideal: string
): {
  relation: "shorter" | "longer" | "equal";
  difference: number;
  differenceInChars: number;
} {
  const cLen = candidate.split(/\s+/).length;
  const iLen = ideal.split(/\s+/).length;
  const cChars = candidate.length;
  const iChars = ideal.length;
  let relation: "shorter" | "longer" | "equal";
  let difference: number;
  if (cLen < iLen) {
    relation = "shorter";
    difference = iLen - cLen;
  } else if (cLen > iLen) {
    relation = "longer";
    difference = cLen - iLen;
  } else {
    relation = "equal";
    difference = 0;
  }
  return {
    relation,
    difference,
    differenceInChars: Math.abs(cChars - iChars),
  };
}
