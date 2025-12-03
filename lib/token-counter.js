import { Tiktoken } from "js-tiktoken/lite";

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

loadEncoder();

export async function countTokens(text) {
  const encoder = await loadEncoder();
  if (!encoder) {
    return 0;
  }
  return encoder.encode(text).length;
}
