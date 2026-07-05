import { useState } from 'react';

export interface Draft {
  angle: string;
  text: string;
  hashtags: string[];
}

export interface RepurposeResult {
  analysis: { main_message: string; tone: string; key_points: string[] };
  drafts: Draft[];
}

interface RunInput {
  url?: string;
  text?: string;
  channel: string;
}

/**
 * Delt logikk for /api/repurpose: gjenbrukt av «Gjenbruk innhald»-fana og
 * «Del til kanal»-knappane i artikkelgeneratoren.
 */
export function useRepurpose(apiKey: string, brandVoice: any, selectedBrand: any) {
  const [result, setResult] = useState<RepurposeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<string>('');

  const run = async (input: RunInput) => {
    setError(null);
    if (!apiKey) {
      setError('API-nøkkel manglar. Lim inn nøkkelen din i menyen til venstre.');
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveChannel(input.channel);
    try {
      const response = await fetch('/api/repurpose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ ...input, brandVoice, brandProfile: selectedBrand })
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || `Feilkode: ${response.status}`);
      }
      setResult(await response.json());
    } catch (err: any) {
      setError(err.message || 'Ein uventa feil oppstod.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setActiveChannel('');
  };

  return { result, loading, error, activeChannel, run, reset };
}
