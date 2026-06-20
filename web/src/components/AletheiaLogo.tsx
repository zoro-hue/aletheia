import { cn } from "@/src/utils/tailwind";
import Link from "next/link";
import { VersionLabel } from "./VersionLabel";
import { env } from "@/src/env.mjs";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { PlusIcon } from "lucide-react";

export const AletheiaIcon = ({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={`${env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.svg`}
    width={size}
    height={size}
    alt="Aletheia Icon"
    className={className}
  />
);

const AletheiaLogotypeOrCustomized = () => {
  const uiCustomization = useUiCustomization();

  if (uiCustomization?.logoLightModeHref && uiCustomization?.logoDarkModeHref) {
    // logo is a url, maximum aspect ratio of 1:3 needs to be supported according to docs
    return (
      <div className="flex items-center gap-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uiCustomization.logoLightModeHref}
          alt="Aletheia Logo"
          className={cn(
            "group-data-[collapsible=icon]:hidden dark:hidden",
            "max-h-4 max-w-14",
          )}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={uiCustomization.logoDarkModeHref}
          alt="Aletheia Logo"
          className={cn(
            "hidden group-data-[collapsible=icon]:hidden dark:block",
            "max-h-4 max-w-14",
          )}
        />
        <PlusIcon size={8} className="group-data-[collapsible=icon]:hidden" />
        <AletheiaIcon size={16} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <AletheiaIcon
        size={24}
        className="scale-120"
      />
      <span className="font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden text-neutral-900 dark:text-neutral-50">
        Aletheia
      </span>
    </div>
  );
};

export const AletheiaLogo = ({ version = false }: { version?: boolean }) => {
  return (
    <div className="-mt-2 ml-1 flex flex-wrap gap-4 lg:flex-col lg:items-start">
      {/* Aletheia Logo */}
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <AletheiaLogotypeOrCustomized />
        </Link>
        {version && (
          <VersionLabel className="ml-2 group-data-[collapsible=icon]:hidden" />
        )}
      </div>
    </div>
  );
};
