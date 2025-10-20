import React from "react";

/**
 * TabsChrome
 * - Chrome-like tabs bar using Tailwind.
 * - Props:
 *    tabs: Array<{ id: string|number, label: string }>
 *    activeId: string|number
 *    onChange: (id) => void
 */
export default function TabsChrome({ tabs, activeId, onChange }) {
  return (
    <div className="w-full">
      <div className="flex items-end gap-2 overflow-x-auto pb-2 -mb-px">
        {tabs.map((t) => {
          const active = String(t.id) === String(activeId);
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={[
                "relative px-4 py-2 rounded-t-2xl border transition-all whitespace-nowrap",
                active
                  ? "bg-white text-gray-900 border-gray-200 shadow"
                  : "bg-white/70 text-gray-600 border-transparent hover:bg-white hover:text-gray-800"
              ].join(" ")}
              title={t.label}
            >
              <span className="text-sm font-medium">{t.label}</span>
              {active && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-white" />
              )}
            </button>
          );
        })}
      </div>
      <div className="h-[1px] w-full bg-gray-200" />
    </div>
  );
}
