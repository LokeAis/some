import React, { useState, useEffect } from 'react';
import { Plus, Building2, ChevronDown, Check, Trash2 } from 'lucide-react';
import { BrandData, getUserBrands, saveBrand, deleteBrand } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmModal } from './ConfirmModal';

interface BrandSelectorProps {
  selectedBrand: BrandData | null;
  onSelectBrand: (brand: BrandData | null) => void;
}

export function BrandSelector({ selectedBrand, onSelectBrand }: BrandSelectorProps) {
  const { user } = useAuth();
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadBrands();
    }
  }, [user]);

  const loadBrands = async () => {
    if (!user) return;
    const userBrands = await getUserBrands(user.uid);
    if (userBrands) {
      setBrands(userBrands);
      if (userBrands.length > 0 && !selectedBrand) {
        onSelectBrand(userBrands[0]);
      }
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newBrandName.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const newBrand: Omit<BrandData, 'id' | 'createdAt' | 'updatedAt'> = {
        uid: user.uid,
        name: newBrandName.trim(),
      };
      
      const id = await saveBrand(newBrand);
      if (id) {
        const createdBrand = { ...newBrand, id };
        setBrands([createdBrand, ...brands]);
        onSelectBrand(createdBrand);
        setNewBrandName('');
        setIsCreating(false);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Failed to create brand:", err);
      setError("Klarte ikkje å opprette kunden.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  const handleDeleteBrand = async (e: React.MouseEvent, brandId: string) => {
    e.stopPropagation();
    setBrandToDelete(brandId);
  };

  const confirmDeleteBrand = async () => {
    if (!user || !brandToDelete) return;
    
    setIsLoading(true);
    setError(null);
    try {
      await deleteBrand(user.uid, brandToDelete);
      const updatedBrands = brands.filter(b => b.id !== brandToDelete);
      setBrands(updatedBrands);
      if (selectedBrand?.id === brandToDelete) {
        onSelectBrand(null); // Clear selection if the active brand is deleted
      }
    } catch (err) {
      console.error("Error deleting brand:", err);
      setError("Klarte ikkje å slette kunden.");
    } finally {
      setIsLoading(false);
      setBrandToDelete(null);
    }
  };

  return (
    <div className="relative">
      <ConfirmModal
        isOpen={!!brandToDelete}
        title="Slett kunde"
        message="Er du sikker på at du vil slette denne kunden? Alle tilhøyrande analysar, planar og innlegg vil også bli utilgjengelege."
        onConfirm={confirmDeleteBrand}
        onCancel={() => setBrandToDelete(null)}
        confirmText="Slett"
        cancelText="Avbryt"
        isDestructive={true}
      />
      {error && (
        <div className="absolute top-full left-0 mt-2 w-full p-2 bg-red-50 text-red-600 text-xs rounded-md border border-red-200 z-50">
          {error}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-lg shadow-sm hover:bg-neutral-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-neutral-500" />
        <span className="font-medium text-neutral-900">
          {selectedBrand ? selectedBrand.name : 'Velg kunde'}
        </span>
        <ChevronDown className="w-4 h-4 text-neutral-500" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-neutral-100 overflow-hidden z-50"
          >
            <div className="p-2">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center group">
                  <button
                    onClick={() => {
                      onSelectBrand(brand);
                      setIsOpen(false);
                    }}
                    className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                      selectedBrand?.id === brand.id
                        ? 'bg-blue-50 text-blue-700'
                        : 'hover:bg-neutral-50 text-neutral-700'
                    }`}
                  >
                    <span className="font-medium truncate">{brand.name}</span>
                    {selectedBrand?.id === brand.id && (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleDeleteBrand(e, brand.id!)}
                    className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Slett kunde"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-neutral-100 p-2 bg-neutral-50">
              {isCreating ? (
                <form onSubmit={handleCreateBrand} className="flex gap-2">
                  <input
                    type="text"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Kundenavn..."
                    className="flex-1 px-3 py-1.5 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !newBrandName.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Lagre
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Legg til ny kunde
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
