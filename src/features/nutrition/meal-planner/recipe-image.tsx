import Image from "next/image";
import { cn } from "@/lib/cn";
import type { Recipe } from "./meal-planner-types";

export function RecipeImage({
  recipe,
  variant = "thumbnail",
  decorative = false,
}: Readonly<{
  recipe: Recipe;
  variant?: "thumbnail" | "compact" | "strip";
  decorative?: boolean;
}>) {
  const isStrip = variant === "strip";
  const isCompact = variant === "compact";
  const imageClassName = cn(
    "block h-full w-full object-cover opacity-90",
    isStrip ? "rounded-[10px]" : "rounded-[12px]",
  );
  const frameClassName = cn(
    "overflow-hidden border border-[rgba(148,163,184,.16)] bg-[rgba(18,28,43,.72)]",
    isStrip && "h-9 w-full rounded-[10px]",
    isCompact && "size-14 shrink-0 rounded-[12px]",
    !isStrip && !isCompact && "h-[72px] w-[80px] shrink-0 rounded-[12px]",
  );
  const imageSize = isStrip
    ? { height: 36, width: 320 }
    : isCompact
      ? { height: 56, width: 56 }
      : { height: 72, width: 80 };

  return (
    <div aria-hidden={decorative || undefined} className={frameClassName}>
      {recipe.imageUrl ? (
        <Image
          alt={decorative ? "" : recipe.imageAlt ?? `${recipe.title} placeholder`}
          className={imageClassName}
          height={imageSize.height}
          unoptimized
          src={recipe.imageUrl}
          width={imageSize.width}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(217,146,79,.18),rgba(95,200,215,.10))]"
          role={decorative ? undefined : "img"}
          aria-label={decorative ? undefined : `${recipe.title} placeholder`}
        >
          <span className="h-5 w-5 rounded-full border border-[rgba(216,180,90,.30)] bg-[rgba(216,180,90,.12)]" />
        </div>
      )}
    </div>
  );
}
