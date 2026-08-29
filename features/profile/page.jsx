"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "./schemas";
import { getProfile, updateProfile, uploadAvatar, changePassword } from "./actions";
import { useAuth } from "@/features/auth/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState(null);
  const [passwordMessage, setPasswordMessage] = useState(null);

  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: "",
      phone: "",
      avatar_url: "",
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    const loadProfile = async () => {
      const result = await getProfile();
      if (result.data) {
        setProfile(result.data);
        form.reset({
          full_name: result.data.full_name || "",
          phone: result.data.phone || "",
          avatar_url: result.data.avatar_url || "",
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, [form]);

  const onSubmit = async (data) => {
    setSaving(true);
    setMessage(null);

    const result = await updateProfile(data);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: result.success });
      setProfile((prev) => ({ ...prev, ...data }));
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    const result = await uploadAvatar(file);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: result.success });
      setProfile((prev) => ({ ...prev, avatar_url: result.data }));
      form.setValue("avatar_url", result.data);
    }
    setUploadingAvatar(false);
  };

  const onPasswordSubmit = async (data) => {
    setChangingPassword(true);
    setPasswordMessage(null);

    const result = await changePassword(data);

    if (result.error) {
      setPasswordMessage({ type: "error", text: result.error });
    } else {
      setPasswordMessage({ type: "success", text: result.success });
      passwordForm.reset();
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-muted-foreground">
          Administra tu información personal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <Label htmlFor="avatar-upload" className="cursor-pointer">
                <Button variant="outline" size="sm" disabled={uploadingAvatar}>
                  <span>
                    {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
                  </span>
                </Button>
              </Label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG o GIF. Máximo 2MB.
              </p>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-md p-3 text-sm ${
                message.type === "error"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-green-500/15 text-green-700 dark:text-green-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre completo</Label>
                <Input id="full_name" {...form.register("full_name")} />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input value={user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground">
                El correo no se puede cambiar
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar cambios"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          {passwordMessage && (
            <div
              className={`rounded-md p-3 text-sm mb-4 ${
                passwordMessage.type === "error"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-green-500/15 text-green-700 dark:text-green-400"
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register("newPassword")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register("confirmPassword")}
              />
            </div>
            <Button type="submit" variant="outline" disabled={changingPassword}>
              {changingPassword ? "Cambiando..." : "Cambiar contraseña"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
