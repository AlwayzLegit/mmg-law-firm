import * as React from "react";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * The browser's own <select>, styled to match the inputs. Used on the public
 * lead form in place of the Base UI select: that one pulled about 39 KB
 * (compressed) of positioning and focus code into every page with the full
 * form, and on phones the system picker is easier to use than a custom list.
 * An empty value shows the placeholder option in the muted placeholder colour.
 */
function NativeSelect({
  className,
  wrapperClassName,
  placeholder,
  value,
  selectRef,
  children,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"select">, "value"> & {
  value: string;
  placeholder?: string;
  wrapperClassName?: string;
  /** Named so it passes through FormControl; lets the form focus the field on error. */
  selectRef?: React.Ref<HTMLSelectElement>;
}) {
  return (
    <div className={cn("relative", wrapperClassName)}>
      <select
        ref={selectRef}
        data-slot="native-select"
        data-placeholder={value === "" ? "" : undefined}
        value={value}
        className={cn(
          "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground h-11 w-full min-w-0 cursor-pointer appearance-none rounded-lg border bg-transparent py-2 pr-9 pl-2.5 text-base transition-colors outline-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
          className,
        )}
        {...props}
      >
        {placeholder !== undefined ? (
          <option value="">{placeholder}</option>
        ) : null}
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
