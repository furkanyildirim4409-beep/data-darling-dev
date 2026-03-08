import { useState } from "react";
import { User, Bell, Lock, Palette, Database, Zap, Check, Moon, Sun, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const settingsSections = [
  { id: "profile", label: "Profil", icon: User },
  { id: "notifications", label: "Bildirimler", icon: Bell },
  { id: "security", label: "Güvenlik", icon: Lock },
  { id: "appearance", label: "Görünüm", icon: Palette },
  { id: "data", label: "Veri & Dışa Aktar", icon: Database },
  { id: "integrations", label: "Entegrasyonlar", icon: Zap },
];

const accentColors = [
  { name: "Neon Yeşil", value: "lime", hsl: "82 85% 55%", preview: "bg-[hsl(82,85%,55%)]" },
  { name: "Elektrik Mavi", value: "blue", hsl: "217 91% 60%", preview: "bg-[hsl(217,91%,60%)]" },
  { name: "Siber Mor", value: "purple", hsl: "263 70% 58%", preview: "bg-[hsl(263,70%,58%)]" },
  { name: "Neon Turuncu", value: "orange", hsl: "25 95% 53%", preview: "bg-[hsl(25,95%,53%)]" },
  { name: "Plazma Pembe", value: "pink", hsl: "330 81% 60%", preview: "bg-[hsl(330,81%,60%)]" },
  { name: "Matrix Yeşil", value: "green", hsl: "142 76% 36%", preview: "bg-[hsl(142,76%,36%)]" },
];

// Mock data for export
const mockExportData = {
  exportDate: new Date().toISOString(),
  version: "1.0.0",
  athletes: [
    { id: "1", name: "Marcus Chen", sport: "Fitness", compliance: 94 },
    { id: "2", name: "Elena Rodriguez", sport: "Fitness", compliance: 87 },
    { id: "3", name: "Jake Thompson", sport: "Fitness", compliance: 72 },
  ],
  programs: [
    { id: "prog-1", name: "Hipertrofi A", type: "Antrenman" },
    { id: "prog-2", name: "Güç Döngüsü B", type: "Antrenman" },
  ],
  invoices: [
    { id: "inv-1", client: "Marcus Chen", amount: 3500, status: "paid" },
    { id: "inv-2", client: "Elena Rodriguez", amount: 1500, status: "pending" },
  ],
  team: [
    { id: "1", name: "Koç Davis", role: "Baş Antrenör" },
    { id: "2", name: "Mike Reynolds", role: "Yardımcı Antrenör" },
  ],
};

interface Integration {
  name: string;
  description: string;
  connected: boolean;
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const [selectedColor, setSelectedColor] = useState("lime");
  const [darkMode, setDarkMode] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [integrations, setIntegrations] = useState<Integration[]>([
    { name: "Google Takvim", description: "Antrenman randevularını senkronize et", connected: true },
    { name: "Stripe Ödemeler", description: "Online ödeme altyapısı", connected: true },
    { name: "WhatsApp Business", description: "Otomatik mesaj bildirimleri", connected: false },
    { name: "Zoom", description: "Online koçluk görüşmeleri", connected: false },
  ]);

  const handleExportData = async () => {
    setIsExporting(true);
    
    // Simulate export delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create JSON blob and download
    const dataStr = JSON.stringify(mockExportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = "dynabolic_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setIsExporting(false);
    toast({
      title: "Veriler Dışa Aktarıldı",
      description: "dynabolic_data.json dosyası indirildi.",
    });
  };

  const toggleIntegration = (name: string) => {
    setIntegrations(prev => 
      prev.map(integration => 
        integration.name === name 
          ? { ...integration, connected: !integration.connected }
          : integration
      )
    );
    
    const integration = integrations.find(i => i.name === name);
    if (integration) {
      toast({
        title: integration.connected ? "Bağlantı Kesildi" : "Bağlantı Kuruldu",
        description: `${name} ${integration.connected ? "bağlantısı kesildi" : "başarıyla bağlandı"}.`,
      });
    }
  };

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Ad</label>
                    <Input
                      defaultValue="Koç"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Soyad</label>
                    <Input
                      defaultValue="Davis"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">E-posta</label>
                  <Input
                    type="email"
                    defaultValue="davis@dynabolic.com"
                    className="bg-card border-border focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">İşletme Adı</label>
                  <Input
                    defaultValue="Dynabolic Atletizm"
                    className="bg-card border-border focus:border-primary"
                  />
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
                  { label: "E-posta bildirimleri", description: "Önemli olaylar için e-posta güncellemeleri alın" },
                  { label: "Anlık bildirimler", description: "Cihazınızda anlık uyarılar alın" },
                  { label: "Sporcu check-in uyarıları", description: "Sporcular check-in kaçırdığında bildirim alın" },
                  { label: "Ödeme hatırlatmaları", description: "Yaklaşan veya kaçırılan ödemeler hakkında bildirim alın" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Switch />
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
                    placeholder="••••••••"
                    className="bg-card border-border focus:border-primary"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Yeni Şifre</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Şifre Tekrar</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-card border-border focus:border-primary"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-foreground">İki Faktörlü Doğrulama</p>
                      <p className="text-sm text-muted-foreground">Ek güvenlik katmanı ekleyin</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="space-y-6">
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

                  {/* Preview */}
                  <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground mb-3">Önizleme:</p>
                    <div className="flex items-center gap-3">
                      <Button 
                        className="text-primary-foreground"
                        style={{ 
                          backgroundColor: `hsl(${accentColors.find(c => c.value === selectedColor)?.hsl})` 
                        }}
                      >
                        Örnek Buton
                      </Button>
                      <div 
                        className="h-8 w-24 rounded-lg"
                        style={{ 
                          backgroundColor: `hsl(${accentColors.find(c => c.value === selectedColor)?.hsl} / 0.2)`,
                          border: `1px solid hsl(${accentColors.find(c => c.value === selectedColor)?.hsl} / 0.3)`
                        }}
                      />
                      <span 
                        className="text-sm font-medium"
                        style={{ color: `hsl(${accentColors.find(c => c.value === selectedColor)?.hsl})` }}
                      >
                        Vurgu Metni
                      </span>
                    </div>
                  </div>
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
                <div className="flex items-center justify-between py-4 border-b border-border">
                  <div>
                    <p className="font-medium text-foreground">Yedekleme</p>
                    <p className="text-sm text-muted-foreground">Son yedekleme: 2 saat önce</p>
                  </div>
                  <Button variant="outline">Yedekle</Button>
                </div>
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-destructive">Hesabı Sil</p>
                    <p className="text-sm text-muted-foreground">Bu işlem geri alınamaz</p>
                  </div>
                  <Button variant="destructive">Hesabı Sil</Button>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Section */}
          {activeSection === "integrations" && (
            <div className="glass rounded-xl border border-border p-6">
              <h2 className="text-xl font-semibold text-foreground mb-6">Entegrasyonlar</h2>

              <div className="space-y-4">
                {integrations.map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{integration.name}</p>
                      <p className="text-sm text-muted-foreground">{integration.description}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className={cn(
                        integration.connected && "text-success border-success/30 hover:bg-success/10"
                      )}
                      onClick={() => toggleIntegration(integration.name)}
                    >
                      {integration.connected ? (
                        <>
                          <Check className="w-4 h-4 mr-1.5" />
                          Bağlı
                        </>
                      ) : (
                        "Bağlan"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lime">
              Değişiklikleri Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
