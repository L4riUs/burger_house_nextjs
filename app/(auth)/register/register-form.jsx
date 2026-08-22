"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/features/auth/schemas";
import { signUp } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FlameIcon, ArrowRightIcon } from "lucide-react";

export function RegisterForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const result = await signUp(data);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result?.success) {
      setSuccess(result.success);
      setLoading(false);
      return;
    }

    if (result?.redirectTo) {
      router.push(result.redirectTo);
      return;
    }
  };

  return (
    <div className="flex flex-col md:flex-row overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
      {/* Brand / Hero Side */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-zinc-950 p-8 md:w-5/12 lg:p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-orange-600/20 blur-[80px]"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <FlameIcon className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-white uppercase">Burger House</span>
        </div>

        <div className="relative z-10 mt-12 mb-10">
          <h2 className="text-4xl lg:text-5xl font-black uppercase leading-[1.1] tracking-tighter text-white">
            <span className="block">Join the</span>
            <span className="block text-orange-500">Fire.</span>
          </h2>
          <p className="mt-6 text-sm font-medium text-zinc-400 max-w-xs">
            Crea tu cuenta ahora y empieza a disfrutar de la mejor experiencia de hamburguesas a la parrilla de la ciudad.
          </p>
        </div>
        
        <div className="relative z-10 hidden md:block">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <div className="h-px w-8 bg-zinc-700"></div>
            <span>Miembros Exclusivos</span>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-center p-8 md:w-7/12 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Crear cuenta</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Completa tus datos para registrarte.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400 backdrop-blur-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400 backdrop-blur-sm">
                {success}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="full_name"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400"
                >
                  Nombre completo
                </label>
                <Input
                  id="full_name"
                  placeholder="Tu nombre y apellido"
                  className="h-12 border-zinc-800 bg-zinc-950/50 px-4 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 transition-colors rounded-xl"
                  {...form.register("full_name")}
                />
                {form.formState.errors.full_name && (
                  <p className="text-xs font-medium text-red-400">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-bold uppercase tracking-wider text-zinc-400"
                >
                  Correo Electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="h-12 border-zinc-800 bg-zinc-950/50 px-4 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 transition-colors rounded-xl"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-xs font-medium text-red-400">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Contraseña
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 border-zinc-800 bg-zinc-950/50 px-4 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 transition-colors rounded-xl"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password && (
                    <p className="text-xs font-medium text-red-400">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="confirmPassword"
                    className="text-xs font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Confirmar
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    className="h-12 border-zinc-800 bg-zinc-950/50 px-4 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 transition-colors rounded-xl"
                    {...form.register("confirmPassword")}
                  />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-xs font-medium text-red-400">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full h-12 overflow-hidden rounded-xl bg-orange-600 text-white font-bold transition-all hover:bg-orange-500"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center transform-[skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:transform-[skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/20" />
              </div>
              <span className="flex items-center gap-2">
                {loading ? "Registrando..." : "Crear cuenta"}
                {!loading && <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </span>
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500">
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/login"
              className="font-bold text-white transition-colors hover:text-orange-500"
            >
              Inicia sesión aquí
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
