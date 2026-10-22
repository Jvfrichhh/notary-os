/**
 * Next.js 15: `params` & `searchParams` pada page/layout/route handler berupa
 * Promise. Halaman tetap menulis tipe biasa ({ params: { id: string } }) dan
 * membungkusnya dengan Async<...>, lalu `await unwrapProps(props)`.
 */
export type Async<T> = { [K in keyof T]: Promise<T[K]> };

export async function unwrapProps<T extends object>(props: Async<T>): Promise<T> {
  const out = {} as T;
  for (const key of Object.keys(props) as (keyof T)[]) {
    out[key] = await (props[key] as Promise<T[keyof T]>);
  }
  return out;
}
