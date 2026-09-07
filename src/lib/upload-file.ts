export function uploadFile(
  file: File,
  upload: { url: string; headers: Record<string, string> },
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", upload.url);
    Object.entries(upload.headers).forEach(([key, value]) =>
      xhr.setRequestHeader(key, value),
    );
    const abort = () => xhr.abort();
    signal.addEventListener("abort", abort, { once: true });
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 95));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload failed. Please retry."));
    xhr.onerror = () =>
      reject(new Error("Connection interrupted. Please retry."));
    xhr.onabort = () =>
      reject(new DOMException("Upload cancelled", "AbortError"));
    xhr.timeout = 120000;
    xhr.ontimeout = () => reject(new Error("Upload timed out. Please retry."));
    xhr.onloadend = () => signal.removeEventListener("abort", abort);
    if (signal.aborted) {
      reject(new DOMException("Upload cancelled", "AbortError"));
      return;
    }
    xhr.send(file);
  });
}
