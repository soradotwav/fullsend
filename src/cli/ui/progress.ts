import yoctoSpinner, { type Spinner } from "yocto-spinner";

export function createSpinner() {
  let spinner: Spinner | null = null;

  return {
    start(message: string) {
      if (spinner) return;

      spinner = yoctoSpinner({
        color: "gray",
      });
      spinner.start(message);
    },
    update(message: string) {
      if (!spinner) return;
      spinner.text = message;
    },
    stop() {
      if (!spinner) return;
      spinner.stop();
      spinner = null;
    },
    fail(message: string) {
      if (!spinner) return;
      spinner.error(message);
      spinner = null;
    },
  };
}
