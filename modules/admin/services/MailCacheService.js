// MailCacheService.js - IndexedDB cache for Blakely Cinematics Admin Mail
// DB: blakely-cinematics-mail-cache (versioned)

const DB_NAME = 'blakely-cinematics-mail-cache';
const OLD_DB_NAME = 'BlakelyMailCache';
const DB_VERSION = 1;

const STORES = {
  emails: 'emails',
  folderState: 'folderState',
  tombstones: 'tombstones',
  uiState: 'uiState',
};

class MailCacheService {
  constructor() {
    this.dbPromise = null;
  }

  open() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB not available'));
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion || 0;
        if (oldVersion < 1) {
          // emails
          if (!db.objectStoreNames.contains(STORES.emails)) {
            const emails = db.createObjectStore(STORES.emails, { keyPath: 'compositeId' });
            emails.createIndex('byAccountFolderTime', ['userId', 'folder', 'timestamp'], { unique: false });
            emails.createIndex('byAccountFolderUnread', ['userId', 'folder', 'unread'], { unique: false });
          }
          // folderState
          if (!db.objectStoreNames.contains(STORES.folderState)) {
            db.createObjectStore(STORES.folderState, { keyPath: 'folderKey' });
          }
          // tombstones
          if (!db.objectStoreNames.contains(STORES.tombstones)) {
            const tombs = db.createObjectStore(STORES.tombstones, { keyPath: 'compositeId' });
            tombs.createIndex('byTimestamp', 'deletedAt', { unique: false });
          }
          // uiState
          if (!db.objectStoreNames.contains(STORES.uiState)) {
            db.createObjectStore(STORES.uiState, { keyPath: 'stateKey' });
          }
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        this.#migrateFromOldDBIfNeeded(db).finally(() => resolve(db));
      };
      request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    });
    return this.dbPromise;
  }

  async #migrateFromOldDBIfNeeded(newDb) {
    try {
      const migratedFlagKey = 'blakely-cinematics-cache-migrated';
      try { if (localStorage.getItem(migratedFlagKey) === '1') return; } catch {}

      const oldDb = await new Promise((resolve, reject) => {
        const req = indexedDB.open(OLD_DB_NAME);
        let resolved = false;
        req.onupgradeneeded = () => { try { req.transaction && req.transaction.abort(); } catch {} };
        req.onsuccess = () => { resolved = true; resolve(req.result); };
        req.onerror = () => reject(req.error);
        setTimeout(() => { if (!resolved) resolve(null); }, 100);
      });
      if (!oldDb) return;

      const storesToCopy = [STORES.emails, STORES.folderState, STORES.tombstones, STORES.uiState];
      const readAll = (db, store) => new Promise((resolve) => {
        if (!db.objectStoreNames.contains(store)) return resolve([]);
        const tx = db.transaction([store], 'readonly');
        const os = tx.objectStore(store);
        const req = os.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      const payloads = {};
      for (const s of storesToCopy) payloads[s] = await readAll(oldDb, s);

      for (const s of storesToCopy) {
        const items = payloads[s] || [];
        if (!items.length) continue;
        await new Promise((resolve) => {
          const tx = newDb.transaction([s], 'readwrite');
          const os = tx.objectStore(s);
          items.forEach(item => { try { os.put(item); } catch {} });
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
          tx.onabort = () => resolve(false);
        });
      }

      try { indexedDB.deleteDatabase(OLD_DB_NAME); } catch {}
      try { localStorage.setItem(migratedFlagKey, '1'); } catch {}
    } catch (e) {
      console.warn('[MailCache] Migration from old DB failed or skipped:', e?.message || e);
    }
  }

  async upsertEmails(userId, folder, emails) {
    if (!Array.isArray(emails) || emails.length === 0) return { written: 0 };
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.emails], 'readwrite');
      const store = tx.objectStore(STORES.emails);
      let written = 0;
      emails.forEach((e) => {
        const emailId = e.emailId || e.id || null;
        if (!emailId) return;
        const record = {
          compositeId: `${userId}|${emailId}`,
          emailId,
          userId,
          folder: e.folder || folder || 'inbox',
          account: e.account || userId,
          timestamp: (e.date instanceof Date ? e.date.getTime() : (e.timestamp || Date.now())),
          updatedAt: Date.now(),
          subject: e.subject || '(No Subject)',
          snippet: e.preview || '',
          htmlBody: e.body || e.htmlBody || null,
          textBody: e.textBody || null,
          from: e.email || e.from || null,
          fromName: e.sender || e.fromName || null,
          to: (e.recipients && Array.isArray(e.recipients.to)) ? e.recipients.to : (Array.isArray(e.to) ? e.to : (e.to ? [e.to] : [])),
          cc: (e.recipients && e.recipients.cc) || e.cc || [],
          bcc: (e.recipients && e.recipients.bcc) || e.bcc || [],
          unread: !!e.unread,
          starred: !!e.starred,
          archived: !!e.archived,
          hasAttachments: !!e.hasAttachments,
          threadId: e.threadId || e.inReplyTo || null,
          attachments: e.attachments || [],
        };
        try { store.put(record); written++; } catch (err) { console.warn('[MailCache] upsert failed', record.compositeId, err); }
      });
      tx.oncomplete = () => resolve({ written });
      tx.onerror = () => resolve({ written });
      tx.onabort = () => resolve({ written });
    });
  }

  async putFolderState(userId, folder, state) {
    const db = await this.open();
    const payload = {
      folderKey: `${userId}|${folder}`,
      userId,
      folder,
      etag: state?.etag || null,
      nextToken: state?.nextToken || null,
      updatedAt: state?.updatedAt || Date.now(),
      count: state?.count ?? null,
    };
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.folderState], 'readwrite');
      tx.objectStore(STORES.folderState).put(payload);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  }

  async getFolderState(userId, folder) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.folderState], 'readonly');
      const req = tx.objectStore(STORES.folderState).get(`${userId}|${folder}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async recordTombstone({ emailId, userId, folder, reason, targetFolder = null, deletedAt = Date.now() }) {
    if (!emailId || !userId) return false;
    const db = await this.open();
    const record = { compositeId: `${userId}|${emailId}`, emailId, userId, folder: folder || null, reason: reason || 'deleted', targetFolder, deletedAt };
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.tombstones], 'readwrite');
      tx.objectStore(STORES.tombstones).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  }

  async getEmailsByFolder(userId, folder, limit = 50) {
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.emails], 'readonly');
      const idx = tx.objectStore(STORES.emails).index('byAccountFolderTime');
      const range = IDBKeyRange.bound([userId, folder, 0], [userId, folder, Number.MAX_SAFE_INTEGER]);
      const dir = 'prev';
      const results = [];
      let count = 0;
      const req = idx.openCursor(range, dir);
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor && (limit <= 0 || count < limit)) {
          results.push(cursor.value);
          count++;
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      req.onerror = () => resolve(results);
    });
  }

  async getEmail(userId, emailId) {
    if (!userId || !emailId) return null;
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.emails], 'readonly');
      const req = tx.objectStore(STORES.emails).get(`${userId}|${emailId}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async updateFlags(userId, emailId, { unread, starred, archived, folder } = {}) {
    if (!userId || !emailId) return false;
    const db = await this.open();
    return new Promise((resolve) => {
      const tx = db.transaction([STORES.emails], 'readwrite');
      const store = tx.objectStore(STORES.emails);
      const key = `${userId}|${emailId}`;
      const getReq = store.get(key);
      getReq.onsuccess = () => {
        const rec = getReq.result;
        if (!rec) { resolve(false); return; }
        if (typeof unread === 'boolean') rec.unread = unread;
        if (typeof starred === 'boolean') rec.starred = starred;
        if (typeof archived === 'boolean') rec.archived = archived;
        if (typeof folder === 'string') rec.folder = folder;
        rec.updatedAt = Date.now();
        try { store.put(rec); } catch {}
      };
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    });
  }
}

const mailCache = new MailCacheService();
export default mailCache;

