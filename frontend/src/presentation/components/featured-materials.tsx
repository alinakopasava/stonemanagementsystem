import type { Material } from '@domain/entities/material';

interface FeaturedMaterialsProps {
  materials: Material[];
}

export const FeaturedMaterials = ({ materials }: FeaturedMaterialsProps) => {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10" id="catalog">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-serif text-3xl text-gray-100">Monument Catalog</h2>
          <p className="mt-2 text-slate-300">
            Selected cemetery monument examples with pricing based on material cost.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {materials.map((material) => (
          <article
            key={material.id}
            className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900/70"
          >
            <img
              src={material.imageUrl}
              alt={`${material.name} monument`}
              className="h-36 w-full object-cover"
            />
            <div className="space-y-1 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{material.category}</p>
              <h3 className="font-serif text-lg text-gray-100">{material.name}</h3>
              <p className="text-sm text-slate-200">Price: from {material.pricePerM2.toFixed(2)} PLN / m2</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
