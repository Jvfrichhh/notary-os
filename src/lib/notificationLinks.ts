/** Halaman tujuan sebuah notifikasi internal (null bila tidak ada halaman). */
// Peta relatedEntityType -> halaman detail yang sudah ada di app ini.
// Cukup ditambah barisnya kalau ada entity baru yang mengirim notifikasi.
export function notificationHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case "Job":
      return `/jobs/${id}`;
    case "Client":
      return `/clients/${id}`;
    case "Document":
      return `/documents/${id}`;
    case "Deed":
      return `/archive/deed/${id}`;
    case "Minuta":
      return `/archive/minuta/${id}`;
    case "Salinan":
      return `/archive/salinan/${id}`;
    case "Grosse":
      return `/archive/grosse/${id}`;
    case "Kutipan":
      return `/archive/kutipan/${id}`;
    case "Repertorium":
      return `/notary-record/${id}`;
    case "Legalisasi":
      return `/legalisasi/${id}`;
    case "Waarmerking":
      return `/waarmerking/${id}`;
    case "Wasiat":
      return `/wasiat/${id}`;
    default:
      return null;
  }
}

