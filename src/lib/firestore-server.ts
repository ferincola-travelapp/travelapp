// =============================================================================
// FIRESTORE SERVER — Lightweight Serverless-Safe REST Client
// Bypasses Client Web SDK connection bugs (gRPC timeouts, offline caches)
// and Google Cloud Service Account restrictions on Vercel.
// =============================================================================

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

// 1. Get Firebase Auth ID Token via Auth REST API (Anonymous Login)
async function getAuthToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_API_KEY is not defined in environment variables');
  }

  const authUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Firebase REST Auth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  cachedToken = data.idToken;
  // Expire 2 minutes early to avoid edge cases
  tokenExpiry = now + (parseInt(data.expiresIn, 10) * 1000) - 120000;
  return cachedToken!;
}

// 2. Map Firestore REST Value Types to Normal JSON
function mapRestValue(valObj: any): any {
  if (!valObj) return null;
  if ('stringValue' in valObj) return valObj.stringValue;
  if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
  if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
  if ('booleanValue' in valObj) return valObj.booleanValue;
  if ('nullValue' in valObj) return null;
  if ('arrayValue' in valObj) {
    const values = valObj.arrayValue.values || [];
    return values.map(mapRestValue);
  }
  if ('mapValue' in valObj) {
    return mapFirestoreFields(valObj.mapValue.fields);
  }
  return valObj;
}

function mapFirestoreFields(fields: any): any {
  if (!fields) return {};
  const obj: any = {};
  for (const [key, value] of Object.entries(fields)) {
    obj[key] = mapRestValue(value);
  }
  return obj;
}

// 3. Map Normal JSON to Firestore REST Value Types
function convertToRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: val.toString() } : { doubleValue: val };
  }
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(convertToRestValue)
      }
    };
  }
  if (typeof val === 'object') {
    return {
      mapValue: {
        fields: convertToRestFields(val)
      }
    };
  }
  return { stringValue: String(val) };
}

function convertToRestFields(obj: any): any {
  const fields: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    fields[key] = convertToRestValue(value);
  }
  return fields;
}

// 4. CRUD Wrapper functions
export async function serverGetDoc(
  collectionName: string,
  docId: string,
  authToken?: string
): Promise<{ exists: boolean; data: () => any; id: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');

  const token = authToken || (await getAuthToken());
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;
  
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });

    if (res.status === 404) {
      return { exists: false, data: () => null, id: docId };
    }

    if (!res.ok) {
      throw new Error(`Firestore REST getDoc error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return {
      exists: true,
      data: () => mapFirestoreFields(data.fields),
      id: docId
    };
  } catch (err) {
    console.error(`serverGetDoc error for ${collectionName}/${docId}:`, err);
    throw err;
  }
}

export async function serverGetDocs(
  collectionName: string,
  constraints: { where?: [string, any, any][]; orderBy?: [string, any][]; limit?: number } = {},
  authToken?: string
): Promise<{ empty: boolean; docs: any[] }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');

  const token = authToken || (await getAuthToken());
  
  // Se usa runQuery para soportar filtros, ordenamientos y límites
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
  
  // Obtener el nombre de la colección final de la ruta (soporta subcolecciones como 'conversations/123/messages')
  const collectionId = collectionName.split('/').pop() || collectionName;
  
  const from = [{ collectionId, allDescendants: false }];
  const structuredQuery: any = { from };

  if (constraints.where && constraints.where.length > 0) {
    const filters = constraints.where.map(([field, op, val]) => {
      let filterOp = 'EQUAL';
      if (op === '!=') filterOp = 'NOT_EQUAL';
      else if (op === '>') filterOp = 'GREATER_THAN';
      else if (op === '>=') filterOp = 'GREATER_THAN_OR_EQUAL';
      else if (op === '<') filterOp = 'LESS_THAN';
      else if (op === '<=') filterOp = 'LESS_THAN_OR_EQUAL';

      return {
        fieldFilter: {
          field: { fieldPath: field },
          op: filterOp,
          value: convertToRestValue(val),
        }
      };
    });

    if (filters.length === 1) {
      structuredQuery.where = filters[0];
    } else {
      structuredQuery.where = {
        compositeFilter: {
          op: 'AND',
          filters,
        }
      };
    }
  }

  if (constraints.orderBy && constraints.orderBy.length > 0) {
    structuredQuery.orderBy = constraints.orderBy.map(([field, dir]) => ({
      field: { fieldPath: field },
      direction: dir.toUpperCase() === 'DESC' ? 'DESCENDING' : 'ASCENDING',
    }));
  }

  if (constraints.limit) {
    structuredQuery.limit = constraints.limit;
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ structuredQuery }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Firestore REST runQuery error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    // runQuery devuelve un array de objetos con la estructura { document, readTime }
    // Si no hay resultados, puede venir vacío o con un array con un único elemento vacío
    const docs = (data || [])
      .filter((item: any) => item.document)
      .map((item: any) => {
        const docNameParts = item.document.name.split('/');
        const id = docNameParts[docNameParts.length - 1];
        return {
          id,
          data: () => mapFirestoreFields(item.document.fields),
        };
      });

    return {
      empty: docs.length === 0,
      docs
    };
  } catch (err) {
    console.error(`serverGetDocs error for ${collectionName}:`, err);
    throw err;
  }
}

export async function serverAddDoc(
  collectionName: string,
  data: any,
  authToken?: string
): Promise<{ id: string }> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');

  const token = authToken || (await getAuthToken());
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: convertToRestFields(data) }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Firestore REST addDoc error: ${res.status} ${await res.text()}`);
    }

    const resData = await res.json();
    const nameParts = resData.name.split('/');
    const id = nameParts[nameParts.length - 1];
    return { id };
  } catch (err) {
    console.error(`serverAddDoc error for ${collectionName}:`, err);
    throw err;
  }
}

export async function serverUpdateDoc(
  collectionName: string,
  docId: string,
  data: any,
  authToken?: string
): Promise<void> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');

  const token = authToken || (await getAuthToken());
  
  // En la API REST de Firestore, update se hace con PATCH y especificando updateMask
  const updateMask = Object.keys(data).map(key => `updateMask.fieldPaths=${key}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}?${updateMask}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: convertToRestFields(data) }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Firestore REST updateDoc error: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(`serverUpdateDoc error for ${collectionName}/${docId}:`, err);
    throw err;
  }
}

export async function serverSetDoc(collectionName: string, docId: string, data: any): Promise<void> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is not defined');
  
  const token = await getAuthToken();
  
  // setDoc escribe un documento completo o hace merge. En la API REST, PATCH sin updateMask reemplaza todo
  // pero si usamos currentDocument.exists=true podemos condicionarlo. Para simplificar, hacemos PATCH de todos los campos.
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${docId}`;

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: convertToRestFields(data) }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      throw new Error(`Firestore REST setDoc error: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error(`serverSetDoc error for ${collectionName}/${docId}:`, err);
    throw err;
  }
}
