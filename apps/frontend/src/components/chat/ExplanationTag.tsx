'use client';

import { Info } from 'lucide-react';

interface ExplanationTagProps {
  explanation: string;
}

export function ExplanationTag({ explanation }: ExplanationTagProps) {
  return (
    <div className="ml-10 mt-1.5 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
      <Info className="w-3 h-3" />
      <span>Why: {explanation}</span>
    </div>
  );
}
