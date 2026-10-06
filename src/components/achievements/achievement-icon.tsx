import {
    Apple,
    Award,
    BookOpen,
    CalendarCheck,
    ChefHat,
    Compass,
    Flame,
    Globe2,
    ShieldCheck,
    Sparkles,
    Trophy,
    Utensils,
} from "lucide-react";
import type { ComponentType } from "react";

const ICON_MAP: Record<string, ComponentType<{ className?: string; size?: number }>> = {
    sparkles: Sparkles,
    apple: Apple,
    utensils: Utensils,
    flame: Flame,
    "shield-check": ShieldCheck,
    "book-open": BookOpen,
    "globe-2": Globe2,
    "calendar-check": CalendarCheck,
    award: Award,
    compass: Compass,
    "chef-hat": ChefHat,
    trophy: Trophy,
};

interface AchievementIconProps {
    name: string;
    className?: string;
    size?: number;
}

export function AchievementIcon({ name, className = "size-6", size = 24 }: AchievementIconProps) {
    const Component = ICON_MAP[name.toLowerCase()] ?? Award;
    return <Component className={className} size={size} aria-hidden="true" />;
}
