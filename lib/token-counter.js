import { Tiktoken } from "js-tiktoken/lite";
import { setImmediate } from "timers/promises";

let encoderPromise = null;

function loadEncoder() {
  if (!encoderPromise) {
    encoderPromise = import("js-tiktoken/ranks/cl100k_base")
      .then((ranks) => {
        return new Tiktoken(ranks.default);
      })
      .catch((e) => {
        console.error(e);
        return null;
      });
  }
  return encoderPromise;
}

// Start loading immediately
loadEncoder();

export async function countTokens(text) {
  const encoder = await loadEncoder();
  if (!encoder) {
    return 0;
  }

  // Chunking strategy to prevent UI freeze on large files
  const CHUNK_SIZE = 1000000; // ~1MB characters per chunk
  let totalTokens = 0;

  if (text.length < CHUNK_SIZE) {
    return encoder.encode(text).length;
  }

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    // Note: Simply slicing string might split a multi-byte character or a token
    // but for estimation purposes on massive repos, the error margin (<10 tokens)
    // is worth the UX benefit of not freezing the terminal.
    totalTokens += encoder.encode(chunk).length;

    // Yield to event loop to let spinner breathe
    await setImmediate();
  }

  return totalTokens;
}
