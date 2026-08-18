"use client";

import Image from "next/image";
import * as React from "react";

type MoviePosterProps = {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export default function MoviePoster({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: MoviePosterProps) {
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`Affiche indisponible pour ${alt}`}
        className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center"
      >
        <p className="max-w-40 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          L&apos;affiche n&apos;a pas pu être trouvée
        </p>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
