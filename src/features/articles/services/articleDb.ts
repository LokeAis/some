import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { ArticleData } from '../types';
import { handleFirestoreError, OperationType } from '../../../lib/db';

const COLLECTION_NAME = 'articles';

export const saveArticle = async (article: Omit<ArticleData, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Promise<string | null> => {
  try {
    const articleRef = id ? doc(db, COLLECTION_NAME, id) : doc(collection(db, COLLECTION_NAME));
    
    const dataToSave = {
      ...article,
      updatedAt: Date.now(),
      ...(id ? {} : { createdAt: Date.now() })
    };

    await setDoc(articleRef, dataToSave, { merge: true });
    return articleRef.id;
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, COLLECTION_NAME);
    return null;
  }
};

export const getArticlesByBrand = async (brandId: string): Promise<ArticleData[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('brandId', '==', brandId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ArticleData));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, COLLECTION_NAME);
    return [];
  }
};

export const deleteArticle = async (id: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
    return false;
  }
};
