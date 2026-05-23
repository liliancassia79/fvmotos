// Fotos por O.S. (armazenadas em base64 no localStorage)
export interface Foto {
  id: string;
  osId: string;
  placa: string;
  dataUrl: string;
  legenda?: string;
  criadoEm: number;
}

const KEY = "oficina-fotos-v1";

export function loadFotos(): Foto[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Foto[]) : [];
  } catch {
    return [];
  }
}

export function saveFotos(items: Foto[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    alert("Não foi possível salvar a foto: espaço de armazenamento cheio. Remova fotos antigas.");
    throw e;
  }
}

export function fotosDaOS(osId: string) {
  return loadFotos().filter((f) => f.osId === osId);
}

export function fotosDaPlaca(placa: string) {
  const p = placa.trim().toUpperCase();
  return loadFotos().filter((f) => f.placa.toUpperCase() === p);
}

// Redimensiona e comprime imagem em base64 JPEG para caber no localStorage
export function fileToCompressedDataUrl(
  file: File,
  maxW = 1280,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas indisponível"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
