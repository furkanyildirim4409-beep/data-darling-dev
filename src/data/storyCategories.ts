import { Star, MessageCircle, Trophy, Camera, Heart, Clock } from "lucide-react";

export const storyCategories = [
  { id: "none", name: "Kategorisiz (24 Saat)", icon: Clock, color: "text-muted-foreground" },
  { id: "1", name: "Değişimler", icon: Star, color: "text-primary" },
  { id: "2", name: "Soru-Cevap", icon: MessageCircle, color: "text-info" },
  { id: "3", name: "Başarılar", icon: Trophy, color: "text-warning" },
  { id: "4", name: "Antrenman", icon: Camera, color: "text-success" },
  { id: "5", name: "Motivasyon", icon: Heart, color: "text-destructive" },
];

export const highlightCategories = storyCategories.filter(c => c.id !== "none");
