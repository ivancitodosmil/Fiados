"use client";

import { useCallback, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useNegocio } from "@/lib/session";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase } from "@/lib/supabase";
import type { Apartado } from "@/lib/types";
import { ConfirmDialog, type ConfirmState } from "./confirm";
import { IconEdit, IconFolder, IconPlus, IconTrash } from "./icons";
import { Button, Card, cx, Empty, ErrorBox, Field, IconButton, Input, Loading, Modal } from "./ui";

const COLORES = ["#2F6D5F", "#9FD3C5", "#E8836B", "#D99A00", "#5B7FD6", "#A35BD6", "#D65B8F", "#18282A"];

interface Borrador {
  id?: string;
  nombre: string;
  color: string;
  tasa: string;
}

export function ApartadosManager() {
  const negocio = useNegocio();
  const [lista, setLista] = useState<Apartado[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Borrador | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getSupabase()
      .from("apartados")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("nombre");
    if (error) return setError(errMsg(error));
    setError(null);
    setLista((data ?? []) as Apartado[]);
  }, [negocio.id]);

  useLoad(load);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const nombre = edit.nombre.trim();
    const tasa = edit.tasa.trim() === "" ? 0 : Number(edit.tasa.replace(",", "."));
    if (!nombre) return void toast.error("Escribe el nombre del apartado.");
    if (isNaN(tasa) || tasa < 0 || tasa > 1000) return void toast.error("El interés debe estar entre 0 y 1000 %.");
    setBusy(true);
    const sb = getSupabase();
    const payload = { nombre, color: edit.color, tasa_interes: tasa };
    const { error } = edit.id
      ? await sb.from("apartados").update(payload).eq("id", edit.id)
      : await sb.from("apartados").insert({ ...payload, negocio_id: negocio.id });
    setBusy(false);
    if (error) return void toast.error(errMsg(error));
    toast.success(edit.id ? "Apartado actualizado" : "Apartado creado");
    setEdit(null);
    load();
  }

  function borrar(a: Apartado) {
    setConfirm({
      title: "Eliminar apartado",
      text: `Se eliminará “${a.nombre}”. Los fiados que estaban en este apartado pasarán a “General”.`,
      confirmLabel: "Eliminar",
      danger: true,
      action: async () => {
        const { error } = await getSupabase().from("apartados").delete().eq("id", a.id);
        if (error) return void toast.error(errMsg(error));
        toast.success("Apartado eliminado");
        await load();
      },
    });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <p className="text-[14px] text-gris">
          Separa lo que te deben por tipo (ropa, víveres…) y define un interés por defecto.
        </p>
        <Button size="sm" onClick={() => setEdit({ nombre: "", color: COLORES[0], tasa: "0" })}>
          <IconPlus size={16} /> Nuevo
        </Button>
      </div>
      {error && <ErrorBox message={error} onRetry={load} />}
      <Card className="px-4 py-1">
        {!lista ? (
          <Loading />
        ) : lista.length === 0 ? (
          <Empty
            icon={<IconFolder size={24} />}
            title="Sin apartados"
            text="Todo lo que fíes irá a “General”. Crea apartados si quieres separarlo."
          />
        ) : (
          <ul className="divide-y divide-borde">
            {lista.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                <span className="size-4 shrink-0 rounded-full" style={{ background: a.color || "#E3EAE7" }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{a.nombre}</div>
                  <div className="text-[13px] text-gris">
                    {Number(a.tasa_interes) > 0 ? `${Number(a.tasa_interes)}% de interés` : "Sin interés"}
                  </div>
                </div>
                <IconButton
                  label={`Editar ${a.nombre}`}
                  onClick={() =>
                    setEdit({ id: a.id, nombre: a.nombre, color: a.color || COLORES[0], tasa: String(Number(a.tasa_interes)) })
                  }
                >
                  <IconEdit size={18} />
                </IconButton>
                <IconButton label={`Eliminar ${a.nombre}`} onClick={() => borrar(a)} className="hover:text-bad">
                  <IconTrash size={18} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? "Editar apartado" : "Nuevo apartado"}>
        {edit && (
          <form onSubmit={guardar} className="flex flex-col gap-4" noValidate>
            <Field label="Nombre" htmlFor="ap-nombre">
              <Input
                id="ap-nombre"
                autoFocus
                value={edit.nombre}
                onChange={(e) => setEdit({ ...edit, nombre: e.target.value })}
                placeholder="Ropa"
              />
            </Field>
            <Field label="Interés por defecto (%)" htmlFor="ap-tasa" hint="Se aplica al crear un fiado; puedes cambiarlo en cada fiado.">
              <Input
                id="ap-tasa"
                inputMode="decimal"
                value={edit.tasa}
                onChange={(e) => setEdit({ ...edit, tasa: e.target.value.replace(/[^\d.,]/g, "") })}
              />
            </Field>
            <div>
              <div className="mb-2 px-1 text-[13px] font-medium text-gris">Color</div>
              <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Color">
                {COLORES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={edit.color === c}
                    aria-label={c}
                    onClick={() => setEdit({ ...edit, color: c })}
                    className={cx(
                      "press size-10 rounded-full ring-offset-2 transition-shadow",
                      edit.color === c && "ring-2 ring-tinta",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" size="lg" loading={busy} className="mt-2 w-full">
              {edit.id ? "Guardar cambios" : "Crear apartado"}
            </Button>
          </form>
        )}
      </Modal>
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
    </div>
  );
}
