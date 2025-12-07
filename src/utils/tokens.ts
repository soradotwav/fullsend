import { Tiktoken } from "js-tiktoken/lite";

let encoderPromise: Promise<Tiktoken | null> | null = null;

/**
 * Loads the encoder
 * @returns The encoder
 */
function loadEncoder() {
  if (!encoderPromise) {
    encoderPromise = import("js-tiktoken/ranks/cl100k_base")
      .then((ranks) => {
        return new Tiktoken(ranks.default);
      })
      .catch((e) => {
        console.error("Failed to load encoder", e);
        return null;
      });
  }

  return encoderPromise;
}

/**
 * Counts the number of tokens in a string
 * @param text The string to count tokens in
 * @returns The number of tokens
 */
export async function countTokens(text: string): Promise<number> {
  const encoder = await loadEncoder();
  if (!encoder) return 0;

  const CHUNK_SIZE = 500000;

  if (text.length < CHUNK_SIZE) {
    return encoder.encode(text).length;
  }

  let totalTokens = 0;

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    // Note: Simply slicing string might split a multi-byte character or a token
    // but for estimation purposes on massive repos, the error margin (<10 tokens)
    // is worth the UX benefit of not freezing the terminal.
    totalTokens += encoder.encode(chunk).length;

    await new Promise((resolve) => setImmediate(resolve));
  }

  return totalTokens;
}
