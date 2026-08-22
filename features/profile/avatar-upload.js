"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useAvatarUpload() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState(null);
  const supabase = createClient();

  const upload = useCallback(
    async (file) => {
      try {
        setUploading(true);

        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        setUrl(publicUrl);
        return { data: publicUrl, error: null };
      } catch (error) {
        return { data: null, error: error.message };
      } finally {
        setUploading(false);
      }
    },
    [supabase]
  );

  return { upload, uploading, url };
}
