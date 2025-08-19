import React from 'react';
import { EnhancedTextViewer } from '@/components/ui/EnhancedTextViewer';

export default function TestEnhancedTextViewer() {
  const testText = `
=== PAGE 1 ===

6 Sketch and label the TIG welding process.

Labels on the sketch:
- Electrical conductor
- Tungsten electrode
- Shielding gas
- Arc
- Gas Passage
- Filler wire
- Molten weld metal
- Solidified weld metal

Here's a diagram of the TIG welding process:
\`\`\`mermaid
graph TD
    A[Power Source] --> B[Electrical Conductor]
    B --> C[Tungsten Electrode]
    C --> D[Arc]
    D --> E[Workpiece]
    F[Shielding Gas] --> G[Gas Passage]
    G --> H[Arc Area]
    I[Filler Wire] --> J[Molten Weld Metal]
    J --> K[Solidified Weld Metal]
\`\`\`

7 a) Define an alloy.

"An alloy is a mixture of metals or a mixture of a metal and another element. The added element is called alloying element."

b) Why is alloying done?

"Alloying elements are added to increase the property of the base metal, e.g. to increase strength or corrosion or wear resistance."

=== PAGE 5 ===

8 Name two effects of using too low a current setting with SMAW

If the current is too low the resulting weld has poor penetration due to the lack of heating to create complete fusion.

9 What is the crystal structure represented below and name two materials that have this structure at room temperature.

[Diagram of a cube with atoms at corners and one atom in the center]

Body centred cubic (BCC) structure.

The mathematical relationship for BCC is: $$\\frac{\\sqrt{3}}{2}a = 2r$$

Where:
- $a$ is the lattice parameter
- $r$ is the atomic radius

Metals like alpha iron, chromium, molybdenum, tungsten, vanadium exhibit BCC structure.

Here's a diagram of the BCC structure:
\`\`\`mermaid
graph TD
    A[Corner Atom 1] --> B[Center Atom]
    C[Corner Atom 2] --> B
    D[Corner Atom 3] --> B
    E[Corner Atom 4] --> B
    F[Corner Atom 5] --> B
    G[Corner Atom 6] --> B
    H[Corner Atom 7] --> B
    I[Corner Atom 8] --> B
\`\`\`
  `;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">EnhancedTextViewer Test</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Test Content with LaTeX and Mermaid</h2>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <EnhancedTextViewer 
            text={testText} 
            className="text-sm"
          />
        </div>
      </div>
      
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Raw Text (for comparison)</h2>
        
        <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
          <pre className="whitespace-pre-wrap text-sm font-mono">
            {testText}
          </pre>
        </div>
      </div>
    </div>
  );
}
