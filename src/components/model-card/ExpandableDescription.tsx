import { createSignal, onSettled, Show } from "solid-js";

export function ExpandableDescription(props: {
  text: string;
  lineClamp: number;
  class?: string;
}) {
  const [expanded, setExpanded] = createSignal(false);
  const [isClamped, setIsClamped] = createSignal(false);
  let ref: HTMLParagraphElement | undefined;

  onSettled(() => {
    const measure = () => {
      const el = ref;
      if (!el || expanded()) return;

      const prevDisplay = el.style.display;
      const prevOrient = el.style.webkitBoxOrient;
      const prevClamp = el.style.webkitLineClamp;
      const prevOverflow = el.style.overflow;

      el.style.display = "block";
      el.style.webkitLineClamp = "unset";
      el.style.overflow = "visible";
      const fullHeight = el.scrollHeight;

      el.style.display = "-webkit-box";
      el.style.webkitBoxOrient = "vertical";
      el.style.webkitLineClamp = String(props.lineClamp);
      el.style.overflow = "hidden";
      const clampedHeight = el.clientHeight;

      setIsClamped(fullHeight > clampedHeight);

      el.style.display = prevDisplay;
      el.style.webkitBoxOrient = prevOrient;
      el.style.webkitLineClamp = prevClamp;
      el.style.overflow = prevOverflow;
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (ref) ro.observe(ref);
    return () => ro.disconnect();
  });

  return (
    <div>
      <p
        ref={ref}
        style={
          expanded()
            ? undefined
            : {
                display: "-webkit-box",
                "-webkit-box-orient": "vertical",
                "-webkit-line-clamp": String(props.lineClamp),
                overflow: "hidden",
              }
        }
        class={props.class}
      >
        {props.text}
      </p>
      <Show when={isClamped()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-expanded={expanded() ? "true" : "false"}
          class="mt-1 text-caption text-zinc-400 hover:text-zinc-200 transition-colors duration-150 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded"
        >
          {expanded() ? "Show less" : "Show more"}
        </button>
      </Show>
    </div>
  );
}
