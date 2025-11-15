import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <>
      <style>{`
        /* remove focus ring for the file selector button only */
        input.no-file-focus::file-selector-button:focus,
        input.no-file-focus::file-selector-button:focus-visible,
        input.no-file-focus::-webkit-file-upload-button:focus,
        input.no-file-focus::-webkit-file-upload-button:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      <input
        type={type}
        data-slot="input"
        className={cn(
          "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-8 w-full min-w-0 rounded-md border-2 bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7.5 file:border-0 file:bg-blue-800 file:text-white file:text-xs file:font-medium file:ml-0 file:mr-2 file:px-2 file:cursor-pointer disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-xs",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "no-file-focus",
          className
        )}
        {...props}
      />
    </>
  );
}

export { Input };
