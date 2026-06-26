import React, { useState, useRef, useEffect } from 'react';
import { Wand2, Loader2, Type, AlignLeft, Smile, UserCheck } from 'lucide-react';
import { ErrorMessage } from './ErrorMessage';

interface AITextEditorProps {
  value: string;
  onChange: (value: string) => void;
  apiKey: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function AITextEditor({ value, onChange, apiKey, placeholder, className = '', disabled = false }: AITextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = () => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    if (start !== end) {
      const selectedText = value.substring(start, end);
      setSelection({ start, end, text: selectedText });
    } else {
      setSelection(null);
    }
  };

  // Also update selection on mouse up and key up
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const updateSelection = () => handleSelect();
    
    textarea.addEventListener('mouseup', updateSelection);
    textarea.addEventListener('keyup', updateSelection);
    
    return () => {
      textarea.removeEventListener('mouseup', updateSelection);
      textarea.removeEventListener('keyup', updateSelection);
    };
  }, [value]);

  const handleAIEdit = async (action: 'shorter' | 'professional' | 'casual' | 'emojis' | 'humanize') => {
    if (!apiKey) return;

    // If no selection, use the whole text
    const textToEdit = selection ? selection.text : value;
    if (!textToEdit.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      console.log('AITextEditor calling /api/edit-text with action:', action, 'and API key length:', apiKey?.length);
      const response = await fetch('/api/edit-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          text: textToEdit,
          action
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Feil ved redigering av tekst');
      }

      let newText;
      if (selection) {
        newText = value.substring(0, selection.start) + data.editedText + value.substring(selection.end);
      } else {
        newText = data.editedText;
      }
      
      onChange(newText);
      
      if (selection) {
        setSelection(null);
        // Reset selection in textarea
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(selection.start, selection.start + data.editedText.length);
          }
        }, 0);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && <ErrorMessage error={error} />}
      
      <div className="flex items-center gap-2 min-h-[40px]">
        <div className="flex items-center gap-2 bg-purple-50 p-1.5 rounded-lg border border-purple-100 w-full animate-in fade-in slide-in-from-top-2">
          <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider ml-2 mr-1">
            {selection ? 'Utval' : 'Heile'}
          </span>
          <button
            onClick={() => handleAIEdit('shorter')}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium bg-white text-purple-700 rounded-md shadow-sm hover:bg-purple-100 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <AlignLeft className="w-3 h-3" />
            Kortare
          </button>
          <button
            onClick={() => handleAIEdit('professional')}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium bg-white text-purple-700 rounded-md shadow-sm hover:bg-purple-100 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <Type className="w-3 h-3" />
            Proffare
          </button>
          <button
            onClick={() => handleAIEdit('emojis')}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium bg-white text-purple-700 rounded-md shadow-sm hover:bg-purple-100 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <Smile className="w-3 h-3" />
            Legg til emojies
          </button>
          <button
            onClick={() => handleAIEdit('humanize')}
            disabled={isProcessing}
            className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <UserCheck className="w-3 h-3" />
            Fjern AI-preg
          </button>
          {isProcessing && <Loader2 className="w-4 h-4 text-purple-600 animate-spin ml-auto mr-2" />}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          handleSelect();
        }}
        placeholder={placeholder}
        disabled={disabled || isProcessing}
        className={`w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none transition-colors ${className}`}
      />
    </div>
  );
}
