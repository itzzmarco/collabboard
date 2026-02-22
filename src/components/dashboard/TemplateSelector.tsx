'use client'

import type { Template } from '@/app/actions/board'

type TemplateOption = 'blank' | 'sprint' | 'brainstorm' | 'retrospective'

const TEMPLATE_OPTIONS: { id: TemplateOption; label: string; colors: string[] }[] = [
  { id: 'blank', label: 'Blank', colors: [] },
  { id: 'sprint', label: 'Sprint Planning', colors: ['#fef9c3', '#dbeafe', '#dcfce7', '#fce7f3'] },
  { id: 'brainstorm', label: 'Brainstorm', colors: ['#f3e8ff', '#fef9c3', '#ffedd5'] },
  { id: 'retrospective', label: 'Retrospective', colors: ['#dcfce7', '#fce7f3', '#dbeafe'] },
]

export function TemplateSelector({
  selected,
  onChange,
}: {
  selected: Template
  onChange: (t: Template) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {TEMPLATE_OPTIONS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`border-2 rounded-lg p-2.5 cursor-pointer text-center transition-colors ${
            selected === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
          }`}
        >
          <div
            className={`h-[52px] rounded flex items-center justify-center gap-1 flex-wrap p-1.5 mb-2 ${
              t.colors.length === 0 ? 'bg-slate-100' : 'bg-[#f8fafc]'
            }`}
          >
            {t.colors.length === 0
              ? null
              : t.colors.slice(0, 4).map((hex, i) => (
                  <div
                    key={i}
                    className="w-[18px] h-[14px] rounded-sm"
                    style={{ backgroundColor: hex }}
                  />
                ))}
          </div>
          <span className="text-[11px] font-medium text-slate-700">{t.label}</span>
        </button>
      ))}
    </div>
  )
}
