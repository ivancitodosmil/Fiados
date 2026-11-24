"use client";

import { useEffect } from "react";

/** Ejecuta una carga asíncrona al montar y cada vez que cambia la función. */
export function useLoad(load: () => Promise<unknown>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load, enabled]);
}
