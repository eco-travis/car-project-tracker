"use client";

import {
  cloneElement,
  forwardRef,
  isValidElement,
  use,
  type ReactElement,
  type ReactNode,
} from "react";

const LAZY = Symbol.for("react.lazy");
type Lazy = { $$typeof: symbol; _payload: PromiseLike<unknown> };
const isLazy = (n: unknown): n is Lazy =>
  !!n &&
  typeof n === "object" &&
  (n as Lazy).$$typeof === LAZY &&
  typeof (n as Lazy)._payload?.then === "function";

type AnyProps = Record<string, unknown>;

/** Radix-style prop merge: chain event handlers, join classNames, combine styles. */
function merge(slot: AnyProps, child: AnyProps): AnyProps {
  const out: AnyProps = { ...child, ...slot };
  for (const key of Object.keys(slot)) {
    const a = slot[key];
    const b = child[key];
    if (
      /^on[A-Z]/.test(key) &&
      typeof a === "function" &&
      typeof b === "function"
    ) {
      out[key] = (...args: unknown[]) => {
        (b as (...x: unknown[]) => void)(...args);
        (a as (...x: unknown[]) => void)(...args);
      };
    } else if (key === "className" && b) {
      out[key] = [b, a].filter(Boolean).join(" ");
    } else if (key === "style" && b) {
      out[key] = { ...(b as object), ...(a as object) };
    }
  }
  return out;
}

/**
 * Wraps a dialog/menu `trigger` passed in from a Server Component. Such elements can reach the
 * client as lazy references while their chunk loads, which Radix's Slot rejects ("failed to slot
 * onto its children"). This element is always valid; it resolves the lazy child itself and
 * forwards Radix's props and ref onto it.
 */
export const ClientTrigger = forwardRef<
  HTMLElement,
  { children: ReactNode } & AnyProps
>(function ClientTrigger({ children, ...slotProps }, ref) {
  let child: unknown = children;
  while (isLazy(child)) child = use(child._payload);
  if (!isValidElement(child)) {
    return (
      <span ref={ref as never} {...slotProps}>
        {children as ReactNode}
      </span>
    );
  }
  const element = child as ReactElement<AnyProps>;
  return cloneElement(element, { ...merge(slotProps, element.props), ref });
});
