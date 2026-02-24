const DB_NAME = 'loopa_media'
const DB_VERSION = 1
const STORE = 'blobs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveVideo(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getVideo(id: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteVideo(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteVideos(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const id of ids) store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// ── Image storage (shared DB/store with videos) ───────────────────────────────

export async function storeImage(id: string, blob: Blob): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteMediaBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    for (const id of ids) store.delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// ── Supabase Storage (cloud backup / cross-device sync) ───────────────────────
// Bucket: project-media (private, RLS: auth.uid()::text = foldername(name)[1])
// Path:   {userId}/{storageId}

const CLOUD_BUCKET = 'project-media'

/** Upload a media blob to Supabase Storage. Silently ignored if not authenticated. */
export async function uploadMediaToCloud(
  userId: string,
  storageId: string,
  blob: Blob
): Promise<void> {
  const { supabase } = await import('@/lib/supabase')
  const { error } = await supabase.storage
    .from(CLOUD_BUCKET)
    .upload(`${userId}/${storageId}`, blob, { upsert: true })
  if (error) throw error
}

/** Download a media blob from Supabase Storage. Returns null if not found. */
export async function getMediaFromCloud(
  userId: string,
  storageId: string
): Promise<Blob | null> {
  const { supabase } = await import('@/lib/supabase')
  const { data, error } = await supabase.storage
    .from(CLOUD_BUCKET)
    .download(`${userId}/${storageId}`)
  if (error || !data) return null
  return data
}
