let timerId = null;
let targetEndTime = 0;

self.onmessage = (event) => {
  const { type, durationSeconds } = event.data;

  if (type === "START") {
    if (timerId) clearInterval(timerId);
    targetEndTime = Date.now() + durationSeconds * 1000;

    timerId = setInterval(() => {
      const remainingMs = targetEndTime - Date.now();
      const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
      self.postMessage({ type: "TICK", remainingSeconds });

      if (remainingSeconds <= 0) {
        clearInterval(timerId);
        timerId = null;
        self.postMessage({ type: "DONE" });
      }
    }, 250);
  }

  if (type === "PAUSE" || type === "RESET") {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  }
};
