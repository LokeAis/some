import { collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../../lib/db';
import { BrandVoiceProfile } from '../types';

export async function getVoiceProfile(brandId: string): Promise<BrandVoiceProfile | null> {
  try {
    const q = query(
      collection(db, 'voiceProfiles'),
      where('brandId', '==', brandId)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const docData = snapshot.docs[0];
    return { id: docData.id, ...docData.data() } as BrandVoiceProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `voiceProfiles`);
    return null;
  }
}

export async function saveVoiceProfile(profile: BrandVoiceProfile): Promise<string | undefined> {
  try {
    const profileRef = profile.id 
      ? doc(db, 'voiceProfiles', profile.id)
      : doc(collection(db, 'voiceProfiles'));
      
    const dataToSave = {
      ...profile,
      updatedAt: Date.now(),
      ...(profile.id ? {} : { createdAt: Date.now() })
    };
    
    await setDoc(profileRef, dataToSave, { merge: true });
    return profileRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `voiceProfiles`);
  }
}
