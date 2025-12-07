import yoctoSpinner, { type Spinner } from "yocto-spinner";
import { colors } from "./colors.js";

export function createSpinner() {
  let spinner: Spinner | null = null;
  let timer: NodeJS.Timeout | null = null;
  let startTime = 0;
  let currentMessage = "";

  const updateText = () => {
    if (!spinner) return;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    spinner.text = `${currentMessage}  ${colors.dim(`${elapsed}s`)}`;
  };

  return {
    start(message: string) {
      if (spinner) return;

      startTime = Date.now();
      currentMessage = message;

      spinner = yoctoSpinner({
        color: "gray",
      });
      spinner.start(message);

      timer = setInterval(updateText, 100);
    },
    update(message: string) {
      currentMessage = message;
      updateText();
    },
    stop() {
      if (!spinner) return;
      if (timer) clearInterval(timer);
      spinner.stop();
      spinner = null;
      timer = null;
    },
    fail(message: string) {
      if (!spinner) return;
      if (timer) clearInterval(timer);
      spinner.error(message);
      spinner = null;
      timer = null;
    },
  };
}
