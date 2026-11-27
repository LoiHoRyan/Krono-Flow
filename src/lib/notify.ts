export function kfNotify(message: string, tone: "info" | "success" | "warn" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("kronoflow-toast", {
      detail: { message, tone },
    })
  );
}
