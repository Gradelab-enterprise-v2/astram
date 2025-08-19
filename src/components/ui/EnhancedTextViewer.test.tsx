import React from 'react';
import { EnhancedTextViewer } from './EnhancedTextViewer';

export function EnhancedTextViewerTest() {
  const testText = `
This is a test of the EnhancedTextViewer component.

Here's some inline math: $x^2 + y^2 = z^2$

And here's a block equation:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

Here's a simple flowchart:
\`\`\`mermaid
graph TD
    A[Start] --> B[Process]
    B --> C[Decision]
    C -->|Yes| D[Action 1]
    C -->|No| E[Action 2]
    D --> F[End]
    E --> F
\`\`\`

And here's a sequence diagram:
\`\`\`mermaid
sequenceDiagram
    participant A as User
    participant B as System
    A->>B: Request data
    B->>A: Return data
\`\`\`

More inline math: $\\frac{d}{dx}x^n = nx^{n-1}$

And another block equation:
$$\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$$
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">EnhancedTextViewer Test</h1>
      <div className="border rounded-lg p-6 bg-white">
        <EnhancedTextViewer text={testText} />
      </div>
    </div>
  );
}
