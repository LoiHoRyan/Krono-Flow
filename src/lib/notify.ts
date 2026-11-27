export function kfNotify(message: string, tone: "info" | "success" | "warn" = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("kronoflow-toast", {
      detail: { message, tone },
    })
  );
}

export interface ConfirmDialogDetail {
  kind: "confirm";
  title: string;
  message: string;
  resolve: (ok: boolean) => void;
}

export interface PromptDialogDetail {
  kind: "prompt";
  title: string;
  message: string;
  defaultValue: string;
  resolve: (value: string | null) => void;
}

export type DialogEventDetail = ConfirmDialogDetail | PromptDialogDetail;

export function kfConfirm(message: string, title = "Xác nhận thao tác"): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    const detail: ConfirmDialogDetail = { kind: "confirm", title, message, resolve };
    window.dispatchEvent(new CustomEvent("kronoflow-dialog", { detail }));
  });
}

export function kfPrompt(
  message: string,
  defaultValue = "",
  title = "Nhập thông tin"
): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    const detail: PromptDialogDetail = { kind: "prompt", title, message, defaultValue, resolve };
    window.dispatchEvent(new CustomEvent("kronoflow-dialog", { detail }));
  });
}
