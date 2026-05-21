"use client";

import { useEffect, useState } from "react";

import { fetchProfileAccess, type ProfileAccess } from "@/lib/access";

export function useProfileAccess() {
  const [access, setAccess] = useState<ProfileAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchProfileAccess().then((data) => {
      if (!mounted) return;

      setAccess(data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { access, loading };
}
