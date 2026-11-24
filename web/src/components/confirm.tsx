"use client";

import { useState } from "react";
import { Button, Modal } from "./ui";

export interface ConfirmState {
  title: string;
  text: string;
  confirmLabel: string;
  danger?: boolean;
  action: () => Promise<void>;
}

export function ConfirmDialog({ state, onClose }: { state: ConfirmState | null; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={!!state}
      onClose={() => !busy && onClose()}
      title={state?.title ?? ""}
      footer={
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={state?.danger ? "destructive" : "primary"}
            loading={busy}
            onClick={async () => {
              if (!state) return;
              setBusy(true);
              await state.action();
              setBusy(false);
              onClose();
            }}
          >
            {state?.confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-[15px] leading-relaxed text-gris">{state?.text}</p>
    </Modal>
  );
}
