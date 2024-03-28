import { useEffect, useRef } from "react";

export function useWhatChanged(props: { [prop: string]: unknown }) {
  // cache the last set of props
  const prev = useRef(props);

  useEffect(() => {
    // check each prop to see if it has changed
    const changed = Object.entries(props).reduce(
      (a, [key, prop]: [string, unknown]) => {
        if (prev.current[key] === prop) return a;
        return {
          ...a,
          [key]: {
            prev: prev.current[key],
            next: prop,
          },
        };
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {} as { [k: string]: any }
    );

    if (Object.keys(changed).length > 0) {
      console.group("Props That Changed");
      console.log(changed);
      console.groupEnd();
    }

    prev.current = props;
  }, [props]);
}
