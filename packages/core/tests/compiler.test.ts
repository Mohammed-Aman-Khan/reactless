import { describe, it, expect } from 'vitest';
import { transform } from '../src/compiler/index';

describe('Compiler: transform', () => {
    it('should transform a simple static component', () => {
        const code = `
            function MyComponent() {
                return (
                    <div className="card">
                        <h1>Hello</h1>
                        <p>Static content</p>
                    </div>
                );
            }
        `;
        const result = transform(code);

        expect(result).toContain('ReactlessNode');
        // Simple checks for key parts to avoid whitespace issues
        expect(result).toContain('html: \"<div class=\\\"card\\\">');
        expect(result).toContain('<h1>Hello</h1>');
        expect(result).toContain('<p>Static content</p>');
        expect(result).toContain('import { ReactlessNode } from \'@reactless/core/runtime\';');
    });

    it('should handle dynamic text interpolation', () => {
        const code = `
            function Greet({ name }) {
                return <div>Hello {name}!</div>;
            }
        `;
        const result = transform(code);

        expect(result).toContain('rl-txt-');
        expect(result).toContain('\"textContent\"');
        expect(result).toContain('name');
    });

    it('should handle event handlers', () => {
        const code = `
            function Clicker({ onClick }) {
                return <button onClick={onClick}>Click me</button>;
            }
        `;
        const result = transform(code);

        expect(result).toContain('data-event=');
        expect(result).toContain('events: {');
        expect(result).toContain('onClick');
    });

    it('should handle fragments', () => {
        const code = `
            function List() {
                return (
                    <>
                        <li>Item 1</li>
                        <li>Item 2</li>
                    </>
                );
            }
        `;
        const result = transform(code);
        expect(result).toContain('<li>Item 1</li>');
        expect(result).toContain('<li>Item 2</li>');
    });

    it('should handle style objects', () => {
        const code = `
            function Styled({ color }) {
                return <div style={{ color }}>Colored</div>;
            }
        `;
        const result = transform(code);
        expect(result).toContain('\"props\":[\"style\"]');
        expect(result).toContain('color');
    });
});
