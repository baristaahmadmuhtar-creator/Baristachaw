import { useState } from "react";
import { motion } from "motion/react";
import { Coffee, Sparkles } from "lucide-react";
import { deepThinkingResponse } from "../services/gemini";
import Markdown from "react-markdown";
import { useGlobalState } from "../context/GlobalState";

type BrewMethodOption = { id: "espresso" | "pour_over" | "french_press" | "cold_brew" | "aeropress"; promptLabel: string };
type RoastOption = { id: "light" | "medium" | "dark"; promptLabel: string };
type FlavorOption = { id: "fruity" | "nutty" | "chocolatey" | "floral" | "spicy"; promptLabel: string };

const brewMethods: BrewMethodOption[] = [
  { id: "espresso", promptLabel: "Espresso" },
  { id: "pour_over", promptLabel: "Pour Over" },
  { id: "french_press", promptLabel: "French Press" },
  { id: "cold_brew", promptLabel: "Cold Brew" },
  { id: "aeropress", promptLabel: "AeroPress" },
];

const roasts: RoastOption[] = [
  { id: "light", promptLabel: "Light" },
  { id: "medium", promptLabel: "Medium" },
  { id: "dark", promptLabel: "Dark" },
];

const flavorProfiles: FlavorOption[] = [
  { id: "fruity", promptLabel: "Fruity" },
  { id: "nutty", promptLabel: "Nutty" },
  { id: "chocolatey", promptLabel: "Chocolatey" },
  { id: "floral", promptLabel: "Floral" },
  { id: "spicy", promptLabel: "Spicy" },
];

export function CoffeeBuilder() {
  const { t } = useGlobalState();
  const [method, setMethod] = useState<BrewMethodOption["id"]>("pour_over");
  const [roast, setRoast] = useState<RoastOption["id"]>("light");
  const [flavor, setFlavor] = useState<FlavorOption["id"]>("fruity");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const methodLabel = brewMethods.find((option) => option.id === method)?.promptLabel || "Pour Over";
      const roastLabel = roasts.find((option) => option.id === roast)?.promptLabel || "Light";
      const flavorLabel = flavorProfiles.find((option) => option.id === flavor)?.promptLabel || "Fruity";
      const prompt = `As Baristachaw, a world-class barista adhering strictly to SCA standards, create a highly detailed, professional coffee recipe using the ${methodLabel} method, with a ${roastLabel} roast coffee that has ${flavorLabel} notes. Include precise grind size (in microns or common grinder settings), water temperature, coffee-to-water ratio, total brew time, and step-by-step pouring/brewing instructions. Explain the 'why' behind the technique.`;
      const res = await deepThinkingResponse(prompt);
      setResult(res);
    } catch (error) {
      console.error(error);
      setResult(t.coffeeBuilderCreateFailed);
    } finally {
      setLoading(false);
    }
  };

  const getMethodLabel = (id: BrewMethodOption["id"]) => {
    if (id === "espresso") return t.toolsMethodEspresso;
    if (id === "pour_over") return t.toolsMethodV60;
    if (id === "french_press") return t.toolsMethodFrenchPress;
    if (id === "cold_brew") return t.toolsMethodColdBrew;
    return t.toolsMethodAeropress;
  };

  const getRoastLabel = (id: RoastOption["id"]) => {
    if (id === "light") return t.toolsRoastLight;
    if (id === "medium") return t.toolsRoastMedium;
    return t.toolsRoastDark;
  };

  const getFlavorLabel = (id: FlavorOption["id"]) => {
    if (id === "fruity") return t.coffeeBuilderFlavorFruity;
    if (id === "nutty") return t.coffeeBuilderFlavorNutty;
    if (id === "chocolatey") return t.coffeeBuilderFlavorChocolatey;
    if (id === "floral") return t.coffeeBuilderFlavorFloral;
    return t.coffeeBuilderFlavorSpicy;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="p-6 max-w-2xl mx-auto pt-16"
      style={{ paddingBottom: 'calc(96px + var(--bottom-safe-capped, 0px))' }}
    >
      <header className="mb-10 text-center">
        <div className="w-16 h-16 rounded-[1.25rem] bg-amber-500/10 flex items-center justify-center text-amber-500 mx-auto mb-4 shadow-inner">
          <Coffee size={32} />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight mb-3">{t.coffeeBuilderTitle}</h1>
        <p className="text-secondary text-lg">{t.coffeeBuilderSubtitle}</p>
      </header>

      <div className="space-y-6">
        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">{t.coffeeBuilderBrewMethod}</h2>
          <div className="flex flex-wrap gap-2">
            {brewMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`px-5 py-2.5 rounded-[1.25rem] text-sm font-medium transition-all duration-300 ease-out ${method === m.id
                  ? "bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] scale-105"
                  : "bg-surface-alpha text-secondary hover:bg-surface-alpha-hover hover:scale-105"
                  }`}
              >
                {getMethodLabel(m.id)}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">{t.coffeeBuilderRoastProfile}</h2>
          <div className="flex gap-2 p-1.5 bg-surface-alpha rounded-[1.25rem]">
            {roasts.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoast(r.id)}
                className={`flex-1 py-3 text-sm font-medium rounded-xl transition-all duration-300 ease-out ${roast === r.id ? "bg-white shadow-md text-black scale-[1.02] dark:bg-white/20 dark:text-white" : "text-secondary hover:text-primary"
                  }`}
              >
                {getRoastLabel(r.id)}
              </button>
            ))}
          </div>
        </section>

        <section className="glass-card p-6">
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-widest mb-4">{t.coffeeBuilderFlavorNotes}</h2>
          <div className="flex flex-wrap gap-2">
            {flavorProfiles.map((f) => (
              <button
                key={f.id}
                onClick={() => setFlavor(f.id)}
                className={`px-5 py-2.5 rounded-[1.25rem] text-sm font-medium transition-all duration-300 ease-out ${flavor === f.id
                  ? "bg-amber-500 text-white shadow-[0_4px_16px_rgba(245,158,11,0.3)] scale-105"
                  : "bg-surface-alpha text-secondary hover:bg-surface-alpha-hover hover:scale-105"
                  }`}
              >
                {getFlavorLabel(f.id)}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full glass-button-primary bg-amber-500/90 border-amber-400/50 hover:bg-amber-500 py-5 flex items-center justify-center gap-3 text-lg"
        >
          {loading ? (
            <>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.2s' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-700/70" style={{ animation: 'coffee-ripple 1.4s ease-in-out infinite 0.4s' }} />
              </div>
              <span>{t.coffeeBuilderCreating}</span>
            </>
          ) : (
            <>
              <Sparkles size={24} />
              <span>{t.coffeeBuilderCreate}</span>
            </>
          )}
        </button>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 mt-8"
          >
            <div className="prose prose-amber max-w-none text-primary">
              <Markdown>{result}</Markdown>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
