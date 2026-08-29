"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/features/auth/schemas";
import { signIn } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, FlameIcon } from "lucide-react";

export function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    const result = await signIn(data);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(result?.redirectTo ?? "/");
  };

  return (
    <div className="flex flex-col md:flex-row overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl backdrop-blur-xl">
      {/* Brand / Hero Side */}
      <div className="relative flex flex-col justify-between overflow-hidden bg-zinc-950 p-8 md:w-5/12 lg:p-12">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-[80px]"></div>
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-500/30">
            <FlameIcon className="h-6 w-6" />
          </div>
          <span className="text-xl font-black tracking-tight text-white uppercase">Burger House</span>
        </div>

        <div className="relative z-10 mt-20 mb-10">
          <h2 className="text-4xl lg:text-5xl font-black uppercase leading-[1.1] tracking-tighter text-white">
            <span className="block text-orange-500">Ignite</span>
            <span className="block">Your</span>
            <span className="block">Cravings.</span>
          </h2>
          <p className="mt-6 text-sm font-medium text-zinc-400 max-w-xs">
            Accede a tu cuenta para gestionar tus órdenes, beneficios y el verdadero sabor a la parrilla.
          </p>
        </div>
        
        <div className="relative z-10 hidden md:block">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <div className="h-px w-8 bg-zinc-700"></div>
            <span>Staff & Admin Portal</span>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex flex-col justify-center p-8 md:w-7/12 lg:p-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido de vuelta</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-400 backdrop-blur-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-bold uppercase tracking-wider text-zinc-400"
                  >
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-orange-500 hover:text-orange-400 transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-12 border-zinc-800 bg-zinc-950/50 px-4 pr-12 text-white placeholder:text-zinc-600 focus-visible:border-orange-500 focus-visible:ring-1 focus-visible:ring-orange-500 transition-colors rounded-xl"
                    {...form.register("password")}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs font-medium text-red-400">
                    {form.formState.errors.password.message}
                  </p>
                )}
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
                {loading ? "Procesando..." : "Ingresar"}
                {!loading && <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </span>
            </Button>
          </form>

          <div className="mt-8 text-center text-sm text-zinc-500">
            ¿No tienes una cuenta?{" "}
            <Link
              href="/register"
              className="font-bold text-white transition-colors hover:text-orange-500"
            >
              Regístrate ahora
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
