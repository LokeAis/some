import React from 'react';
import { AlertCircle, Key, Zap, WifiOff, ServerCrash } from 'lucide-react';

interface ErrorMessageProps {
  error: unknown;
}

export function ErrorMessage({ error }: ErrorMessageProps) {
  if (!error) return null;

  let errorString = '';
  if (typeof error === 'string') {
    errorString = error;
  } else if (error instanceof Error) {
    errorString = error.message;
  } else if (error && typeof error === 'object') {
    try {
      errorString = JSON.stringify(error);
    } catch (e) {
      errorString = String(error);
    }
  } else {
    errorString = String(error);
  }

  // Determine error type based on message content
  const isApiKeyError = errorString.toLowerCase().includes('api-nøkkel') || errorString.toLowerCase().includes('api key');
  const isQuotaError = errorString.toLowerCase().includes('kvote') || errorString.toLowerCase().includes('quota') || errorString.includes('429');
  const isNetworkError = errorString.toLowerCase().includes('nettverk') || errorString.toLowerCase().includes('fetch failed');

  let Icon = AlertCircle;
  let title = 'Det oppstod ein feil';
  let instructions = '';

  if (isApiKeyError) {
    Icon = Key;
    title = 'Problem med API-nøkkel';
    instructions = 'Gå til menyen til venstre (tannhjulet), klikk på "API-nøkkel", og lim inn ein gyldig nøkkel frå Google AI Studio. Sørg for at nøkkelen er kopiert i sin heilskap.';
  } else if (isQuotaError) {
    Icon = Zap;
    title = 'Kvote overskride';
    instructions = 'Du har brukt opp kvoten din for Gemini API-et. Dette skjer oftast viss du brukar gratisversjonen og har gjort mange førespurnader på kort tid. Vent litt og prøv igjen, eller oppgrader til ein betalt plan i Google Cloud Console.';
  } else if (isNetworkError) {
    Icon = WifiOff;
    title = 'Nettverksproblem';
    instructions = 'Vi fekk ikkje kontakt med AI-tenesta. Sjekk internettilkoblinga din og prøv igjen. Viss problemet vedvarer, kan det vere nede for vedlikehald.';
  } else {
    Icon = ServerCrash;
    instructions = 'Prøv å laste sida på nytt eller juster inndataene dine. Viss feilen gjentek seg, kan det vere eit mellombels problem med tenesta.';
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-red-100 p-2 rounded-lg flex-shrink-0 mt-0.5">
        <Icon className="w-5 h-5 text-red-600" />
      </div>
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-red-900">{title}</h4>
        <p className="text-sm text-red-700 mt-1 mb-2">{errorString}</p>
        <div className="bg-white/60 rounded-lg p-3 border border-red-100">
          <p className="text-xs font-medium text-red-900 mb-1">Kva kan du gjere?</p>
          <p className="text-xs text-red-800 leading-relaxed">{instructions}</p>
        </div>
      </div>
    </div>
  );
}
