import { useState, useRef } from "react";
import { User, Bell, Lock, Palette, Database, Zap, Check, Moon, Sun, Download, Camera, Building, Star, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const settingsSections = [
  { id: "profile", label: "Profil", icon: User },
  { id: "branding", label: "Marka Kimliği", icon: Building },
  { id: "subscription", label: "Abonelik", icon: CreditCard },
  { id: "notifications", label: "Bildirimler", icon: Bell },
  { id: "security", label: "Güvenlik", icon: Lock },
  { id: "appearance", label: "Görünüm", icon: Palette },
  { id: "data", label: "Veri & Dışa Aktar", icon: Database },
];

const accentColors = [
  { name: "Neon Yeşil", value: "lime", hsl: "82 85% 55%", preview: "bg-[hsl(82,85%,55%)]" },
  { name: "Elektrik Mavi", value: "blue", hsl: "217 91% 60%", preview: "bg-[hsl(217,91%,60%)]" },
  { name: "Siber Mor", value: "purple", hsl: "263 70% 58%", preview: "bg-[hsl(263,70%,58%)]" },
  { name: "Neon Turuncu", value: "orange", hsl: "25 95% 53%", preview: "bg-[hsl(25,95%,53%)]" },
  { name: "Plazma Pembe", value: "pink", hsl: "330 81% 60%", preview: "bg-[hsl(330,81%,60%)]" },
  { name: "Matrix Yeşil", value: "green", hsl: "142 76% 36%", preview: "bg-[hsl(142,76%,36%)]" },
];

const subscriptionPlans = [
  {
    name: "Free",
    price: "₺0",
    period: "aylık",
    features: ["5 sporcu", "Temel raporlar", "E-posta desteği"],
    current: true
  },
  {
    name: "Pro",
    price: "₺499",
    period: "aylık",
    features: ["25 sporcu", "Gelişmiş analitik", "WhatsApp entegrasyonu", "Özel raporlar"],
    current: false
  },
  {
    name: "Elite",
    price: "₺999",
    period: "aylık",
    features: ["Sınırsız sporcu", "AI analiz", "API erişimi", "Öncelikli destek", "Beyaz etiket"],
    current: false
  }
];

export default function Settings() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] = useState("profile");
  const [selectedColor, setSelectedColor] = useState("lime");
  const [darkMode, setDarkMode] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || "",
    bio: profile?.bio || "",
    gymName: profile?.gym_name || "",
    specialty: profile?.specialty || "",
    email: profile?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: profile?.notification_preferences?.email ?? true,
    push: profile?.notification_preferences?.push ?? true,
    alerts: profile?.notification_preferences?.alerts ?? true,
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          bio: formData.bio,
          gym_name: formData.gymName,
          specialty: formData.specialty,
          notification_preferences: notificationPrefs
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Profil Güncellendi",
        description: "Bilgileriniz başarıyla kaydedildi.",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Hata",
        description: "Profil güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
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

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      toast({
        title: "Avatar Güncellendi",
        description: "Profil fotoğrafınız başarıyla yüklendi.",
      });
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast({
        title: "Hata",
        description: "Avatar yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Hata",
        description: "Yeni şifreler eşleşmiyor.",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Hata",
        description: "Yeni şifre en az 6 karakter olmalı.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
      if (error) throw error;

      setFormData(prev => ({ ...prev, currentPassword: "", newPassword: "", confirmPassword: "" }));
      
      toast({
        title: "Şifre Güncellendi",
        description: "Şifreniz başarıyla değiştirildi.",
      });
    } catch (error) {
      console.error('Password update error:', error);
      toast({
        title: "Hata",
        description: "Şifre güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };

  const handleExportData = async () => {
    if (!user) return;

    setIsExporting(true);
    
    try {
      // Fetch data from various tables
      const [athletesResult, programsResult, paymentsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('coach_id', user.id),
        supabase.from('programs').select('*').eq('coach_id', user.id),
        supabase.from('payments').select('*').eq('coach_id', user.id)
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        version: "1.0.0",
        coach: profile,
        athletes: athletesResult.data || [],
        programs: programsResult.data || [],
        payments: paymentsResult.data || []
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `dynabolic_data_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Veriler Dışa Aktarıldı",
        description: "Tüm verileriniz başarıyla indirildi.",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Hata",
        description: "Veri dışa aktarılırken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpgradeSubscription = (planName: string) => {
    toast({
      title: "Yakında!",
      description: `${planName} planına yükseltme özelliği yakında aktif olacak.`,
    });
  };

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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Biyografi</label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    placeholder="Kendiniz hakkında kısa bir açıklama..."
                    className="bg-card border-border focus:border-primary min-h-[100px]"
                  />
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
                  {subscriptionPlans.map((plan) => (
                    <div
                      key={plan.name}
                      className={cn(
                        "relative p-6 rounded-xl border transition-all",
                        plan.current
                          ? "border-primary bg-primary/5 glow-lime"
                          : "border-border bg-card hover:bg-muted/30"
                      )}
                    >
                      {plan.current && (
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
                          plan.current
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-primary-foreground hover:bg-primary/90"
                        )}
                        disabled={plan.current}
                        onClick={() => handleUpgradeSubscription(plan.name)}
                      >
                        {plan.current ? "Aktif Plan" : "Yükselt"}
                      </Button>
                    </div>
                  ))}
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

          {/* Data Section */}
          {activeSection === "data" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Veri & Dışa Aktar</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between py-4 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Tüm Verileri Dışa Aktar</p>
                    <p className="text-sm text-muted-foreground">Sporcu ve program verilerini indir</p>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleExportData}
                    disabled={isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Download className="w-4 h-4 mr-2 animate-bounce" />
                        İndiriliyor...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Dışa Aktar
                      </>
                    )}
                  </Button>
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