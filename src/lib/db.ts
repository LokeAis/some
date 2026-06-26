import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

import { CompetitorAnalysisData, MonthPlanItem } from '../types';

export interface BrandData {
  id?: string;
  uid: string;
  name: string;
  industry?: string;
  language?: string;
  tone_of_voice?: string;
  target_audience?: string;
  website_url?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Types based on firebase-blueprint.json
export interface AnalysisData {
  id?: string;
  uid: string;
  url?: string;
  company_summary: string;
  products_services?: string[];
  target_audience?: string[];
  tone_of_voice?: string;
  usp?: string[];
  content_pillars?: string[];
  cta_suggestions?: string[];
  brand_risks_or_gaps?: string[];
  golden_nuggets?: string[];
  confidence_notes?: string;
  competitor_analysis?: CompetitorAnalysisData;
  createdAt?: any;
}

export interface PlanData {
  id?: string;
  uid: string;
  analysisId?: string;
  plan_summary: string;
  posts: MonthPlanItem[];
  createdAt?: any;
}

export interface PostData {
  id?: string;
  uid: string;
  planId?: string;
  content_type?: 'post' | 'article';
  channel?: string;
  hook?: string;
  main_caption?: string;
  short_version?: string;
  hashtag_suggestions?: string[];
  article_title?: string;
  url_slug?: string;
  meta_title?: string;
  meta_description?: string;
  article_body?: string;
  image_prompt?: string;
  imageUrl?: string;
  alternative_variant?: string;
  status?: 'draft' | 'ready' | 'published';
  createdAt?: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// Error handler
function cleanData(data: any) {
  const clean: any = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) {
      clean[key] = data[key];
    }
  });
  return clean;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Brands
export async function saveBrand(data: Omit<BrandData, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const docRef = await addDoc(collection(db, `users/${data.uid}/brands`), {
      ...cleanData(data),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${data.uid}/brands`);
  }
}

export async function getUserBrands(uid: string) {
  try {
    const q = query(
      collection(db, `users/${uid}/brands`),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BrandData));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/brands`);
    return [];
  }
}

export async function deleteBrand(uid: string, brandId: string) {
  try {
    await deleteDoc(doc(db, `users/${uid}/brands`, brandId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/brands/${brandId}`);
  }
}

export async function updateBrand(uid: string, brandId: string, data: Partial<BrandData>) {
  try {
    const brandRef = doc(db, `users/${uid}/brands`, brandId);
    await updateDoc(brandRef, {
      ...cleanData(data),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/brands/${brandId}`);
  }
}

// Analyses
export async function saveAnalysis(uid: string, brandId: string, data: Omit<AnalysisData, 'id' | 'createdAt' | 'uid'>) {
  try {
    const docRef = await addDoc(collection(db, `users/${uid}/brands/${brandId}/analyses`), {
      ...cleanData(data),
      uid,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/brands/${brandId}/analyses`);
  }
}

export async function updateAnalysis(uid: string, brandId: string, id: string, data: Partial<AnalysisData>) {
  try {
    const docRef = doc(db, `users/${uid}/brands/${brandId}/analyses`, id);
    await updateDoc(docRef, {
      ...cleanData(data),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/brands/${brandId}/analyses/${id}`);
  }
}

export async function getUserAnalyses(uid: string, brandId: string) {
  try {
    const q = query(
      collection(db, `users/${uid}/brands/${brandId}/analyses`),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalysisData));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/brands/${brandId}/analyses`);
  }
}

// Plans
export async function savePlan(uid: string, brandId: string, data: Omit<PlanData, 'id' | 'createdAt' | 'uid'>) {
  try {
    const docRef = await addDoc(collection(db, `users/${uid}/brands/${brandId}/plans`), {
      ...cleanData(data),
      uid,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/brands/${brandId}/plans`);
  }
}

export async function updatePlan(uid: string, brandId: string, id: string, data: Partial<PlanData>) {
  try {
    const docRef = doc(db, `users/${uid}/brands/${brandId}/plans`, id);
    await updateDoc(docRef, {
      ...cleanData(data),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/brands/${brandId}/plans/${id}`);
  }
}

export async function getUserPlans(uid: string, brandId: string) {
  try {
    const q = query(
      collection(db, `users/${uid}/brands/${brandId}/plans`),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PlanData));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/brands/${brandId}/plans`);
  }
}

// Posts
export async function savePost(uid: string, brandId: string, data: Omit<PostData, 'id' | 'createdAt' | 'uid'>) {
  try {
    const docRef = await addDoc(collection(db, `users/${uid}/brands/${brandId}/posts`), {
      ...cleanData(data),
      uid,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `users/${uid}/brands/${brandId}/posts`);
  }
}

export async function updatePost(uid: string, brandId: string, id: string, data: Partial<PostData>) {
  try {
    const docRef = doc(db, `users/${uid}/brands/${brandId}/posts`, id);
    await updateDoc(docRef, {
      ...cleanData(data),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/brands/${brandId}/posts/${id}`);
  }
}

export async function getUserPosts(uid: string, brandId: string) {
  try {
    const q = query(
      collection(db, `users/${uid}/brands/${brandId}/posts`),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PostData));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, `users/${uid}/brands/${brandId}/posts`);
  }
}

export async function deleteAnalysis(uid: string, brandId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${uid}/brands/${brandId}/analyses`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/brands/${brandId}/analyses/${id}`);
  }
}

export async function deletePlan(uid: string, brandId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${uid}/brands/${brandId}/plans`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/brands/${brandId}/plans/${id}`);
  }
}

export async function deletePost(uid: string, brandId: string, id: string) {
  try {
    await deleteDoc(doc(db, `users/${uid}/brands/${brandId}/posts`, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/brands/${brandId}/posts/${id}`);
  }
}
