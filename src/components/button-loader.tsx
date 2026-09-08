import BeatLoaderExport from "react-spinners/BeatLoader";

const BeatLoader =
  typeof BeatLoaderExport === "function"
    ? BeatLoaderExport
    : (BeatLoaderExport as unknown as { default: typeof BeatLoaderExport })
        .default;

export function ButtonLoader({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex flex-1 items-center justify-center">
      <BeatLoader aria-hidden="true" color="currentColor" size={5} margin={2} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
