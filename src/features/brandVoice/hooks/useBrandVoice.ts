import { useState, useEffect } from 'react';
import { BrandVoiceProfile } from '../types';
import { getVoiceProfile, saveVoiceProfile } from '../services/voiceProfileDb';
import { useAuth } from '../../../contexts/AuthContext';

export function useBrandVoice(brandId: string | undefined) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BrandVoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!brandId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    
    getVoiceProfile(brandId)
      .then(data => {
        if (isMounted) {
          setProfile(data);
          setError(null);
        }
      })
      .catch(err => {
        if (isMounted) {
          setError(err.message || 'Klarte ikkje å hente brand voice');
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [brandId]);

  const saveProfile = async (newProfile: Omit<BrandVoiceProfile, 'id' | 'createdAt' | 'updatedAt' | 'uid'>) => {
    try {
      if (!user) throw new Error("Brukar er ikkje logga inn");
      setError(null);
      const fullProfile = {
        ...newProfile,
        uid: user.uid,
        brandId: brandId!
      } as BrandVoiceProfile;
      const id = await saveVoiceProfile(fullProfile);
      setProfile({ ...fullProfile, id: id || fullProfile.id });
      return true;
    } catch (err: any) {
      setError(err.message || 'Klarte ikkje å lagre brand voice');
      return false;
    }
  };

  return {
    profile,
    loading,
    error,
    saveProfile
  };
}
