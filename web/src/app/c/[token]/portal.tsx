"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { FiadosMark } from "@/components/brand";
import { ConfiguraSupabase } from "@/components/configura";
import { IconCash, IconLink, IconWhatsApp } from "@/components/icons";
import { Avatar, cx, estadoDeCuota, estadoSemaforo, Money, Spinner, StatusTag } from "@/components/ui";
import { detalleCuota, dias, fecha, fechaCorta, hoyISO, metodoLabel, money, primerNombre, waLink } from "@/lib/format";
import { useLoad } from "@/lib/use-load";
import { errMsg, getSupabase, isConfigured } from "@/lib/supabase";
import type { Portal } from "@/lib/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Estado = { tipo: "cargando" } | { tipo: "invalido" } | { tipo: "error"; msg: string } | { tipo: "ok"; data: Portal };

export function PortalCliente() {
  if (!isConfigured()) return <ConfiguraSupabase />;
  return <PortalInner />;
}

function PortalInner() {
  const { token } = useParams<{ token: string }>();
  const valido = UUID.test(token ?? "");
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  const load = useCallback(async () => {
    const { data, error } = await getSupabase().rpc("portal_cliente", { p_token: token });
    if (error) {
      // Un token mal formado o inexistente llega como error de tipo; lo tratamos como enlace no válido.
      if (/uuid|22P02/i.test(error.message + (error.code ?? ""))) return setEstado({ tipo: "invalido" });
      return setEstado({ tipo: "error", msg: errMsg(error) });
    }
    if (!data) return setEstado({ tipo: "invalido" });
    setEstado({ tipo: "ok", data: data as Portal });
  }, [token]);

  useLoad(load, valido);

  if (!valido || estado.tipo === "invalido") return <EnlaceInvalido />;
  if (estado.tipo === "cargando")
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center gap-3 py-32 text-gris">
          <Spinner className="size-6 text-verde" />
          Cargando tu estado de cuenta…
        </div>
      </Shell>
    );
  if (estado.tipo === "error")
    return (
      <Shell>
        <div className="mt-16 rounded-[24px] bg-bad-bg p-6 text-center">
          <p className="font-display text-[18px] font-semibold text-bad">No pudimos cargar tu información</p>
          <p className="mt-1 text-[14px] text-bad">{estado.msg}</p>
          <button
            type="button"
            onClick={() => {
              setEstado({ tipo: "cargando" });
              load();
            }}
            className="press mt-4 h-11 rounded-full bg-white px-5 font-semibold text-tinta"
          >
            Reintentar
          </button>
        </div>
      </Shell>
    );
  return <Vista data={estado.data} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-white">
      <div className="mx-auto w-full max-w-[480px] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">{children}</div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="mt-10 flex items-center justify-center gap-2 text-[12px] text-gris">
      <FiadosMark size={20} />
      <span>
        Hecho con <b className="font-semibold text-tinta">Fiados</b> por Predir
      </span>
    </footer>
  );
}

function EnlaceInvalido() {
  return (
    <Shell>
      <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
        <div className="grid size-20 place-items-center rounded-full bg-suave text-verde">
          <IconLink size={34} />
        </div>
        <h1 className="mt-6 font-display text-[26px] font-semibold tracking-tight">Enlace no válido</h1>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-gris">
          Este enlace ya no funciona o está incompleto. Pide al negocio que te comparta tu código QR nuevamente.
        </p>
        <Footer />
      </div>
    </Shell>
  );
}

function Vista({ data }: { data: Portal }) {
  const { negocio, cliente, resumen, apartados, deudas, pagos } = data;
  const hoy = hoyISO();
  const saldo = Number(resumen?.saldo_total ?? 0);
  const sem = resumen?.semaforo ?? "verde";
  const simbolo = negocio.simbolo || "$";

  return (
    <Shell>
      {/* Negocio */}
      <header className="flex items-center gap-3">
        {negocio.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={negocio.logo_url} alt="" className="size-12 rounded-full bg-papel object-cover" />
        ) : (
          <Avatar name={negocio.nombre} size={48} className="bg-verde" />
        )}
        <div className="min-w-0">
          <div className="text-[13px] text-gris">Estado de cuenta en</div>
          <div className="truncate font-display text-[18px] font-semibold">{negocio.nombre}</div>
        </div>
      </header>

      <h1 className="mt-7 font-display text-[24px] font-semibold tracking-tight">Hola, {primerNombre(cliente.nombres)} 👋</h1>

      {/* Saldo */}
      <section className="mt-4 rounded-[24px] bg-suave p-5" aria-label="Saldo">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] font-medium text-gris">Debes en total</span>
          {saldo > 0 ? <StatusTag estado={estadoSemaforo(sem)} /> : <StatusTag estado="al_dia" label="Sin deuda" />}
        </div>
        <Money value={saldo} splitCents className="mt-1 block text-[44px] leading-tight" />
        {saldo > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[12px] text-gris">Vencido</div>
              <div className={cx("num text-[18px]", Number(resumen?.total_vencido) > 0 ? "text-bad" : "text-tinta")}>
                {money(resumen?.total_vencido, simbolo)}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-[12px] text-gris">{Number(resumen?.dias_mora) > 0 ? "Días de mora" : "Próximo pago"}</div>
              <div className={cx("num text-[18px]", Number(resumen?.dias_mora) > 0 && "text-bad")}>
                {Number(resumen?.dias_mora) > 0
                  ? dias(Number(resumen?.dias_mora))
                  : fechaCorta(resumen?.proximo_vencimiento)}
              </div>
            </div>
          </div>
        )}
        {apartados.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {apartados.map((a) => (
              <span key={a.apartado} className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[13px] font-medium">
                {a.apartado}
                <span className="num ml-1.5">{money(a.saldo, simbolo)}</span>
              </span>
            ))}
          </div>
        )}
      </section>

      {negocio.telefono && (
        <a
          href={waLink(negocio.telefono, `Hola ${negocio.nombre}, soy ${cliente.nombres}. `)}
          target="_blank"
          rel="noopener noreferrer"
          className="press mt-4 flex h-[52px] items-center justify-center gap-2 rounded-full bg-verde font-semibold text-white"
        >
          <IconWhatsApp color="#fff" /> Contactar por WhatsApp
        </a>
      )}

      {/* Deudas */}
      {deudas.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Lo que debes</h2>
          <div className="flex flex-col gap-3">
            {deudas.map((d, i) => (
              <article key={i} className="rounded-[24px] bg-white p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{d.descripcion || "Fiado"}</div>
                    <div className="text-[13px] text-gris">{d.apartado}</div>
                    <div className="text-[13px] text-gris">Desde el {fecha(d.fecha)}</div>
                  </div>
                  <div className="text-right">
                    <Money value={d.saldo} className="block text-[18px]" />
                    <div className="text-[12px] text-gris">de {money(d.monto, simbolo)}</div>
                  </div>
                </div>
                {d.cuotas && d.cuotas.length > 0 && (
                  <ol className="mt-4">
                    {d.cuotas.map((q, k) => (
                      <li key={q.numero} className="relative flex gap-3 pb-3 last:pb-0">
                        {k < (d.cuotas?.length ?? 0) - 1 && (
                          <span aria-hidden className="absolute top-5 bottom-0 left-[9px] w-px bg-borde" />
                        )}
                        <span
                          aria-hidden
                          className={cx(
                            "relative mt-1 size-[19px] shrink-0 rounded-full border-[5px] bg-white",
                            q.estado === "pagada" ? "border-gris/50 bg-gris/50" : "border-borde",
                          )}
                        />
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                          <div>
                            <div className={cx("font-medium tabular-nums", q.estado === "pagada" && "text-gris line-through", q.estado === "vencida" && "text-bad")}>
                              {money(q.monto, simbolo)}
                            </div>
                            {d.cuotas!.length > 1 && (
                              <div className="text-[12px] font-medium text-tinta/80">
                                Cuota {q.numero} de {d.cuotas!.length}
                              </div>
                            )}
                            <div className="text-[12px] text-gris">{detalleCuota(q.estado, q.dias_atraso, q.vence, hoy)}</div>
                          </div>
                          <StatusTag estado={estadoDeCuota(q.estado)} label={q.estado === "vencida" ? "Vencida" : undefined} />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Pagos */}
      <section className="mt-8">
        <h2 className="mb-3 px-1 text-[13px] font-semibold tracking-[.06em] text-gris uppercase">Tus pagos</h2>
        <div className="rounded-[24px] bg-white px-5 py-1 shadow-card">
          {pagos.length === 0 ? (
            <p className="py-6 text-center text-[14px] text-gris">Aún no hay pagos registrados.</p>
          ) : (
            <ul className="divide-y divide-borde">
              {pagos.map((p, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-ok-bg text-ok">
                    <IconCash size={18} />
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{fecha(p.fecha)}</div>
                    <div className="text-[13px] text-gris">{metodoLabel(p.metodo)}</div>
                  </div>
                  <Money value={p.monto} className="text-[16px] text-ok" />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="mt-6 px-2 text-center text-[12px] leading-relaxed text-gris">
        Esta página es solo de consulta. Si ves algún error, comunícate con {negocio.nombre}.
      </p>
      <Footer />
    </Shell>
  );
}
