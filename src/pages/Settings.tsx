import { useState, useRef, useEffect, useCallback } from "react";
import { User, Bell, Lock, Palette, Check, Moon, Sun, Camera, Building, Star, CreditCard, Loader2, Mail, Landmark, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TwoFactorSetup } from "@/components/settings/TwoFactorSetup";
import { THEME_PALETTES, applyThemeColor, loadStoredTheme, type ThemeKey } from "@/lib/theme";

const settingsSections = [
  { id: "profile", label: "Profil", icon: User },
  { id: "branding", label: "Marka Kimliği", icon: Building },
  { id: "subscription", label: "Abonelik & Ödeme Bilgisi", icon: CreditCard },
  { id: "notifications", label: "Bildirimler", icon: Bell },
  { id: "security", label: "Güvenlik", icon: Lock },
  { id: "appearance", label: "Görünüm", icon: Palette },
];

const accentColors = (Object.entries(THEME_PALETTES) as [ThemeKey, typeof THEME_PALETTES[ThemeKey]][]).map(
  ([value, p]) => ({ value, name: p.name, hsl: p.hsl })
);

const subscriptionPlans = [
  {
    name: "Free",
    price: "₺0",
    period: "aylık",
    features: ["5 sporcu", "Temel raporlar", "E-posta desteği"],
  },
  {
    name: "Pro",
    price: "₺499",
    period: "aylık",
    features: ["25 sporcu", "Gelişmiş analitik", "WhatsApp entegrasyonu", "Özel raporlar"],
  },
  {
    name: "Elite",
    price: "₺999",
    period: "aylık",
    features: ["Sınırsız sporcu", "AI analiz", "API erişimi", "Öncelikli destek", "Beyaz etiket"],
  }
];

const formatIbanInput = (value: string): string => {
  // Strip everything non-alphanumeric, force uppercase, cap at 26
  let cleaned = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 26);
  // Lock TR prefix: positions 0-1 must always be "TR"; the rest must be digits
  if (cleaned.length === 0) return "TR";
  if (cleaned.length === 1) return "TR";
  // Drop user-typed prefix if not TR, then only allow digits after position 2
  const rest = cleaned.slice(2).replace(/\D/g, "");
  const normalized = ("TR" + rest).slice(0, 26);
  return normalized.replace(/(.{4})(?=.)/g, "$1 ");
};


const validateTRIban = (rawIban: string): boolean => {
  const cleaned = rawIban.replace(/\s/g, "").toUpperCase();
  if (cleaned.length !== 26) return false;
  if (!/^TR[0-9]{24}$/.test(cleaned)) return false;

  // ISO 7064 MOD 97-10
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let numeric = "";
  for (const char of rearranged) {
    if (/[0-9]/.test(char)) {
      numeric += char;
    } else {
      numeric += (char.charCodeAt(0) - 55).toString();
    }
  }

  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = remainder.toString() + numeric.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder === 1;
};

export default function Settings() {
  const { profile, user, refreshProfile, isSubCoach } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState("profile");
  const [selectedColor, setSelectedColor] = useState("lime");
  const [darkMode, setDarkMode] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [iban, setIban] = useState<string>("");
  const [ibanError, setIbanError] = useState<string>("");
  const [isSavingIban, setIsSavingIban] = useState(false);
  const [ibanShake, setIbanShake] = useState(false);

  // Username states
  const [username, setUsername] = useState(profile?.username || "");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  const isUsernameValid = /^[a-z0-9]+$/.test(username) && username.length >= 3 && username.length <= 20;

  const checkUsernameAvailability = useCallback(async (value: string) => {
    if (!/^[a-z0-9]+$/.test(value) || value.length < 3 || !user) {
      setIsUsernameAvailable(null);
      return;
    }
    setIsCheckingUsername(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value)
      .neq("id", user.id)
      .maybeSingle();
    setIsUsernameAvailable(!data);
    setIsCheckingUsername(false);
  }, [user]);

  useEffect(() => {
    if (!isUsernameValid || username === (profile?.username || "")) {
      setIsUsernameAvailable(null);
      return;
    }
    const t = setTimeout(() => checkUsernameAvailability(username), 400);
    return () => clearTimeout(t);
  }, [username, isUsernameValid, checkUsernameAvailability, profile?.username]);

  // Form states
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    gymName: profile?.gym_name || "",
    specialty: profile?.specialty || "",
    email: profile?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    push: true,
    alerts: true,
  });

  // Sync form state when profile loads/changes
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || "",
        gymName: profile.gym_name || "",
        specialty: profile.specialty || "",
        email: profile.email || "",
      }));
      setUsername(profile.username || "");
      setIban(formatIbanInput(((profile as any).iban as string) || ""));
      setWhatsappEnabled(Boolean((profile as any).whatsapp_notifications_enabled));
      const ns = (profile as any).notification_settings ?? profile.notification_preferences;
      if (ns && typeof ns === 'object') {
        setNotificationPrefs({
          email: (ns as any).email ?? true,
          push: (ns as any).push ?? true,
          alerts: (ns as any).alerts ?? true,
        });
      }
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase.rpc('update_own_profile', {
        _full_name: formData.fullName,
        _gym_name: formData.gymName,
        _specialty: formData.specialty,
        _notification_preferences: notificationPrefs,
        _notification_settings: notificationPrefs,
        _whatsapp_notifications_enabled: whatsappEnabled,
      } as any);

      if (error) throw error;

      // Update username separately if changed
      const usernameChanged = username !== (profile.username || "");
      if (usernameChanged && !isSubCoach && isUsernameValid) {
        const { error: usernameError } = await supabase
          .from("profiles")
          .update({ username } as any)
          .eq("id", user.id);
        if (usernameError) {
          if (usernameError.code === "23505") {
            toast.error("Bu kullanıcı adı zaten alınmış. Lütfen başka bir tane deneyin.");
          } else {
            toast.error("Kullanıcı adı güncellenirken hata: " + usernameError.message);
          }
          setIsSaving(false);
          return;
        }
      }

      await refreshProfile();
      
      toast.success("Ayarlar başarıyla güncellendi! 🛠️");
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error("Profil güncellenirken bir hata oluştu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    setIsUploadingAvatar(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile via secure RPC
      const { error: updateError } = await supabase.rpc('update_own_profile', {
        _avatar_url: publicUrl
      });

      if (updateError) throw updateError;

      await refreshProfile();

      toast.success("Avatar başarıyla güncellendi! 📸");
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error("Avatar yüklenirken bir hata oluştu.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalı.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;

      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      
      toast.success("Şifre başarıyla değiştirildi! 🔒");
    } catch (error) {
      console.error('Password update error:', error);
      toast.error("Şifre güncellenirken bir hata oluştu.");
    }
  };

  const handleSaveIban = async () => {
    if (!user) return;
    const stripped = iban.replace(/\s/g, "");
    if (!validateTRIban(stripped)) {
      setIbanError("Lütfen geçerli bir Türkiye IBAN adresi giriniz.");
      toast.error("Geçersiz IBAN adresi.");
      return;
    }
    setIbanError("");
    setIsSavingIban(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ iban: stripped || null } as any)
        .eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("IBAN bilginiz başarıyla güncellendi.");
    } catch (err) {
      console.error("IBAN update error:", err);
      toast.error("Güncelleme başarısız oldu.");
    } finally {
      setIsSavingIban(false);
    }
  };




  const handleUpgradeSubscription = (planName: string) => {
    toast.info(`${planName} planına yükseltme özelliği yakında aktif olacak.`);
  };

  const currentTier = profile?.subscription_tier || "Free";

  if (!profile) {
    return <div className="flex items-center justify-center h-96">Profil yükleniyor...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Ayarlar</h1>
        <p className="text-muted-foreground mt-1">Hesabınızı ve tercihlerinizi yönetin</p>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="glass rounded-xl border border-border p-2 h-fit">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all",
                  activeSection === section.id
                    ? "bg-primary/10 text-primary border border-primary/20 glow-lime"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Section */}
          {activeSection === "profile" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Profil Ayarları</h2>

              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-muted overflow-hidden border-2 border-border">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Profil Fotoğrafı</h3>
                    <p className="text-sm text-muted-foreground">JPG, PNG formatında, max 2MB</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ad Soyad</label>
                    <Input
                      value={formData.fullName}
                      onChange={(e) => handleInputChange("fullName", e.target.value)}
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">E-posta</label>
                    <Input
                      value={formData.email}
                      disabled
                      className="bg-muted border-border text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Username / Kurumsal E-posta */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Kullanıcı Adı</label>
                  <div className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-2">
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9.]/g, ""))}
                      placeholder="kullaniciadi"
                      className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                      maxLength={20}
                      disabled={isSubCoach}
                    />
                    <span className="text-muted-foreground text-sm whitespace-nowrap">@dynabolic.co</span>
                  </div>
                  {isSubCoach ? (
                    <p className="text-xs text-muted-foreground">Alt koç kullanıcı adları yalnızca Baş Antrenör tarafından değiştirilebilir.</p>
                  ) : (
                    <div className="h-5 text-xs">
                      {isCheckingUsername && <span className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Kontrol ediliyor...</span>}
                      {!isCheckingUsername && isUsernameAvailable === true && <span className="text-success flex items-center gap-1"><Check className="h-3 w-3" /> Kullanılabilir</span>}
                      {!isCheckingUsername && isUsernameAvailable === false && <span className="text-destructive">Bu kullanıcı adı zaten alınmış</span>}
                      {!isCheckingUsername && isUsernameAvailable === null && username.length > 0 && username.length < 3 && <span className="text-muted-foreground">En az 3 karakter gerekli</span>}
                      {username && isUsernameValid && (isUsernameAvailable === true || username === (profile?.username || "")) && (
                        <span className="text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> E-posta adresiniz: {username}@dynabolic.co</span>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}




          {/* Branding Section */}
          {activeSection === "branding" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Marka Kimliği</h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">İşletme/Salon Adı</label>
                  <Input
                    value={formData.gymName}
                    onChange={(e) => handleInputChange("gymName", e.target.value)}
                    placeholder="Dynabolic Atletizm"
                    className="bg-card border-border focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Uzmanlık Alanı</label>
                  <Input
                    value={formData.specialty}
                    onChange={(e) => handleInputChange("specialty", e.target.value)}
                    placeholder="Fitness, Bodybuilding, Powerlifting..."
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subscription Section */}
          {activeSection === "subscription" && (
            <div className="space-y-6">
              <div className="glass rounded-xl border border-border p-6">
                <h2 className="text-xl font-semibold text-foreground mb-2">Abonelik & Planlar</h2>
                <p className="text-muted-foreground mb-6">
                  Mevcut plan: <span className="font-semibold text-primary">{profile.subscription_tier}</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {subscriptionPlans.map((plan) => {
                    const isCurrent = plan.name === currentTier;
                    return (
                    <div
                      key={plan.name}
                      className={cn(
                        "relative p-6 rounded-xl border transition-all",
                        isCurrent
                          ? "border-primary bg-primary/5 glow-lime"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      {isCurrent && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                            Mevcut Plan
                          </span>
                        </div>
                      )}
                      
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                        <div className="text-2xl font-bold text-foreground mt-2">
                          {plan.price}<span className="text-sm text-muted-foreground">/{plan.period}</span>
                        </div>
                      </div>

                      <ul className="space-y-2 mb-6">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-success" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={cn(
                          "w-full",
                          isCurrent
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        disabled={isCurrent}
                        onClick={() => handleUpgradeSubscription(plan.name)}
                      >
                        {isCurrent ? "Aktif Plan" : "Yükselt"}
                      </Button>
                    </div>
                  );
                  })}
                </div>
              </div>

              <div className="glass rounded-xl border border-border p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Landmark className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold text-foreground">Banka ve Hakediş Bilgileri</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  Hakedişlerinizin yatırılacağı IBAN adresini buradan yönetebilirsiniz.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="iban-input" className="text-sm font-medium text-foreground">
                      Geçerli IBAN Adresi
                    </Label>
                    <Input
                      id="iban-input"
                      placeholder="TR76 0000 0000 0000 0000 0000 00"
                      value={iban}
                      onFocus={() => {
                        if (!iban) setIban("TR");
                      }}
                      onKeyDown={(e) => {
                        // Allow navigation / editing keys
                        const allowedKeys = [
                          "Backspace", "Delete", "ArrowLeft", "ArrowRight",
                          "ArrowUp", "ArrowDown", "Tab", "Home", "End", "Enter",
                        ];
                        if (allowedKeys.includes(e.key)) return;
                        if (e.ctrlKey || e.metaKey) return;
                        // After "TR" prefix, only digits accepted
                        const stripped = iban.replace(/\s/g, "");
                        if (stripped.length >= 2 && !/^[0-9]$/.test(e.key)) {
                          e.preventDefault();
                          setIbanError("Lütfen geçerli bir IBAN bilgisi girin.");
                          setIbanShake(true);
                          window.setTimeout(() => setIbanShake(false), 450);
                        }
                      }}
                      onChange={(e) => {
                        const formatted = formatIbanInput(e.target.value);
                        setIban(formatted);
                        const stripped = formatted.replace(/\s/g, "");
                        if (stripped.length <= 2) {
                          setIbanError("");
                        } else if (stripped.length < 26) {
                          // Typing valid digits — clear error
                          if (ibanError) setIbanError("");
                        } else if (stripped.length === 26) {
                          setIbanError(validateTRIban(stripped) ? "" : "Lütfen geçerli bir IBAN bilgisi girin.");
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const text = e.clipboardData.getData("text") || "";
                        const formatted = formatIbanInput(text);
                        setIban(formatted);
                        const stripped = formatted.replace(/\s/g, "");
                        if (stripped.length === 26 && !validateTRIban(stripped)) {
                          setIbanError("Lütfen geçerli bir IBAN bilgisi girin.");
                          setIbanShake(true);
                          window.setTimeout(() => setIbanShake(false), 450);
                        } else {
                          setIbanError("");
                        }
                      }}
                      onBlur={() => {
                        const stripped = iban.replace(/\s/g, "");
                        if (stripped === "TR" || stripped.length === 0) {
                          setIbanError("");
                          if (stripped.length === 0) return;
                          return;
                        }
                        if (!validateTRIban(stripped)) {
                          setIbanError("Lütfen geçerli bir IBAN bilgisi girin.");
                        } else {
                          setIbanError("");
                        }
                      }}
                      inputMode="numeric"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={32}
                      className={cn(
                        "font-mono tracking-widest bg-card focus:border-primary",
                        ibanShake && "animate-shake",
                        ibanError
                          ? "border-destructive focus-visible:ring-destructive"
                          : "border-border"
                      )}
                    />
                    {ibanError ? (
                      <p className="text-xs text-destructive">{ibanError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        IBAN bilgileriniz yalnızca hakediş transferleri için kullanılır.
                      </p>
                    )}

                  </div>

                  <Button
                    onClick={handleSaveIban}
                    disabled={isSavingIban || iban.replace(/\s/g, "").length !== 26 || !!ibanError}
                    className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSavingIban ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Kaydediliyor...
                      </>
                    ) : ((profile as any).iban ? (
                      "Güncelle"
                    ) : (
                      "Banka Bilgilerini Kaydet"
                    ))}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === "notifications" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Bildirimler</h2>

              <div className="space-y-4">
                {[
                  { 
                    key: "email",
                    label: "E-posta bildirimleri", 
                    description: "Önemli olaylar için e-posta güncellemeleri alın" 
                  },
                  { 
                    key: "push",
                    label: "Anlık bildirimler", 
                    description: "Cihazınızda anlık uyarılar alın" 
                  },
                  { 
                    key: "alerts",
                    label: "Risk uyarıları", 
                    description: "Sporcu sağlığı ve performans uyarıları alın" 
                  }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch
                      checked={notificationPrefs[item.key as keyof typeof notificationPrefs]}
                      onCheckedChange={(checked) =>
                        setNotificationPrefs(prev => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}

                {/* WhatsApp Notifications — Beta */}
                <div className="flex items-center justify-between py-3 mt-2 border-t border-border/40 pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">WhatsApp Anlık Bildirimleri</p>
                        <span className="text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                          Beta · Yakında
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Sporcu olaylarını WhatsApp üzerinden anında alın. Altyapı hazırlanıyor.
                      </p>
                    </div>
                  </div>
                  <Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} />
                </div>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === "security" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Güvenlik</h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Mevcut Şifre</label>
                  <Input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange("currentPassword", e.target.value)}
                    placeholder="••••••••"
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Yeni Şifre</label>
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => handleInputChange("newPassword", e.target.value)}
                      placeholder="••••••••"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Şifre Tekrar</label>
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      placeholder="••••••••"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handlePasswordUpdate}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Şifreyi Güncelle
                </Button>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Görünüm</h2>

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-warning" />}
                  <div>
                    <p className="font-medium text-foreground">Karanlık Mod</p>
                    <p className="text-sm text-muted-foreground">Cyberpunk estetiği için önerilir</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
              </div>

              {/* Accent Color Picker */}
              <div className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">Tema Rengi</p>
                    <p className="text-sm text-muted-foreground">Arayüz vurgu rengini seçin</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={cn(
                        "relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                        selectedColor === color.value
                          ? "border-foreground bg-muted/50"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full shadow-lg transition-transform",
                          color.preview,
                          selectedColor === color.value && "scale-110 ring-2 ring-offset-2 ring-offset-background ring-foreground"
                        )}
                        style={{
                          boxShadow: selectedColor === color.value 
                            ? `0 0 20px hsl(${color.hsl} / 0.5)` 
                            : "none"
                        }}
                      />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">
                        {color.name}
                      </span>
                      {selectedColor === color.value && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-foreground flex items-center justify-center">
                          <Check className="w-3 h-3 text-background" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}




          {/* Save Button */}
          {(activeSection === "profile" || activeSection === "branding" || activeSection === "notifications") && (
            <div className="flex justify-end">
              <Button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime"
              >
                {isSaving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}