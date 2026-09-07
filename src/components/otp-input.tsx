import { useRef, type RefObject } from "react";

const codeLength = 6;

export function OtpInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
  firstInputRef,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  firstInputRef: RefObject<HTMLInputElement | null>;
}) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: codeLength }, (_, index) =>
    /[0-9]/.test(value[index] || "") ? value[index] : "",
  );

  function focus(index: number) {
    inputs.current[Math.max(0, Math.min(codeLength - 1, index))]?.focus();
  }

  function update(next: string[]) {
    // Preserve empty positions when editing the middle of a partially entered code.
    onChange(
      next
        .map((digit) => digit || " ")
        .join("")
        .trimEnd(),
    );
  }

  function enter(index: number, text: string) {
    const incoming = text.replace(/\D/g, "").slice(0, codeLength);
    if (!incoming) return;
    const start = incoming.length === codeLength ? 0 : index;
    const next = [...digits];
    for (
      let offset = 0;
      offset < incoming.length && start + offset < codeLength;
      offset++
    )
      next[start + offset] = incoming[offset];
    update(next);
    focus(start + incoming.length);
  }

  return (
    <div
      role="group"
      aria-label="Verification code"
      className="grid grid-cols-6 gap-2"
      dir="ltr"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
            if (index === 0) firstInputRef.current = element;
          }}
          id={index === 0 ? id : `${id}-${index + 1}`}
          name={`otp-digit-${index + 1}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          // Allow a full code from mobile autofill, then distribute it between boxes.
          maxLength={codeLength}
          pattern="[0-9]"
          required
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${codeLength}`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            if (event.target.value === "") {
              const next = [...digits];
              next[index] = "";
              update(next);
            } else enter(index, event.target.value);
          }}
          onPaste={(event) => {
            event.preventDefault();
            enter(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (/^[0-9]$/.test(event.key)) {
              event.preventDefault();
              enter(index, event.key);
            } else if (event.key === "Backspace" || event.key === "Delete") {
              event.preventDefault();
              const target =
                event.key === "Backspace" && !digits[index]
                  ? Math.max(0, index - 1)
                  : index;
              const next = [...digits];
              next[target] = "";
              update(next);
              focus(target);
            } else if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              focus(
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? codeLength - 1
                    : index + (event.key === "ArrowLeft" ? -1 : 1),
              );
            }
          }}
          className="h-14 w-full min-w-0 rounded-lg border border-[#dcded2] bg-[#fcfcf8] p-0 text-center font-mono text-2xl text-[#424938] transition-[border-color,box-shadow] focus:border-[#e58965] focus:outline-2 focus:outline-offset-2 focus:outline-[#f45e3840] aria-invalid:border-[#b04830] disabled:opacity-60 sm:h-16 sm:text-3xl"
        />
      ))}
    </div>
  );
}
