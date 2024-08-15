import { useCallback, useRef, useState } from "react";

type UseIntersectionResult = [(node: HTMLElement) => void, IntersectionObserverEntry | null];

export const useIntersection = (options: IntersectionObserverInit): UseIntersectionResult => {
  const ref = useRef<HTMLElement | null>(null);
  let observer: IntersectionObserver | undefined;
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  const setRef = useCallback((node: HTMLElement) => {
    if (ref.current && node !== ref.current && observer) {
      observer.disconnect();
    }

    ref.current = node;
    if (node && typeof IntersectionObserver === "function") {
      const handler = (entries: IntersectionObserverEntry[]): void => {
        setEntry(entries[0]);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
      observer = new IntersectionObserver(handler, options);
      observer.observe(ref.current);
    }
  }, []);

  return [setRef, entry];
};
