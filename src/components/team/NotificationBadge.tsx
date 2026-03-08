import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        className={cn(
          "absolute -top-1 -right-1 flex items-center justify-center",
          "min-w-[18px] h-[18px] px-1 rounded-full",
          "bg-destructive text-destructive-foreground",
          "text-[10px] font-bold",
          className
        )}
      >
        {count > 99 ? "99+" : count}
      </motion.span>
    </AnimatePresence>
  );
}
