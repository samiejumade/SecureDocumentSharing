export interface Comment {
  author: string;
  content: string;
  timestamp: string;
}

export interface SignatureRecord {
  signer: string;
  timestamp: string;
}

/**
 * Fetch all comments associated with a document hash from local storage.
 * @param docHash The Keccak256 hash of the document.
 */
export function getDocumentComments(docHash: string): Comment[] {
  if (typeof window === "undefined") return [];
  const key = `sdc_comments_${docHash.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Add a new comment to a document hash and return the updated array.
 * @param docHash The Keccak256 hash of the document.
 * @param author The wallet address posting the comment.
 * @param content The text body of the comment.
 */
export function addDocumentComment(docHash: string, author: string, content: string): Comment[] {
  if (typeof window === "undefined") return [];
  const key = `sdc_comments_${docHash.toLowerCase()}`;
  const comments = getDocumentComments(docHash);
  const newComment: Comment = {
    author: author.toLowerCase(),
    content: content.trim(),
    timestamp: new Date().toISOString()
  };
  comments.push(newComment);
  try {
    localStorage.setItem(key, JSON.stringify(comments));
  } catch (err) {
    console.error("Failed to save comment to localStorage:", err);
  }
  return comments;
}

/**
 * Fetch all signatures for a document hash from local storage.
 * @param docHash The Keccak256 hash of the document.
 */
export function getDocumentSignatures(docHash: string): SignatureRecord[] {
  if (typeof window === "undefined") return [];
  const key = `sdc_signatures_${docHash.toLowerCase()}`;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Record a signature for a user address on a document hash and return the updated signatures.
 * @param docHash The Keccak256 hash of the document.
 * @param signerAddress The wallet address executing the signature.
 */
export function signDocumentLocally(docHash: string, signerAddress: string): SignatureRecord[] {
  if (typeof window === "undefined") return [];
  const key = `sdc_signatures_${docHash.toLowerCase()}`;
  const signatures = getDocumentSignatures(docHash);
  const normalizedSigner = signerAddress.toLowerCase();
  
  // Prevent duplicate signatures
  if (signatures.some(s => s.signer.toLowerCase() === normalizedSigner)) {
    return signatures;
  }
  
  const newSignature: SignatureRecord = {
    signer: normalizedSigner,
    timestamp: new Date().toISOString()
  };
  signatures.push(newSignature);
  try {
    localStorage.setItem(key, JSON.stringify(signatures));
  } catch (err) {
    console.error("Failed to save signature to localStorage:", err);
  }
  return signatures;
}

/**
 * Check if a specific address has signed a document.
 * @param docHash The Keccak256 hash of the document.
 * @param userAddress The wallet address to check.
 */
export function hasUserSignedLocally(docHash: string, userAddress: string): boolean {
  const signatures = getDocumentSignatures(docHash);
  const normalizedUser = userAddress.toLowerCase();
  return signatures.some(s => s.signer.toLowerCase() === normalizedUser);
}

/**
 * Merges incoming comments array into local storage for a document, preventing duplicate records.
 */
export function mergeCommentsLocally(docHash: string, incomingComments: Comment[]): void {
  if (typeof window === "undefined" || !incomingComments) return;
  const existing = getDocumentComments(docHash);
  const merged = [...existing];
  
  for (const inc of incomingComments) {
    const isDuplicate = existing.some(
      (ext) =>
        ext.author.toLowerCase() === inc.author.toLowerCase() &&
        ext.content.trim() === inc.content.trim() &&
        // Relax strict millisecond checking by comparing up to the second
        ext.timestamp.slice(0, 19) === inc.timestamp.slice(0, 19)
    );
    if (!isDuplicate) {
      merged.push(inc);
    }
  }
  
  const key = `sdc_comments_${docHash.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(merged));
}

/**
 * Merges incoming signatures array into local storage for a document, preventing duplicate records.
 */
export function mergeSignaturesLocally(docHash: string, incomingSignatures: SignatureRecord[]): void {
  if (typeof window === "undefined" || !incomingSignatures) return;
  const existing = getDocumentSignatures(docHash);
  const merged = [...existing];
  
  for (const inc of incomingSignatures) {
    const isDuplicate = existing.some(
      (ext) => ext.signer.toLowerCase() === inc.signer.toLowerCase()
    );
    if (!isDuplicate) {
      merged.push(inc);
    }
  }
  
  const key = `sdc_signatures_${docHash.toLowerCase()}`;
  localStorage.setItem(key, JSON.stringify(merged));
}

/**
 * Merges incoming email-to-wallet bindings into local storage.
 */
export function mergeBindingsLocally(incomingBindings: Record<string, string>): void {
  if (typeof window === "undefined" || !incomingBindings) return;
  try {
    const raw = localStorage.getItem("sdc_email_bindings");
    const existing = raw ? JSON.parse(raw) : {};
    const merged = { ...existing };
    
    for (const [email, address] of Object.entries(incomingBindings)) {
      merged[email.toLowerCase().trim()] = address.toLowerCase().trim();
    }
    
    localStorage.setItem("sdc_email_bindings", JSON.stringify(merged));
  } catch (err) {
    console.error("Failed to merge bindings:", err);
  }
}

