import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState("Doğrulanıyor…");

  useEffect(() => {
    const run = async () => {
      try {
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.substring(1)
          : window.location.hash;
        const params = new URLSearchParams(hash);
        const type = params.get("type");
        const errorDescription = params.get("error_description");

        if (errorDescription) {
          throw new Error(decodeURIComponent(errorDescription));
        }

        // Wait briefly for supabase to process the hash session
        await new Promise((r) => setTimeout(r, 250));
        const { data: { session } } = await supabase.auth.getSession();

        if (type === "recovery") {
          navigate("/force-password-reset", { replace: true });
          return;
        }

        if (session) {
          setStatus("ok");
          setMessage("E-postanız doğrulandı. Yönlendiriliyorsunuz…");
          toast.success("E-posta doğrulandı.");
          setTimeout(() => navigate("/", { replace: true }), 800);
        } else {
          setStatus("ok");
          setMessage("Doğrulama tamam. Giriş ekranına yönlendiriliyorsunuz…");
          setTimeout(() => navigate("/login", { replace: true }), 800);
        }
      } catch (e: any) {
        setStatus("error");
        setMessage(e?.message || "Doğrulama başarısız.");
        toast.error(e?.message || "Doğrulama başarısız.");
      }
    };
    run();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full text-center space-y-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-7">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 border border-primary/30 mx-auto">
          {status === "loading" && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
          {status === "ok" && <ShieldCheck className="w-6 h-6 text-primary" />}
          {status === "error" && <ShieldAlert className="w-6 h-6 text-destructive" />}
        </div>
        <p className="text-foreground">{message}</p>
        {status === "error" && (
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="text-sm text-primary hover:underline"
          >
            Giriş ekranına dön
          </button>
        )}
      </div>
    </div>
  );
}
