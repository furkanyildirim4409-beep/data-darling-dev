import { Notification } from "@/types/shared-models";

// Re-export for backward compatibility
export type Alert = Notification;

export const allAlerts: Notification[] = [
  // Critical Health Alerts
  {
    id: 1,
    type: "health",
    level: "critical",
    title: "Jake Williams - Düşük Hazırlık",
    message: "HRV başlangıç seviyesinin %30 altına düştü. Antrenman yükünü hemen azaltmayı düşünün.",
    time: "2dk önce",
    athleteId: "jake-williams",
  },
  {
    id: 2,
    type: "health",
    level: "critical",
    title: "Hakan Işık - Yüksek Sakatlanma Riski",
    message: "Ağrı skoru 3 gün üst üste 7/10. Dinlenme önerilir.",
    time: "30dk önce",
    athleteId: "hakan-isik",
  },
  {
    id: 3,
    type: "health",
    level: "critical",
    title: "Marcus Thompson - Kritik Yorgunluk",
    message: "Uyku kalitesi %45'e düştü, performans etkisi bekleniyor.",
    time: "1sa önce",
    athleteId: "marcus-thompson",
  },
  {
    id: 4,
    type: "health",
    level: "warning",
    title: "Elena Rodriguez - Yüksek Stres",
    message: "Kortizol seviyeleri normal aralığın üzerinde. Hafif antrenman önerilir.",
    time: "2sa önce",
    athleteId: "elena-rodriguez",
  },

  // Payment Alerts
  {
    id: 5,
    type: "payment",
    level: "critical",
    title: "Ödeme Gecikmiş - Mert Kaya",
    message: "Aylık ödeme 5 gün gecikti. Otomatik hatırlatma gönderildi.",
    time: "2sa önce",
    athleteId: "mert-kaya",
  },
  {
    id: 6,
    type: "payment",
    level: "warning",
    title: "Abonelik Sona Eriyor - Elena Rodriguez",
    message: "Aboneliği 7 gün içinde sona eriyor. Yenileme hatırlatması gönderilmeli.",
    time: "3sa önce",
    athleteId: "elena-rodriguez",
  },
  {
    id: 7,
    type: "payment",
    level: "warning",
    title: "Ödeme Başarısız - Alex Martinez",
    message: "Kredi kartı reddedildi. Alternatif ödeme yöntemi gerekli.",
    time: "4sa önce",
    athleteId: "alex-martinez",
  },
  {
    id: 8,
    type: "payment",
    level: "info",
    title: "Ödeme Alındı - Selin Aksoy",
    message: "Aylık abonelik ödemesi başarıyla alındı.",
    time: "5sa önce",
    athleteId: "selin-aksoy",
  },

  // Check-in Alerts
  {
    id: 9,
    type: "checkin",
    level: "critical",
    title: "Kaçırılan Check-in: Mert Kaya",
    message: "5 gündür sağlık verisi gönderilmedi. Takip önerilir.",
    time: "15dk önce",
    athleteId: "mert-kaya",
  },
  {
    id: 10,
    type: "checkin",
    level: "warning",
    title: "Check-in Eksik: Jake Williams",
    message: "3 gündür check-in yapılmadı. Haftalık rapor eksik kalacak.",
    time: "1sa önce",
    athleteId: "jake-williams",
  },
  {
    id: 11,
    type: "checkin",
    level: "warning",
    title: "Check-in Eksik: Hakan Işık",
    message: "4 gündür beslenme günlüğü tutulmadı.",
    time: "2sa önce",
    athleteId: "hakan-isik",
  },
  {
    id: 12,
    type: "checkin",
    level: "info",
    title: "Fotoğraf Yüklendi - Selin Aksoy",
    message: "İnceleme için ilerleme fotoğrafları yüklendi.",
    time: "5sa önce",
    athleteId: "selin-aksoy",
  },

  // Program Alerts
  {
    id: 13,
    type: "program",
    level: "warning",
    title: "Program Bitiyor - Marcus Thompson",
    message: "Mevcut program 3 gün içinde sona eriyor. Yeni program hazırlanmalı.",
    time: "1sa önce",
    athleteId: "marcus-thompson",
  },
  {
    id: 14,
    type: "program",
    level: "warning",
    title: "Program Bitiyor - Elena Rodriguez",
    message: "Kuvvet programı 5 gün içinde tamamlanacak.",
    time: "2sa önce",
    athleteId: "elena-rodriguez",
  },
  {
    id: 15,
    type: "program",
    level: "warning",
    title: "Program İncelemesi Gerekiyor",
    message: "Bu hafta 3 sporcunun programı güncellenmeli.",
    time: "3sa önce",
  },
  {
    id: 16,
    type: "program",
    level: "info",
    title: "Program Tamamlandı - Alex Martinez",
    message: "12 haftalık hipertrofi programını başarıyla tamamladı.",
    time: "4sa önce",
    athleteId: "alex-martinez",
  },

  // Achievement Alerts
  {
    id: 17,
    type: "achievement",
    level: "info",
    title: "Yeni PR Kaydedildi",
    message: "Elena Rodriguez 143kg squat PR kırdı!",
    time: "3sa önce",
    athleteId: "elena-rodriguez",
  },
  {
    id: 18,
    type: "achievement",
    level: "info",
    title: "Hedef Tamamlandı - Selin Aksoy",
    message: "Vücut yağ oranı hedefine ulaşıldı: %18",
    time: "4sa önce",
    athleteId: "selin-aksoy",
  },

  // Session Alerts
  {
    id: 19,
    type: "session",
    level: "info",
    title: "Antrenman Tamamlandı",
    message: "Marcus Thompson Hafta 4 Gün 3'ü %100 uyumlulukla tamamladı.",
    time: "4sa önce",
    athleteId: "marcus-thompson",
  },
  {
    id: 20,
    type: "session",
    level: "info",
    title: "Antrenman Başladı - Jake Williams",
    message: "Bugünkü bacak antrenmanına başladı.",
    time: "5sa önce",
    athleteId: "jake-williams",
  },

  // System Alerts
  {
    id: 21,
    type: "system",
    level: "info",
    title: "Yeni Sporcu Kaydı",
    message: "Alex Martinez kadronuza katılmak için başvurdu.",
    time: "6sa önce",
  },
  {
    id: 22,
    type: "system",
    level: "info",
    title: "Haftalık Rapor Hazır",
    message: "Geçen haftanın performans özeti görüntülenmeye hazır.",
    time: "7sa önce",
  },
];

// Filter functions for quick filters
export const getHealthAlerts = () => allAlerts.filter(a => a.type === "health");
export const getPaymentAlerts = () => allAlerts.filter(a => a.type === "payment");
export const getProgramAlerts = () => allAlerts.filter(a => a.type === "program");
export const getCheckinAlerts = () => allAlerts.filter(a => a.type === "checkin");
export const getCriticalAlerts = () => allAlerts.filter(a => a.level === "critical");
export const getWarningAlerts = () => allAlerts.filter(a => a.level === "warning");
export const getInfoAlerts = () => allAlerts.filter(a => a.level === "info");