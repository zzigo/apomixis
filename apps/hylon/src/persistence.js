export async function openArchive() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hylon-field', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('sessions');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other HYLON tabs to open local storage'));
    request.onsuccess = () => resolve(request.result);
  });
}
export function readSession(db) {
  return new Promise((resolve, reject) => {
    const request = db.transaction('sessions').objectStore('sessions').get('current');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export function writeSession(db, session) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessions', 'readwrite');
    tx.objectStore('sessions').put(session, 'current');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Save aborted'));
  });
}
