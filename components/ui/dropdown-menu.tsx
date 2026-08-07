"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="relative" onMouseLeave={() => setOpen(false)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ onClick?: () => void; open?: boolean }>, {
            onClick: () => setOpen(!open),
            open,
          });
        }
        return child;
      })}
    </div>
  );
};

const DropdownMenuTrigger = ({
  children,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}) => {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: props.onClick,
    });
  }
  return <div onClick={props.onClick}>{children}</div>;
};

const DropdownMenuContent = ({
  children,
  align = "start",
  className,
  open,
}: {
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
  open?: boolean;
}) => {
  if (!open) return null;

  return (
    <div
      className={cn(
        "absolute z-50 min-w-[180px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        align === "end" ? "right-0" : "left-0",
        "top-full mt-1",
        className
      )}
    >
      {children}
    </div>
  );
};

const DropdownMenuItem = ({
  children,
  className,
  asChild,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) => {
  if (asChild) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
