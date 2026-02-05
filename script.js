const CONFIG = {
    API_KEY: "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",
    MODEL: "llama-3.3-70b-versatile",
    URL: "https://api.groq.com/openai/v1/chat/completions"
};

let currentLang = 'EN';
let board; // Instância global do gráfico

const TRANSLATIONS = {
    PT: {
        title: "✨ VITheorem AI",
        subtitle: "Seu Motor de Análise de Expressões Matemáticas.",
        placeholder: "Digite a expressão matemática...",
        analyze: "Analisar",
        loading: "Processando análise...",
        error: "Erro na análise. Tente novamente.",
        system: `[ROLE] Kernel Matemático Técnico.
[RULES]
1. IDIOMA: Português (Brasil).
2. OBRIGATÓRIO: Se houver variável (x, y, etc), finalize com [PLOT]expressão_js[/PLOT].
3. CONVERSÃO DE PLOT: Transforme equações em funções. 
   - Ex: "sin(x) = 1/2" -> [PLOT]Math.sin(x) - 0.5[/PLOT]
   - Ex: "x^2 = 4" -> [PLOT]x**2 - 4[/PLOT]
4. SINTAXE: Use x**n e Math.sin(), Math.cos(), Math.tan(), Math.sqrt(), Math.log(), Math.exp().
5. PROIBIDO: Texto após [PLOT], saudações ou explicações de código.

[OUTPUT STRUCTURE]
## Análise
(Tipo e Propriedades)
## Caminho Estratégico
(Resolução técnica em LaTeX $$)
## Dica Técnica
(Insight curto)
[PLOT]fórmula_js[/PLOT]`
    },
    EN: {
        title: "✨ VITheorem AI",
        subtitle: "Your Mathematical Expression Analysis Engine.",
        placeholder: "Enter mathematical expression...",
        analyze: "Analyze",
        loading: "Processing analysis...",
        error: "Analysis error. Please try again.",
        system: `[ROLE] Technical Mathematics Kernel.
[RULES]
1. LANGUAGE: English.
2. MANDATORY: If variables (x, y, etc) exist, always end with [PLOT]js_expression[/PLOT].
3. PLOT CONVERSION: Convert equations into functions for the plot tag.
   - Ex: "sin(x) = 1/2" -> [PLOT]Math.sin(x) - 0.5[/PLOT]
   - Ex: "x^2 = 4" -> [PLOT]x**2 - 4[/PLOT]
4. SYNTAX: Use x**n and Math.sin(), Math.cos(), Math.tan(), Math.sqrt(), Math.log(), Math.exp().
5. FORBIDDEN: Text after [PLOT], greetings, or code explanations.

[OUTPUT STRUCTURE]
## Analysis
(Type and Properties)
## Strategic Path
(Technical steps in LaTeX $$)
## Technical Tip
(Short insight)
[PLOT]js_formula[/PLOT]`
    }
};
// --- Funções de Interface ---

function toggleLanguage() {
    currentLang = currentLang === 'PT' ? 'EN' : 'PT';
    document.getElementById('lang-btn').innerText = currentLang === 'PT' ? 'PT | EN' : 'EN | PT';
    document.querySelector('h1').innerText = TRANSLATIONS[currentLang].title;
    document.querySelector('.subtitle').innerText = TRANSLATIONS[currentLang].subtitle;
    document.getElementById('expression-input').placeholder = TRANSLATIONS[currentLang].placeholder;
    document.getElementById('magic-btn').innerText = TRANSLATIONS[currentLang].analyze;
    document.getElementById('loader').innerText = TRANSLATIONS[currentLang].loading;
}

// --- Lógica do Gráfico (JSXGraph) ---

function renderGraph(formula) {
    const graphContainer = document.getElementById('graph-container');
    if (!graphContainer) return;

    graphContainer.classList.remove('hidden');

    // Reinicia o quadro se já existir
    if (board) JXG.JSXGraph.freeBoard(board);

    board = JXG.JSXGraph.initBoard('box', {
        boundingbox: [-10, 10, 10, -10],
        axis: true,
        showCopyright: false,
        pan: { enabled: true },
        zoom: { wheel: true }
    });

    try {
        // Converte ^ para ** e trata 2x como 2*x
        let safeFormula = formula.replace(/\^/g, '**').replace(/(\d)(x)/g, '$1*$2');
        
        board.create('functiongraph', [function(x) {
            // Escopo seguro para funções matemáticas comuns
            const MathFunctions = {
                sin: Math.sin, cos: Math.cos, tan: Math.tan,
                log: Math.log, exp: Math.exp, sqrt: Math.sqrt, abs: Math.abs
            };
            return new Function('x', ...Object.keys(MathFunctions), `return ${safeFormula}`)(x, ...Object.values(MathFunctions));
        }, -10, 10], { strokeColor: '#18181b', strokeWidth: 2 });
    } catch (e) {
        console.error("ERROR:", e);
    }
}

// --- Lógica Principal ---

async function handleAnalysis() {
    const inputEl = document.getElementById('expression-input');
    const contentEl = document.getElementById('ai-response-content');
    const loaderEl = document.getElementById('loader');
    const resultCard = document.getElementById('result-card');
    const graphContainer = document.getElementById('graph-container');

    const expr = inputEl.value.trim();
    if (!expr) return;

    // Reset UI
    resultCard.classList.remove('hidden');
    loaderEl.classList.remove('hidden');
    if (graphContainer) graphContainer.classList.add('hidden');
    contentEl.innerHTML = '';

    try {
        const response = await fetch(CONFIG.URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${CONFIG.API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    { role: "system", content: TRANSLATIONS[currentLang].system },
                    { role: "user", content: `Analyze and plot if applicable: ${expr}` }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        let text = data.choices[0].message.content;

        // Processar Plotagem [PLOT]...[/PLOT]
        const plotMatch = text.match(/\[PLOT\](.*?)\[\/PLOT\]/);
        if (plotMatch) {
            renderGraph(plotMatch[1]);
            text = text.replace(/\[PLOT\].*?\[\/PLOT\]/g, ''); // Remove a tag do texto
        }

        // Formatação de títulos
        text = text.replace(/^## (.*$)/gim, '<h3>$1</h3>');
        
        loaderEl.classList.add('hidden');
        contentEl.innerHTML = text;

        if (window.MathJax) await MathJax.typesetPromise([contentEl]);

    } catch (error) {
        loaderEl.classList.add('hidden');
        contentEl.innerHTML = TRANSLATIONS[currentLang].error;
    }
}

// Listeners
document.getElementById('lang-btn').addEventListener('click', toggleLanguage);
document.getElementById('magic-btn').addEventListener('click', handleAnalysis);
document.getElementById('expression-input').addEventListener('keypress', (e) => { 
    if (e.key === 'Enter') handleAnalysis(); 
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Garante que o estado inicial reflita o idioma PT
    currentLang = 'PT'; 
    toggleLanguage();
});


//CALCULATOR--------------------------------------------------------------------------------


function calcInput(val) {
    const display = document.getElementById('calc-display');
    if (!display) return;
    if (display.value === 'Error') display.value = '';
    
    // Adiciona o valor visual (ex: "sin(" em vez de "Math.sin(")
    display.value += val;
}

function calcClear() {
    document.getElementById('calc-display').value = '';
}

function calcResult() {
    const display = document.getElementById('calc-display');
    if (!display || !display.value) return;

    try {
        let expression = display.value;

        // 1. MAPEAMENTO DE NOMES (Adicionado ln, exp e log base y)
        const replacements = {
            'sin': 'Math.sin',
            'cos': 'Math.cos',
            'tan': 'Math.tan',
            'ln': 'Math.log',    // No JS, Math.log é logaritmo natural (ln)
            'exp': 'Math.exp',
            '√': 'Math.sqrt',
            'π': 'Math.PI',
            '^': '**'
        };

        // Aplica substituições simples
        Object.keys(replacements).forEach(key => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            expression = expression.replace(new RegExp(escapedKey, 'g'), replacements[key]);
        });

        // 2. TRATAMENTO ESPECIAL: log(x, y) -> Mudança de Base
        // Transforma log(base, valor) em Math.log(valor) / Math.log(base)
        // Se o usuário digitar log(10, 100), vira Math.log(100) / Math.log(10) = 2
        expression = expression.replace(/log\(([^,]+),([^)]+)\)/g, (match, base, val) => {
            return `(Math.log(${val}) / Math.log(${base}))`;
        });

        // 3. CONVERSÃO DE GRAUS (Apenas para funções trigonométricas)
        expression = expression.replace(/Math\.(sin|cos|tan)\(([^)]+)\)/g, (match, func, content) => {
            if (content.includes('Math.PI') || content.includes('π')) return match;
            return `Math.${func}((${content}) * (Math.PI / 180))`;
        });

        // 4. AUTO-FECHAMENTO DE PARÊNTESES
        const openP = (expression.match(/\(/g) || []).length;
        const closeP = (expression.match(/\)/g) || []).length;
        expression += ')'.repeat(Math.max(0, openP - closeP));

        // 5. EXECUÇÃO
        let result = new Function(`return ${expression}`)();

        if (result !== undefined && !isNaN(result)) {
            display.value = Number.isInteger(result) ? result : parseFloat(result.toFixed(6));
        }
    } catch (e) {
        display.value = 'Error';
        setTimeout(() => display.value = '', 1500);
    }
}

// 4. Inicialização do Botão (Onde costuma dar erro)
// Usamos o DOMContentLoaded para garantir que o HTML já existe quando o JS rodar
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('calc-toggle-btn');
    const calcDiv = document.getElementById('mini-calculator');

    if (toggleBtn && calcDiv) {
        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault(); // Evita comportamento inesperado
            calcDiv.classList.toggle('hidden');
            console.log("Calculadora"); // Para você checar no F12
        });
    } else {
        console.error("Error: Calculator elements not found.");
    }
});

//HELPCONTAINER--------------------------------------------------------------------------------
// Abertura/Fechamento do Help
document.getElementById('help-btn').addEventListener('click', () => {
    const helpContainer = document.getElementById('help-container');
    helpContainer.classList.toggle('hidden');
    if (!helpContainer.classList.contains('hidden')) {
        helpContainer.scrollIntoView({ behavior: 'smooth' });
    }
});

// Sincronizar Idioma do Help com o Botão Geral
document.getElementById('lang-btn').addEventListener('click', () => {
    // Verifica qual texto está no botão agora para saber o idioma
    // Se o botão diz 'PT | EN', significa que mudamos para Português
    const isPT = document.getElementById('lang-btn').innerText.includes('PT |');
    
    document.getElementById('content-pt').style.display = isPT ? 'block' : 'none';
    document.getElementById('content-en').style.display = isPT ? 'none' : 'block';
});

//CONTENTS--------------------------------------------------------------------------------


// 1. PRIMEIRO AS CONSTANTES (DADOS)
const conteudosEN = {
    1: `<strong>Numbers and Algebraic Expressions:</strong><br>
<strong>Real Numbers:</strong><br>
Properties: commutative, associative, distributive, identity element, inverse element.<br>
\\[ a + b = b + a, \\quad a \\cdot b = b \\cdot a \\]<br>
\\[ a + (b + c) = (a + b) + c, \\quad a \\cdot (b \\cdot c) = (a \\cdot b) \\cdot c \\]<br>
\\[ a \\cdot (b + c) = a \\cdot b + a \\cdot c \\]<br><br>

<strong>Complex Numbers:</strong><br>
Algebraic form: \\( z = a + bi \\), where \\( i^2 = -1 \\)<br>
Conjugate: \\( \\overline{z} = a - bi \\)<br>
Modulus: \\( |z| = \\sqrt{a^2 + b^2} \\)<br>
Argument: \\( \\theta = \\arctan\\left(\\frac{b}{a}\\right) \\)<br>
Trigonometric form: \\( z = r(\\cos\\theta + i\\sin\\theta) \\)<br>
Exponential form: \\( z = re^{i\\theta} \\)<br><br>

<strong>Operations with Complex Numbers:</strong><br>
Addition: \\( (a+bi) + (c+di) = (a+c) + (b+d)i \\)<br>
Multiplication: \\( (a+bi)(c+di) = (ac-bd) + (ad+bc)i \\)<br>
Division: \\( \\frac{a+bi}{c+di} = \\frac{(a+bi)(c-di)}{c^2+d^2} \\)<br><br>

<strong>De Moivre's Theorem:</strong><br>
\\[ (\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta) \\]<br>
\\[ z^n = r^n[\\cos(n\\theta) + i\\sin(n\\theta)] \\]<br><br>

<strong>Roots of Complex Numbers:</strong><br>
\\[ \\sqrt[n]{z} = \\sqrt[n]{r}\\left[\\cos\\left(\\frac{\\theta + 2k\\pi}{n}\\right) + i\\sin\\left(\\frac{\\theta + 2k\\pi}{n}\\right)\\right] \\]<br>
for \\( k = 0, 1, 2, \\dots, n-1 \\)<br><br>

<strong>Polynomials:</strong><br>
Polynomial degree, coefficients, roots.<br>
Fundamental Theorem of Algebra: Every polynomial of degree n has n complex roots.<br>
Viète's formulas (Relations between coefficients and roots).<br><br>

<strong>Factorization Example:</strong><br>
\\[ x^3 - 6x^2 + 11x - 6 = (x-1)(x-2)(x-3) \\]<br>
Roots: \\( x = 1, x = 2, x = 3 \\)<br><br>

<strong>Polynomial Division:</strong><br>
Long division method, Synthetic division (Briot-Ruffini).<br>
Remainder Theorem: \\( P(a) \\) is the remainder when \\( P(x) \\) is divided by \\( (x-a) \\)`,

    2: `<strong>Equations and Inequalities:</strong><br>

<strong>First Degree Equation:</strong><br>
\\[ ax + b = 0 \\Rightarrow x = -\\frac{b}{a} \\]<br><br>

<strong>Quadratic Equation:</strong><br>
General form: \\( ax^2 + bx + c = 0 \\)<br>
Solution by Quadratic Formula:<br>
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]<br>
Sum of roots: \\( S = -\\frac{b}{a} \\)<br>
Product of roots: \\( P = \\frac{c}{a} \\)<br><br>

<strong>Discriminant (Δ):</strong><br>
\\[ \\Delta = b^2 - 4ac \\]<br>
If \\( \\Delta > 0 \\): two distinct real roots<br>
If \\( \\Delta = 0 \\): one real double root<br>
If \\( \\Delta < 0 \\): two complex conjugate roots<br><br>

<strong>Biquadratic Equations:</strong><br>
\\[ ax^4 + bx^2 + c = 0 \\]<br>
Letting \\( y = x^2 \\), we have: \\( ay^2 + by + c = 0 \\)<br><br>

<strong>Irrational Equations:</strong><br>
\\[ \\sqrt{ax + b} = c \\Rightarrow ax + b = c^2 \\]<br><br>

<strong>Exponential Equations:</strong><br>
Properties: \\( a^m \\cdot a^n = a^{m+n} \\), \\( \\frac{a^m}{a^n} = a^{m-n} \\), \\( (a^m)^n = a^{mn} \\)<br>
Example 1: \\( 2^{x+1} = 16 \\Rightarrow 2^{x+1} = 2^4 \\Rightarrow x+1 = 4 \\Rightarrow x = 3 \\)<br>
Example 2: \\( 3^{2x} - 4\\cdot3^x + 3 = 0 \\) (letting \\( y = 3^x \\))<br><br>

<strong>Logarithmic Equations:</strong><br>
Definition: \\( \\log_a b = x \\Leftrightarrow a^x = b \\)<br>
Properties:<br>
\\[ \\log_a(mn) = \\log_a m + \\log_a n \\]<br>
\\[ \\log_a\\left(\\frac{m}{n}\\right) = \\log_a m - \\log_a n \\]<br>
\\[ \\log_a m^n = n\\log_a m \\]<br>
Change of base: \\( \\log_a b = \\frac{\\log_c b}{\\log_c a} \\)<br><br>

<strong>Inequalities:</strong><br>
<strong>First Degree Inequality:</strong><br>
\\[ ax + b > 0 \\Rightarrow x > -\\frac{b}{a} \\ (if\\ a>0) \\]<br><br>

<strong>Quadratic Inequality:</strong><br>
Solve: \\( x^2 - 4 > 0 \\)<br>
Factor: \\( (x-2)(x+2) > 0 \\)<br>
Sign chart:<br>
\\( x < -2 \\): positive × positive = positive<br>
\\( -2 < x < 2 \\): negative × positive = negative<br>
\\( x > 2 \\): positive × positive = positive<br>
Solution: \\( x < -2 \\) or \\( x > 2 \\)<br><br>

<strong>Product and Quotient Inequalities:</strong><br>
\\[ \\frac{(x-1)(x-3)}{x-2} \\geq 0 \\]<br>
Study the sign of each factor and create sign chart.<br><br>

<strong>Absolute Value Inequality:</strong><br>
\\[ |x - a| < b \\Rightarrow -b < x - a < b \\Rightarrow a - b < x < a + b \\]<br>
\\[ |x - a| > b \\Rightarrow x - a < -b \\ or \\ x - a > b \\]`,

    3: `<strong>Functions and Graphs:</strong><br>

<strong>Function Definition:</strong><br>
A function is a relation \\( f: A \\to B \\) that associates each \\( x \\in A \\) to exactly one value \\( f(x) \\in B \\).<br>
Domain: set A<br>
Codomain: set B<br>
Range: \\( \\{f(x) : x \\in A\\} \\)<br><br>

<strong>Composite Function:</strong><br>
\\[ (f \\circ g)(x) = f(g(x)) \\]<br>
Example: \\( f(x) = x^2 \\), \\( g(x) = x+1 \\)<br>
\\[ (f \\circ g)(x) = f(g(x)) = (x+1)^2 \\]<br>
\\[ (g \\circ f)(x) = g(f(x)) = x^2 + 1 \\]<br><br>

<strong>Inverse Function:</strong><br>
\\[ f(x) = 3x + 5 \\Rightarrow f^{-1}(x) = \\frac{x-5}{3} \\]<br>
Property: \\( f(f^{-1}(x)) = x \\) and \\( f^{-1}(f(x)) = x \\)<br><br>

<strong>Graph Transformations:</strong><br>
Vertical shift: \\( f(x) + k \\)<br>
Horizontal shift: \\( f(x - h) \\)<br>
Reflection over x-axis: \\( -f(x) \\)<br>
Reflection over y-axis: \\( f(-x) \\)<br>
Vertical stretch/compression: \\( A\\cdot f(x) \\)<br>
Horizontal stretch/compression: \\( f(Bx) \\)<br><br>

<strong>Function Classification:</strong><br>
Even function: \\( f(-x) = f(x) \\) (symmetric about y-axis)<br>
Odd function: \\( f(-x) = -f(x) \\) (symmetric about origin)<br>
Injective function: \\( f(x_1) = f(x_2) \\Rightarrow x_1 = x_2 \\)<br>
Surjective function: Range = Codomain<br>
Bijective function: injective and surjective<br><br>

<strong>Linear Function:</strong><br>
\\[ f(x) = ax + b \\]<br>
Graph: line with slope \\( a \\)<br>
Root: \\( x = -\\frac{b}{a} \\)<br><br>

<strong>Quadratic Function:</strong><br>
\\[ f(x) = ax^2 + bx + c \\]<br>
Vertex: \\( V = \\left(-\\frac{b}{2a}, -\\frac{\\Delta}{4a}\\right) \\)<br>
Concavity: upward if \\( a > 0 \\), downward if \\( a < 0 \\)<br><br>

<strong>Absolute Value Function:</strong><br>
\\[ f(x) = |x| = \\begin{cases} x & \\text{if } x \\geq 0 \\\\ -x & \\text{if } x < 0 \\end{cases} \\]<br><br>

<strong>Exponential Function:</strong><br>
\\[ f(x) = a^x \\quad (a > 0, a \\neq 1) \\]<br>
Growth: \\( a > 1 \\): increasing; \\( 0 < a < 1 \\): decreasing<br><br>

<strong>Logarithmic Function:</strong><br>
\\[ f(x) = \\log_a x \\quad (a > 0, a \\neq 1, x > 0) \\]<br>
Inverse of exponential function`,

    4: `<strong>Sequences and Series:</strong><br>

<strong>Arithmetic Progression (AP):</strong><br>
General term: \\( a_n = a_1 + (n-1)d \\)<br>
Common difference: \\( d = a_n - a_{n-1} \\)<br>
Sum of first n terms:<br>
\\[ S_n = \\frac{n(a_1 + a_n)}{2} \\]<br>
\\[ S_n = \\frac{n[2a_1 + (n-1)d]}{2} \\]<br>
Property: \\( a_m = \\frac{a_{m-k} + a_{m+k}}{2} \\) (equidistant terms)<br><br>

<strong>Geometric Progression (GP):</strong><br>
General term: \\( a_n = a_1 \\cdot r^{n-1} \\)<br>
Common ratio: \\( r = \\frac{a_n}{a_{n-1}} \\)<br>
Sum of first n terms:<br>
\\[ S_n = a_1 \\cdot \\frac{r^n - 1}{r - 1} \\quad (r \\neq 1) \\]<br>
\\[ S_n = n\\cdot a_1 \\quad (r = 1) \\]<br>
Product of first n terms:<br>
\\[ P_n = (a_1 \\cdot a_n)^{n/2} \\]<br><br>

<strong>Infinite GP:</strong><br>
If \\( |r| < 1 \\):<br>
\\[ S_\\infty = \\frac{a_1}{1 - r} \\]<br><br>

<strong>Summation:</strong><br>
\\[ \\sum_{k=1}^n k = 1 + 2 + 3 + \\dots + n = \\frac{n(n+1)}{2} \\]<br>
\\[ \\sum_{k=1}^n k^2 = 1^2 + 2^2 + 3^2 + \\dots + n^2 = \\frac{n(n+1)(2n+1)}{6} \\]<br>
\\[ \\sum_{k=1}^n k^3 = 1^3 + 2^3 + 3^3 + \\dots + n^3 = \\left[\\frac{n(n+1)}{2}\\right]^2 \\]<br><br>

<strong>Geometric Series:</strong><br>
\\[ \\sum_{k=0}^{n-1} ar^k = a\\frac{1-r^n}{1-r} \\]<br>
\\[ \\sum_{k=0}^\\infty ar^k = \\frac{a}{1-r} \\quad (|r| < 1) \\]<br><br>

<strong>Recursively Defined Sequences:</strong><br>
Example: Fibonacci Sequence<br>
\\[ F_1 = 1, F_2 = 1, F_n = F_{n-1} + F_{n-2} \\]`,

    5: `<strong>Trigonometry:</strong><br>

<strong>Trigonometric Ratios in Right Triangle:</strong><br>
\\[ \\sin\\theta = \\frac{\\text{opposite}}{\\text{hypotenuse}} \\]<br>
\\[ \\cos\\theta = \\frac{\\text{adjacent}}{\\text{hypotenuse}} \\]<br>
\\[ \\tan\\theta = \\frac{\\text{opposite}}{\\text{adjacent}} \\]<br><br>

<strong>Fundamental Identity:</strong><br>
\\[ \\sin^2 x + \\cos^2 x = 1 \\]<br>
\\[ 1 + \\tan^2 x = \\sec^2 x \\]<br>
\\[ 1 + \\cot^2 x = \\csc^2 x \\]<br><br>

<strong>Addition and Subtraction Formulas:</strong><br>
\\[ \\sin(a\\pm b) = \\sin a\\cos b \\pm \\cos a\\sin b \\]<br>
\\[ \\cos(a\\pm b) = \\cos a\\cos b \\mp \\sin a\\sin b \\]<br>
\\[ \\tan(a\\pm b) = \\frac{\\tan a \\pm \\tan b}{1 \\mp \\tan a\\tan b} \\]<br><br>

<strong>Double Angle Formulas:</strong><br>
\\[ \\sin(2a) = 2\\sin a\\cos a \\]<br>
\\[ \\cos(2a) = \\cos^2 a - \\sin^2 a = 2\\cos^2 a - 1 = 1 - 2\\sin^2 a \\]<br>
\\[ \\tan(2a) = \\frac{2\\tan a}{1 - \\tan^2 a} \\]<br><br>

<strong>Half Angle Formulas:</strong><br>
\\[ \\sin^2\\left(\\frac{a}{2}\\right) = \\frac{1 - \\cos a}{2} \\]<br>
\\[ \\cos^2\\left(\\frac{a}{2}\\right) = \\frac{1 + \\cos a}{2} \\]<br><br>

<strong>Product-to-Sum Formulas:</strong><br>
\\[ \\sin a + \\sin b = 2\\sin\\left(\\frac{a+b}{2}\\right)\\cos\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\sin a - \\sin b = 2\\cos\\left(\\frac{a+b}{2}\\right)\\sin\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\cos a + \\cos b = 2\\cos\\left(\\frac{a+b}{2}\\right)\\cos\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\cos a - \\cos b = -2\\sin\\left(\\frac{a+b}{2}\\right)\\sin\\left(\\frac{a-b}{2}\\right) \\]<br><br>

<strong>Law of Sines:</strong><br>
\\[ \\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R \\]<br>
where R is the radius of the circumscribed circle<br><br>

<strong>Law of Cosines:</strong><br>
\\[ a^2 = b^2 + c^2 - 2bc\\cos A \\]<br>
\\[ b^2 = a^2 + c^2 - 2ac\\cos B \\]<br>
\\[ c^2 = a^2 + b^2 - 2ab\\cos C \\]<br><br>

<strong>Trigonometric Relations in Any Triangle:</strong><br>
\\[ \\tan\\left(\\frac{A}{2}\\right) = \\frac{r}{s-a} \\]<br>
where r is the radius of the inscribed circle and s is the semiperimeter<br><br>

<strong>Inverse Trigonometric Functions:</strong><br>
\\[ \\arcsin x, \\arccos x, \\arctan x \\]`,

    6: `<strong>Analytic Geometry:</strong><br>

<strong>Cartesian System:</strong><br>
Coordinates: \\( (x, y) \\)<br>
Distance between two points:<br>
\\[ d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \\]<br><br>

<strong>Midpoint:</strong><br>
\\[ M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right) \\]<br><br>

<strong>Triangle Centroid:</strong><br>
\\[ G = \\left(\\frac{x_1 + x_2 + x_3}{3}, \\frac{y_1 + y_2 + y_3}{3}\\right) \\]<br><br>

<strong>Line:</strong><br>
General equation: \\( Ax + By + C = 0 \\)<br>
Slope-intercept form: \\( y = mx + b \\)<br>
Slope: \\( m = \\frac{y_2 - y_1}{x_2 - x_1} \\)<br>
Intercept form: \\( \\frac{x}{a} + \\frac{y}{b} = 1 \\)<br>
Parametric form: \\( x = x_0 + at, y = y_0 + bt \\)<br><br>

<strong>Angle between Lines:</strong><br>
\\[ \\tan\\theta = \\left|\\frac{m_2 - m_1}{1 + m_1m_2}\\right| \\]<br>
Parallel lines: \\( m_1 = m_2 \\)<br>
Perpendicular lines: \\( m_1 \\cdot m_2 = -1 \\)<br><br>

<strong>Distance from Point to Line:</strong><br>
\\[ d = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}} \\]<br><br>

<strong>Circle:</strong><br>
Standard form: \\( (x - h)^2 + (y - k)^2 = r^2 \\)<br>
General form: \\( x^2 + y^2 + Dx + Ey + F = 0 \\)<br>
Center: \\( C = (-\\frac{D}{2}, -\\frac{E}{2}) \\)<br>
Radius: \\( r = \\sqrt{\\left(\\frac{D}{2}\\right)^2 + \\left(\\frac{E}{2}\\right)^2 - F} \\)<br><br>

<strong>Parabola:</strong><br>
Definition: locus of points equidistant from a point (focus) and a line (directrix)<br>
Equation: \\( y = ax^2 + bx + c \\)<br>
Vertex: \\( V = (-\\frac{b}{2a}, -\\frac{\\Delta}{4a}) \\)<br>
Focus and directrix depend on orientation<br><br>

<strong>Ellipse:</strong><br>
Standard form: \\( \\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\)<br>
Foci: \\( F_1 = (-c, 0), F_2 = (c, 0) \\) with \\( c^2 = a^2 - b^2 \\)<br>
Eccentricity: \\( e = \\frac{c}{a} \\)<br><br>

<strong>Hyperbola:</strong><br>
Standard form: \\( \\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1 \\)<br>
Foci: \\( F_1 = (-c, 0), F_2 = (c, 0) \\) with \\( c^2 = a^2 + b^2 \\)<br>
Asymptotes: \\( y = \\pm\\frac{b}{a}x \\)<br><br>

<strong>General Conics:</strong><br>
General second-degree equation: \\( Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0 \\)<br>
Discriminant: \\( \\Delta = B^2 - 4AC \\)<br>
If \\( \\Delta < 0 \\): ellipse (or circle)<br>
If \\( \\Delta = 0 \\): parabola<br>
If \\( \\Delta > 0 \\): hyperbola`,

    7: `<strong>Plane Geometry:</strong><br>

<strong>Triangles:</strong><br>
Sum of interior angles: \\( A + B + C = 180^\\circ \\)<br>
Classification by sides: equilateral, isosceles, scalene<br>
Classification by angles: acute, right, obtuse<br><br>

<strong>Triangle Area:</strong><br>
\\[ A = \\frac{b\\cdot h}{2} \\]<br>
Heron's formula: \\( A = \\sqrt{s(s-a)(s-b)(s-c)} \\) where \\( s = \\frac{a+b+c}{2} \\)<br>
Using trigonometry: \\( A = \\frac{1}{2}ab\\sin C \\)<br><br>

<strong>Pythagorean Theorem:</strong><br>
\\[ a^2 + b^2 = c^2 \\]<br>
Converse: If \\( a^2 + b^2 = c^2 \\), then the triangle is right<br><br>

<strong>Metric Relations in Right Triangle:</strong><br>
\\[ h^2 = m\\cdot n \\]<br>
\\[ b^2 = a\\cdot m \\]<br>
\\[ c^2 = a\\cdot n \\]<br>
\\[ b\\cdot c = a\\cdot h \\]<br><br>

<strong>Quadrilaterals:</strong><br>
Sum of interior angles: \\( 360^\\circ \\)<br>
Rectangle area: \\( A = b\\cdot h \\)<br>
Parallelogram area: \\( A = b\\cdot h \\)<br>
Rhombus area: \\( A = \\frac{D\\cdot d}{2} \\)<br>
Trapezoid area: \\( A = \\frac{(B + b)\\cdot h}{2} \\)<br><br>

<strong>Regular Polygons:</strong><br>
Sum of interior angles: \\( S_i = (n-2)\\cdot 180^\\circ \\)<br>
Interior angle: \\( a_i = \\frac{(n-2)\\cdot 180^\\circ}{n} \\)<br>
Exterior angle: \\( a_e = \\frac{360^\\circ}{n} \\)<br>
Number of diagonals: \\( d = \\frac{n(n-3)}{2} \\)<br>
Area: \\( A = \\frac{P\\cdot ap}{2} \\) where P is perimeter and ap is apothem<br><br>

<strong>Circle and Circumference:</strong><br>
Circumference: \\( C = 2\\pi r \\)<br>
Area: \\( A = \\pi r^2 \\)<br>
Arc length: \\( \\ell = \\alpha\\cdot r \\) (α in radians)<br>
Circular sector area: \\( A = \\frac{\\alpha\\cdot r^2}{2} \\) (α in radians)<br>
Circular ring area: \\( A = \\pi(R^2 - r^2) \\)<br><br>

<strong>Similarity Ratio:</strong><br>
If \\( k \\) is the similarity ratio, then:<br>
Ratio between sides: \\( k \\)<br>
Ratio between perimeters: \\( k \\)<br>
Ratio between areas: \\( k^2 \\)<br>
Ratio between volumes: \\( k^3 \\)<br><br>

<strong>Thales' Theorem:</strong><br>
\\[ \\frac{AB}{A'B'} = \\frac{BC}{B'C'} = \\frac{AC}{A'C'} \\]`,

    8: `<strong>Spatial Geometry:</strong><br>

<strong>Polyhedra:</strong><br>
Euler's formula: \\( V - A + F = 2 \\) (for convex polyhedra)<br>
Regular polyhedra (Platonic solids): tetrahedron, hexahedron, octahedron, dodecahedron, icosahedron<br><br>

<strong>Prisms:</strong><br>
Lateral area: \\( A_l = P_b\\cdot h \\) (base perimeter × height)<br>
Total area: \\( A_t = A_l + 2A_b \\)<br>
Volume: \\( V = A_b\\cdot h \\)<br><br>

<strong>Pyramids:</strong><br>
Lateral area: sum of lateral face areas<br>
Total area: \\( A_t = A_l + A_b \\)<br>
Volume: \\( V = \\frac{1}{3}A_b\\cdot h \\)<br><br>

<strong>Cylinder:</strong><br>
Lateral area: \\( A_l = 2\\pi r h \\)<br>
Total area: \\( A_t = 2\\pi r(h + r) \\)<br>
Volume: \\( V = \\pi r^2 h \\)<br><br>

<strong>Cone:</strong><br>
Slant height: \\( g = \\sqrt{r^2 + h^2} \\)<br>
Lateral area: \\( A_l = \\pi r g \\)<br>
Total area: \\( A_t = \\pi r(g + r) \\)<br>
Volume: \\( V = \\frac{1}{3}\\pi r^2 h \\)<br><br>

<strong>Sphere:</strong><br>
Area: \\( A = 4\\pi r^2 \\)<br>
Volume: \\( V = \\frac{4}{3}\\pi r^3 \\)<br><br>

<strong>Spherical Lune and Wedge:</strong><br>
Lune area: \\( A = \\frac{\\alpha}{90^\\circ}\\pi r^2 \\) (α in degrees)<br>
Wedge volume: \\( V = \\frac{\\alpha}{270^\\circ}\\pi r^3 \\) (α in degrees)<br><br>

<strong>Truncated Solids:</strong><br>
Truncated pyramid: \\( V = \\frac{h}{3}(A_B + \\sqrt{A_B\\cdot A_b} + A_b) \\)<br>
Truncated cone: \\( V = \\frac{\\pi h}{3}(R^2 + Rr + r^2) \\)<br><br>

<strong>Inscribed and Circumscribed Solids:</strong><br>
Relations between inscribed and circumscribed solids<br><br>

<strong>Spatial Coordinates:</strong><br>
Three-dimensional Cartesian system: \\( (x, y, z) \\)<br>
Distance between points: \\( d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2} \\)`,

    9: `<strong>Matrices and Determinants:</strong><br>

<strong>Matrix Definition:</strong><br>
\\( m \\times n \\) matrix: \\( m \\) rows and \\( n \\) columns<br>
\\[ A = \\begin{bmatrix} a_{11} & a_{12} & \\dots & a_{1n} \\\\ a_{21} & a_{22} & \\dots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{m1} & a_{m2} & \\dots & a_{mn} \\end{bmatrix} \\]<br><br>

<strong>Matrix Types:</strong><br>
Row matrix, column matrix, zero matrix, square matrix<br>
Diagonal matrix, identity matrix, triangular matrix<br>
Symmetric matrix: \\( A = A^T \\)<br>
Skew-symmetric matrix: \\( A = -A^T \\)<br><br>

<strong>Matrix Operations:</strong><br>
Addition: \\( C = A + B \\Rightarrow c_{ij} = a_{ij} + b_{ij} \\)<br>
Scalar multiplication: \\( B = kA \\Rightarrow b_{ij} = k\\cdot a_{ij} \\)<br>
Matrix multiplication: \\( C = A\\cdot B \\Rightarrow c_{ij} = \\sum_{k=1}^n a_{ik}b_{kj} \\)<br>
Transposition: \\( B = A^T \\Rightarrow b_{ij} = a_{ji} \\)<br><br>

<strong>Determinants:</strong><br>
2×2 matrix: \\( \\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc \\)<br>
3×3 matrix (Sarrus' rule):<br>
\\[ \\det\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix} = aei + bfg + cdh - ceg - bdi - afh \\]<br>
Properties of determinants<br><br>

<strong>Matrix Inverse:</strong><br>
\\[ A^{-1} = \\frac{1}{\\det(A)}\\operatorname{adj}(A) \\]<br>
For 2×2 matrix:<br>
\\[ \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad-bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} \\]<br><br>

<strong>Linear Systems:</strong><br>
Matrix form: \\( AX = B \\)<br>
Solution: \\( X = A^{-1}B \\) (if \\( A \\) is invertible)<br>
Cramer's rule<br><br>

<strong>Matrix Rank:</strong><br>
Number of linearly independent rows/columns<br><br>

<strong>Eigenvalues and Eigenvectors:</strong><br>
\\[ Av = \\lambda v \\]<br>
Characteristic equation: \\( \\det(A - \\lambda I) = 0 \\)`,

    10: `<strong>Combinatorics and Probability:</strong><br>

<strong>Fundamental Counting Principle:</strong><br>
If one event can occur in m ways and another in n ways, then the two events can occur in m×n ways.<br><br>

<strong>Simple Permutations:</strong><br>
\\[ P(n) = n! = n\\cdot(n-1)\\cdot(n-2)\\cdot\\dots\\cdot 2\\cdot 1 \\]<br><br>

<strong>Permutations with Repetition:</strong><br>
\\[ P_n^{n_1,n_2,\\dots,n_k} = \\frac{n!}{n_1!\\cdot n_2!\\cdot\\dots\\cdot n_k!} \\]<br><br>

<strong>Simple Arrangements:</strong><br>
\\[ A(n,k) = \\frac{n!}{(n-k)!} \\]<br><br>

<strong>Simple Combinations:</strong><br>
\\[ C(n,k) = \\binom{n}{k} = \\frac{n!}{k!(n-k)!} \\]<br>
Properties:<br>
\\[ \\binom{n}{k} = \\binom{n}{n-k} \\]<br>
\\[ \\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k} \\] (Stifel's relation)<br><br>

<strong>Binomial Numbers and Pascal's Triangle:</strong><br>
\\[ \\binom{n}{0} = \\binom{n}{n} = 1 \\]<br>
\\[ \\binom{n}{1} = \\binom{n}{n-1} = n \\]<br><br>

<strong>Binomial Theorem:</strong><br>
\\[ (a+b)^n = \\sum_{k=0}^n \\binom{n}{k} a^{n-k}b^k \\]<br><br>

<strong>Probability:</strong><br>
Classical definition: \\( P(A) = \\frac{\\text{number of favorable outcomes}}{\\text{total number of possible outcomes}} \\)<br>
Properties:<br>
\\[ 0 \\leq P(A) \\leq 1 \\]<br>
\\[ P(\\varnothing) = 0, \\quad P(\\Omega) = 1 \\]<br>
\\[ P(A \\cup B) = P(A) + P(B) - P(A \\cap B) \\]<br>
\\[ P(A^c) = 1 - P(A) \\]<br><br>

<strong>Conditional Probability:</strong><br>
\\[ P(A|B) = \\frac{P(A \\cap B)}{P(B)} \\]<br><br>

<strong>Independent Events:</strong><br>
\\[ P(A \\cap B) = P(A)\\cdot P(B) \\]<br><br>

<strong>Bayes' Theorem:</strong><br>
\\[ P(A_i|B) = \\frac{P(B|A_i)P(A_i)}{\\sum_{j=1}^n P(B|A_j)P(A_j)} \\]<br><br>

<strong>Random Variables:</strong><br>
Expected value: \\( E[X] = \\sum x_i P(X=x_i) \\)<br>
Variance: \\( Var(X) = E[X^2] - (E[X])^2 \\)<br><br>

<strong>Probability Distributions:</strong><br>
Binomial distribution, Poisson distribution, normal distribution`,

    11: `<strong>Sets and Logic:</strong><br>

<strong>Set Theory:</strong><br>
Membership relation: \\( \\in, \\notin \\)<br>
Inclusion relation: \\( \\subset, \\subseteq, \\supset, \\supseteq \\)<br>
Empty set: \\( \\varnothing \\)<br>
Universal set: \\( U \\)<br><br>

<strong>Set Operations:</strong><br>
Union: \\( A \\cup B = \\{x : x \\in A \\text{ or } x \\in B\\} \\)<br>
Intersection: \\( A \\cap B = \\{x : x \\in A \\text{ and } x \\in B\\} \\)<br>
Difference: \\( A - B = \\{x : x \\in A \\text{ and } x \\notin B\\} \\)<br>
Complement: \\( A^c = \\{x : x \\notin A\\} \\)<br>
Symmetric difference: \\( A \\triangle B = (A - B) \\cup (B - A) \\)<br><br>

<strong>Operation Properties:</strong><br>
Commutative: \\( A \\cup B = B \\cup A, \\quad A \\cap B = B \\cap A \\)<br>
Associative: \\( (A \\cup B) \\cup C = A \\cup (B \\cup C) \\)<br>
Distributive: \\( A \\cup (B \\cap C) = (A \\cup B) \\cap (A \\cup C) \\)<br>
De Morgan's Laws:<br>
\\[ (A \\cup B)^c = A^c \\cap B^c \\]<br>
\\[ (A \\cap B)^c = A^c \\cup B^c \\]<br><br>

<strong>Cartesian Product:</strong><br>
\\[ A \\times B = \\{(a,b) : a \\in A, b \\in B\\} \\]<br><br>

<strong>Relations:</strong><br>
Domain, codomain, range<br>
Inverse relation<br><br>

<strong>Functions as Special Relations:</strong><br>
Injective function, surjective function, bijective function<br><br>

<strong>Propositional Logic:</strong><br>
Propositions, logical connectives: \\( \\land \\) (and), \\( \\lor \\) (or), \\( \\neg \\) (not), \\( \\rightarrow \\) (implies), \\( \\leftrightarrow \\) (if and only if)<br><br>

<strong>Truth Tables:</strong><br>
Conjunction: \\( p \\land q \\) is T only when both are T<br>
Disjunction: \\( p \\lor q \\) is F only when both are F<br>
Implication: \\( p \\rightarrow q \\) is F only when p is T and q is F<br>
Biconditional: \\( p \\leftrightarrow q \\) is T when p and q have same truth value<br><br>

<strong>Logical Equivalences:</strong><br>
\\[ p \\rightarrow q \\equiv \\neg p \\lor q \\]<br>
\\[ \\neg(p \\land q) \\equiv \\neg p \\lor \\neg q \\] (1st De Morgan's Law)<br>
\\[ \\neg(p \\lor q) \\equiv \\neg p \\land \\neg q \\] (2nd De Morgan's Law)<br><br>

<strong>Quantifiers:</strong><br>
Universal: \\( \\forall x \\in A, P(x) \\)<br>
Existential: \\( \\exists x \\in A, P(x) \\)<br>
Negation of quantifiers:<br>
\\[ \\neg(\\forall x P(x)) \\equiv \\exists x \\neg P(x) \\]<br>
\\[ \\neg(\\exists x P(x)) \\equiv \\forall x \\neg P(x) \\]<br><br>

<strong>Proof Methods:</strong><br>
Direct proof, proof by contraposition, proof by contradiction, proof by induction`
};

const conteudosPT = {
    1: `<strong>Números e Expressões Algébricas:</strong><br>
<strong>Números Reais:</strong><br>
Propriedades: comutativa, associativa, distributiva, elemento neutro, elemento inverso.<br>
\\[ a + b = b + a, \\quad a \\cdot b = b \\cdot a \\]<br>
\\[ a + (b + c) = (a + b) + c, \\quad a \\cdot (b \\cdot c) = (a \\cdot b) \\cdot c \\]<br>
\\[ a \\cdot (b + c) = a \\cdot b + a \\cdot c \\]<br><br>

<strong>Números Complexos:</strong><br>
Forma algébrica: \\( z = a + bi \\), onde \\( i^2 = -1 \\)<br>
Conjugado: \\( \\overline{z} = a - bi \\)<br>
Módulo: \\( |z| = \\sqrt{a^2 + b^2} \\)<br>
Argumento: \\( \\theta = \\arctan\\left(\\frac{b}{a}\\right) \\)<br>
Forma trigonométrica: \\( z = r(\\cos\\theta + i\\sin\\theta) \\)<br>
Forma exponencial: \\( z = re^{i\\theta} \\)<br><br>

<strong>Operações com Números Complexos:</strong><br>
Adição: \\( (a+bi) + (c+di) = (a+c) + (b+d)i \\)<br>
Multiplicação: \\( (a+bi)(c+di) = (ac-bd) + (ad+bc)i \\)<br>
Divisão: \\( \\frac{a+bi}{c+di} = \\frac{(a+bi)(c-di)}{c^2+d^2} \\)<br><br>

<strong>Fórmula de De Moivre:</strong><br>
\\[ (\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta) \\]<br>
\\[ z^n = r^n[\\cos(n\\theta) + i\\sin(n\\theta)] \\]<br><br>

<strong>Raízes de Números Complexos:</strong><br>
\\[ \\sqrt[n]{z} = \\sqrt[n]{r}\\left[\\cos\\left(\\frac{\\theta + 2k\\pi}{n}\\right) + i\\sin\\left(\\frac{\\theta + 2k\\pi}{n}\\right)\\right] \\]<br>
para \\( k = 0, 1, 2, \\dots, n-1 \\)<br><br>

<strong>Polinômios:</strong><br>
Grau do polinômio, coeficientes, raízes.<br>
Teorema Fundamental da Álgebra: Todo polinômio de grau n tem n raízes complexas.<br>
Relações de Girard (relações entre coeficientes e raízes).<br><br>

<strong>Exemplo de Fatoração:</strong><br>
\\[ x^3 - 6x^2 + 11x - 6 = (x-1)(x-2)(x-3) \\]<br>
Raízes: \\( x = 1, x = 2, x = 3 \\)<br><br>

<strong>Divisão de Polinômios:</strong><br>
Método da divisão longa, Divisão sintética (Briot-Ruffini).<br>
Teorema do Resto: \\( P(a) \\) é o resto da divisão de \\( P(x) \\) por \\( (x-a) \\)`,

    2: `<strong>Equações e Inequações:</strong><br>

<strong>Equação do Primeiro Grau:</strong><br>
\\[ ax + b = 0 \\Rightarrow x = -\\frac{b}{a} \\]<br><br>

<strong>Equação do Segundo Grau:</strong><br>
Forma geral: \\( ax^2 + bx + c = 0 \\)<br>
Solução por Fórmula de Bhaskara:<br>
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]<br>
Soma das raízes: \\( S = -\\frac{b}{a} \\)<br>
Produto das raízes: \\( P = \\frac{c}{a} \\)<br><br>

<strong>Discriminante (Δ):</strong><br>
\\[ \\Delta = b^2 - 4ac \\]<br>
Se \\( \\Delta > 0 \\): duas raízes reais distintas<br>
Se \\( \\Delta = 0 \\): uma raiz real dupla<br>
Se \\( \\Delta < 0 \\): duas raízes complexas conjugadas<br><br>

<strong>Equações Biquadradas:</strong><br>
\\[ ax^4 + bx^2 + c = 0 \\]<br>
Fazendo \\( y = x^2 \\), temos: \\( ay^2 + by + c = 0 \\)<br><br>

<strong>Equações Irracionais:</strong><br>
\\[ \\sqrt{ax + b} = c \\Rightarrow ax + b = c^2 \\]<br><br>

<strong>Equações Exponenciais:</strong><br>
Propriedades: \\( a^m \\cdot a^n = a^{m+n} \\), \\( \\frac{a^m}{a^n} = a^{m-n} \\), \\( (a^m)^n = a^{mn} \\)<br>
Exemplo 1: \\( 2^{x+1} = 16 \\Rightarrow 2^{x+1} = 2^4 \\Rightarrow x+1 = 4 \\Rightarrow x = 3 \\)<br>
Exemplo 2: \\( 3^{2x} - 4\\cdot3^x + 3 = 0 \\) (fazendo \\( y = 3^x \\))<br><br>

<strong>Equações Logarítmicas:</strong><br>
Definição: \\( \\log_a b = x \\Leftrightarrow a^x = b \\)<br>
Propriedades:<br>
\\[ \\log_a(mn) = \\log_a m + \\log_a n \\]<br>
\\[ \\log_a\\left(\\frac{m}{n}\\right) = \\log_a m - \\log_a n \\]<br>
\\[ \\log_a m^n = n\\log_a m \\]<br>
Mudança de base: \\( \\log_a b = \\frac{\\log_c b}{\\log_c a} \\)<br><br>

<strong>Inequações:</strong><br>
<strong>Inequação do Primeiro Grau:</strong><br>
\\[ ax + b > 0 \\Rightarrow x > -\\frac{b}{a} \\ (se\\ a>0) \\]<br><br>

<strong>Inequação do Segundo Grau:</strong><br>
Resolva: \\( x^2 - 4 > 0 \\)<br>
Fatore: \\( (x-2)(x+2) > 0 \\)<br>
Quadro de sinais:<br>
\\( x < -2 \\): positivo × positivo = positivo<br>
\\( -2 < x < 2 \\): negativo × positivo = negativo<br>
\\( x > 2 \\): positivo × positivo = positivo<br>
Solução: \\( x < -2 \\) ou \\( x > 2 \\)<br><br>

<strong>Inequações-Produto e Quociente:</strong><br>
\\[ \\frac{(x-1)(x-3)}{x-2} \\geq 0 \\]<br>
Estude o sinal de cada fator e faça quadro de sinais.<br><br>

<strong>Inequação Modular:</strong><br>
\\[ |x - a| < b \\Rightarrow -b < x - a < b \\Rightarrow a - b < x < a + b \\]<br>
\\[ |x - a| > b \\Rightarrow x - a < -b \\ ou \\ x - a > b \\]`,

    3: `<strong>Funções e Gráficos:</strong><br>

<strong>Definição de Função:</strong><br>
Uma função é uma relação \\( f: A \\to B \\) que associa cada \\( x \\in A \\) a exatamente um valor \\( f(x) \\in B \\).<br>
Domínio: conjunto A<br>
Contradomínio: conjunto B<br>
Imagem: \\( \\{f(x) : x \\in A\\} \\)<br><br>

<strong>Função Composta:</strong><br>
\\[ (f \\circ g)(x) = f(g(x)) \\]<br>
Exemplo: \\( f(x) = x^2 \\), \\( g(x) = x+1 \\)<br>
\\[ (f \\circ g)(x) = f(g(x)) = (x+1)^2 \\]<br>
\\[ (g \\circ f)(x) = g(f(x)) = x^2 + 1 \\]<br><br>

<strong>Função Inversa:</strong><br>
\\[ f(x) = 3x + 5 \\Rightarrow f^{-1}(x) = \\frac{x-5}{3} \\]<br>
Propriedade: \\( f(f^{-1}(x)) = x \\) e \\( f^{-1}(f(x)) = x \\)<br><br>

<strong>Transformações de Gráficos:</strong><br>
Translação vertical: \\( f(x) + k \\)<br>
Translação horizontal: \\( f(x - h) \\)<br>
Reflexão no eixo x: \\( -f(x) \\)<br>
Reflexão no eixo y: \\( f(-x) \\)<br>
Dilatação/compressão vertical: \\( A\\cdot f(x) \\)<br>
Dilatação/compressão horizontal: \\( f(Bx) \\)<br><br>

<strong>Classificação de Funções:</strong><br>
Função par: \\( f(-x) = f(x) \\) (simétrica em relação ao eixo y)<br>
Função ímpar: \\( f(-x) = -f(x) \\) (simétrica em relação à origem)<br>
Função injetora: \\( f(x_1) = f(x_2) \\Rightarrow x_1 = x_2 \\)<br>
Função sobrejetora: Imagem = Contradomínio<br>
Função bijetora: injetora e sobrejetora<br><br>

<strong>Função Afim:</strong><br>
\\[ f(x) = ax + b \\]<br>
Gráfico: reta com coeficiente angular \\( a \\)<br>
Raiz: \\( x = -\\frac{b}{a} \\)<br><br>

<strong>Função Quadrática:</strong><br>
\\[ f(x) = ax^2 + bx + c \\]<br>
Vértice: \\( V = \\left(-\\frac{b}{2a}, -\\frac{\\Delta}{4a}\\right) \\)<br>
Concavidade: para cima se \\( a > 0 \\), para baixo se \\( a < 0 \\)<br><br>

<strong>Função Modular:</strong><br>
\\[ f(x) = |x| = \\begin{cases} x & \\text{se } x \\geq 0 \\\\ -x & \\text{se } x < 0 \\end{cases} \\]<br><br>

<strong>Função Exponencial:</strong><br>
\\[ f(x) = a^x \\quad (a > 0, a \\neq 1) \\]<br>
Crescimento: \\( a > 1 \\): crescente; \\( 0 < a < 1 \\): decrescente<br><br>

<strong>Função Logarítmica:</strong><br>
\\[ f(x) = \\log_a x \\quad (a > 0, a \\neq 1, x > 0) \\]<br>
Inversa da função exponencial`,

    4: `<strong>Progressões e Séries:</strong><br>

<strong>Progressão Aritmética (PA):</strong><br>
Termo geral: \\( a_n = a_1 + (n-1)r \\)<br>
Razão: \\( r = a_n - a_{n-1} \\)<br>
Soma dos n primeiros termos:<br>
\\[ S_n = \\frac{n(a_1 + a_n)}{2} \\]<br>
\\[ S_n = \\frac{n[2a_1 + (n-1)r]}{2} \\]<br>
Propriedade: \\( a_m = \\frac{a_{m-k} + a_{m+k}}{2} \\) (termos equidistantes)<br><br>

<strong>Progressão Geométrica (PG):</strong><br>
Termo geral: \\( a_n = a_1 \\cdot q^{n-1} \\)<br>
Razão: \\( q = \\frac{a_n}{a_{n-1}} \\)<br>
Soma dos n primeiros termos:<br>
\\[ S_n = a_1 \\cdot \\frac{q^n - 1}{q - 1} \\quad (q \\neq 1) \\]<br>
\\[ S_n = n\\cdot a_1 \\quad (q = 1) \\]<br>
Produto dos n primeiros termos:<br>
\\[ P_n = (a_1 \\cdot a_n)^{n/2} \\]<br><br>

<strong>PG Infinita:</strong><br>
Se \\( |q| < 1 \\):<br>
\\[ S_\\infty = \\frac{a_1}{1 - q} \\]<br><br>

<strong>Somatórios:</strong><br>
\\[ \\sum_{k=1}^n k = 1 + 2 + 3 + \\dots + n = \\frac{n(n+1)}{2} \\]<br>
\\[ \\sum_{k=1}^n k^2 = 1^2 + 2^2 + 3^2 + \\dots + n^2 = \\frac{n(n+1)(2n+1)}{6} \\]<br>
\\[ \\sum_{k=1}^n k^3 = 1^3 + 2^3 + 3^3 + \\dots + n^3 = \\left[\\frac{n(n+1)}{2}\\right]^2 \\]<br><br>

<strong>Série Geométrica:</strong><br>
\\[ \\sum_{k=0}^{n-1} aq^k = a\\frac{1-q^n}{1-q} \\]<br>
\\[ \\sum_{k=0}^\\infty aq^k = \\frac{a}{1-q} \\quad (|q| < 1) \\]<br><br>

<strong>Sequências Definidas Recursivamente:</strong><br>
Exemplo: Sequência de Fibonacci<br>
\\[ F_1 = 1, F_2 = 1, F_n = F_{n-1} + F_{n-2} \\]`,

    5: `<strong>Trigonometria:</strong><br>

<strong>Razões Trigonométricas no Triângulo Retângulo:</strong><br>
\\[ \\sin\\theta = \\frac{\\text{cateto oposto}}{\\text{hipotenusa}} \\]<br>
\\[ \\cos\\theta = \\frac{\\text{cateto adjacente}}{\\text{hipotenusa}} \\]<br>
\\[ \\tan\\theta = \\frac{\\text{cateto oposto}}{\\text{cateto adjacente}} \\]<br><br>

<strong>Identidade Fundamental:</strong><br>
\\[ \\sin^2 x + \\cos^2 x = 1 \\]<br>
\\[ 1 + \\tan^2 x = \\sec^2 x \\]<br>
\\[ 1 + \\cot^2 x = \\csc^2 x \\]<br><br>

<strong>Fórmulas de Adição e Subtração:</strong><br>
\\[ \\sin(a\\pm b) = \\sin a\\cos b \\pm \\cos a\\sin b \\]<br>
\\[ \\cos(a\\pm b) = \\cos a\\cos b \\mp \\sin a\\sin b \\]<br>
\\[ \\tan(a\\pm b) = \\frac{\\tan a \\pm \\tan b}{1 \\mp \\tan a\\tan b} \\]<br><br>

<strong>Fórmulas de Arco Duplo:</strong><br>
\\[ \\sin(2a) = 2\\sin a\\cos a \\]<br>
\\[ \\cos(2a) = \\cos^2 a - \\sin^2 a = 2\\cos^2 a - 1 = 1 - 2\\sin^2 a \\]<br>
\\[ \\tan(2a) = \\frac{2\\tan a}{1 - \\tan^2 a} \\]<br><br>

<strong>Fórmulas de Arco Metade:</strong><br>
\\[ \\sin^2\\left(\\frac{a}{2}\\right) = \\frac{1 - \\cos a}{2} \\]<br>
\\[ \\cos^2\\left(\\frac{a}{2}\\right) = \\frac{1 + \\cos a}{2} \\]<br><br>

<strong>Fórmulas de Transformação em Produto:</strong><br>
\\[ \\sin a + \\sin b = 2\\sin\\left(\\frac{a+b}{2}\\right)\\cos\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\sin a - \\sin b = 2\\cos\\left(\\frac{a+b}{2}\\right)\\sin\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\cos a + \\cos b = 2\\cos\\left(\\frac{a+b}{2}\\right)\\cos\\left(\\frac{a-b}{2}\\right) \\]<br>
\\[ \\cos a - \\cos b = -2\\sin\\left(\\frac{a+b}{2}\\right)\\sin\\left(\\frac{a-b}{2}\\right) \\]<br><br>

<strong>Lei dos Senos:</strong><br>
\\[ \\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R \\]<br>
onde R é o raio da circunferência circunscrita<br><br>

<strong>Lei dos Cossenos:</strong><br>
\\[ a^2 = b^2 + c^2 - 2bc\\cos A \\]<br>
\\[ b^2 = a^2 + c^2 - 2ac\\cos B \\]<br>
\\[ c^2 = a^2 + b^2 - 2ab\\cos C \\]<br><br>

<strong>Relações Trigonométricas em Qualquer Triângulo:</strong><br>
\\[ \\tan\\left(\\frac{A}{2}\\right) = \\frac{r}{s-a} \\]<br>
onde r é o raio da circunferência inscrita e s é o semiperímetro<br><br>

<strong>Funções Trigonométricas Inversas:</strong><br>
\\[ \\arcsin x, \\arccos x, \\arctan x \\]`,

    6: `<strong>Geometria Analítica:</strong><br>

<strong>Sistema Cartesiano:</strong><br>
Coordenadas: \\( (x, y) \\)<br>
Distância entre dois pontos:<br>
\\[ d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2} \\]<br><br>

<strong>Ponto Médio:</strong><br>
\\[ M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right) \\]<br><br>

<strong>Baricentro do Triângulo:</strong><br>
\\[ G = \\left(\\frac{x_1 + x_2 + x_3}{3}, \\frac{y_1 + y_2 + y_3}{3}\\right) \\]<br><br>

<strong>Reta:</strong><br>
Equação geral: \\( Ax + By + C = 0 \\)<br>
Forma reduzida: \\( y = mx + b \\)<br>
Coeficiente angular: \\( m = \\frac{y_2 - y_1}{x_2 - x_1} \\)<br>
Forma segmentária: \\( \\frac{x}{a} + \\frac{y}{b} = 1 \\)<br>
Forma paramétrica: \\( x = x_0 + at, y = y_0 + bt \\)<br><br>

<strong>Ângulo entre Retas:</strong><br>
\\[ \\tan\\theta = \\left|\\frac{m_2 - m_1}{1 + m_1m_2}\\right| \\]<br>
Retas paralelas: \\( m_1 = m_2 \\)<br>
Retas perpendiculares: \\( m_1 \\cdot m_2 = -1 \\)<br><br>

<strong>Distância de Ponto à Reta:</strong><br>
\\[ d = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}} \\]<br><br>

<strong>Circunferência:</strong><br>
Forma padrão: \\( (x - h)^2 + (y - k)^2 = r^2 \\)<br>
Forma geral: \\( x^2 + y^2 + Dx + Ey + F = 0 \\)<br>
Centro: \\( C = (-\\frac{D}{2}, -\\frac{E}{2}) \\)<br>
Raio: \\( r = \\sqrt{\\left(\\frac{D}{2}\\right)^2 + \\left(\\frac{E}{2}\\right)^2 - F} \\)<br><br>

<strong>Parábola:</strong><br>
Definição: lugar geométrico dos pontos equidistantes de um ponto (foco) e uma reta (diretriz)<br>
Equação: \\( y = ax^2 + bx + c \\)<br>
Vértice: \\( V = (-\\frac{b}{2a}, -\\frac{\\Delta}{4a}) \\)<br>
Foco e diretriz dependem da orientação<br><br>

<strong>Elipse:</strong><br>
Forma padrão: \\( \\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1 \\)<br>
Focos: \\( F_1 = (-c, 0), F_2 = (c, 0) \\) com \\( c^2 = a^2 - b^2 \\)<br>
Excentricidade: \\( e = \\frac{c}{a} \\)<br><br>

<strong>Hipérbole:</strong><br>
Forma padrão: \\( \\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1 \\)<br>
Focos: \\( F_1 = (-c, 0), F_2 = (c, 0) \\) com \\( c^2 = a^2 + b^2 \\)<br>
Assíntotas: \\( y = \\pm\\frac{b}{a}x \\)<br><br>

<strong>Cônicas Gerais:</strong><br>
Equação geral do 2º grau: \\( Ax^2 + Bxy + Cy^2 + Dx + Ey + F = 0 \\)<br>
Discriminante: \\( \\Delta = B^2 - 4AC \\)<br>
Se \\( \\Delta < 0 \\): elipse (ou circunferência)<br>
Se \\( \\Delta = 0 \\): parábola<br>
Se \\( \\Delta > 0 \\): hipérbole`,

    7: `<strong>Geometria Plana:</strong><br>

<strong>Triângulos:</strong><br>
Soma dos ângulos internos: \\( A + B + C = 180^\\circ \\)<br>
Classificação por lados: equilátero, isósceles, escaleno<br>
Classificação por ângulos: acutângulo, retângulo, obtusângulo<br><br>

<strong>Área do Triângulo:</strong><br>
\\[ A = \\frac{b\\cdot h}{2} \\]<br>
Fórmula de Heron: \\( A = \\sqrt{s(s-a)(s-b)(s-c)} \\) onde \\( s = \\frac{a+b+c}{2} \\)<br>
Usando trigonometria: \\( A = \\frac{1}{2}ab\\sin C \\)<br><br>

<strong>Teorema de Pitágoras:</strong><br>
\\[ a^2 + b^2 = c^2 \\]<br>
Recíproca: Se \\( a^2 + b^2 = c^2 \\), então o triângulo é retângulo<br><br>

<strong>Relações Métricas no Triângulo Retângulo:</strong><br>
\\[ h^2 = m\\cdot n \\]<br>
\\[ b^2 = a\\cdot m \\]<br>
\\[ c^2 = a\\cdot n \\]<br>
\\[ b\\cdot c = a\\cdot h \\]<br><br>

<strong>Quadriláteros:</strong><br>
Soma dos ângulos internos: \\( 360^\\circ \\)<br>
Área do retângulo: \\( A = b\\cdot h \\)<br>
Área do paralelogramo: \\( A = b\\cdot h \\)<br>
Área do losango: \\( A = \\frac{D\\cdot d}{2} \\)<br>
Área do trapézio: \\( A = \\frac{(B + b)\\cdot h}{2} \\)<br><br>

<strong>Polígonos Regulares:</strong><br>
Soma dos ângulos internos: \\( S_i = (n-2)\\cdot 180^\\circ \\)<br>
Ângulo interno: \\( a_i = \\frac{(n-2)\\cdot 180^\\circ}{n} \\)<br>
Ângulo externo: \\( a_e = \\frac{360^\\circ}{n} \\)<br>
Número de diagonais: \\( d = \\frac{n(n-3)}{2} \\)<br>
Área: \\( A = \\frac{P\\cdot ap}{2} \\) onde P é perímetro e ap é apótema<br><br>

<strong>Círculo e Circunferência:</strong><br>
Circunferência: \\( C = 2\\pi r \\)<br>
Área: \\( A = \\pi r^2 \\)<br>
Comprimento do arco: \\( \\ell = \\alpha\\cdot r \\) (α em radianos)<br>
Área do setor circular: \\( A = \\frac{\\alpha\\cdot r^2}{2} \\) (α em radianos)<br>
Área da coroa circular: \\( A = \\pi(R^2 - r^2) \\)<br><br>

<strong>Razão de Semelhança:</strong><br>
Se \\( k \\) é a razão de semelhança, então:<br>
Razão entre lados: \\( k \\)<br>
Razão entre perímetros: \\( k \\)<br>
Razão entre áreas: \\( k^2 \\)<br>
Razão entre volumes: \\( k^3 \\)<br><br>

<strong>Teorema de Tales:</strong><br>
\\[ \\frac{AB}{A'B'} = \\frac{BC}{B'C'} = \\frac{AC}{A'C'} \\]`,

    8: `<strong>Geometria Espacial:</strong><br>

<strong>Poliedros:</strong><br>
Fórmula de Euler: \\( V - A + F = 2 \\) (para poliedros convexos)<br>
Poliedros regulares (sólidos platônicos): tetraedro, hexaedro, octaedro, dodecaedro, icosaedro<br><br>

<strong>Prismas:</strong><br>
Área lateral: \\( A_l = P_b\\cdot h \\) (perímetro da base × altura)<br>
Área total: \\( A_t = A_l + 2A_b \\)<br>
Volume: \\( V = A_b\\cdot h \\)<br><br>

<strong>Pirâmides:</strong><br>
Área lateral: soma das áreas das faces laterais<br>
Área total: \\( A_t = A_l + A_b \\)<br>
Volume: \\( V = \\frac{1}{3}A_b\\cdot h \\)<br><br>

<strong>Cilindro:</strong><br>
Área lateral: \\( A_l = 2\\pi r h \\)<br>
Área total: \\( A_t = 2\\pi r(h + r) \\)<br>
Volume: \\( V = \\pi r^2 h \\)<br><br>

<strong>Cone:</strong><br>
Geratriz: \\( g = \\sqrt{r^2 + h^2} \\)<br>
Área lateral: \\( A_l = \\pi r g \\)<br>
Área total: \\( A_t = \\pi r(g + r) \\)<br>
Volume: \\( V = \\frac{1}{3}\\pi r^2 h \\)<br><br>

<strong>Esfera:</strong><br>
Área: \\( A = 4\\pi r^2 \\)<br>
Volume: \\( V = \\frac{4}{3}\\pi r^3 \\)<br><br>

<strong>Fuso e Cunha Esféricos:</strong><br>
Área do fuso: \\( A = \\frac{\\alpha}{90^\\circ}\\pi r^2 \\) (α em graus)<br>
Volume da cunha: \\( V = \\frac{\\alpha}{270^\\circ}\\pi r^3 \\) (α em graus)<br><br>

<strong>Sólidos de Revolução Truncados:</strong><br>
Tronco de pirâmide: \\( V = \\frac{h}{3}(A_B + \\sqrt{A_B\\cdot A_b} + A_b) \\)<br>
Tronco de cone: \\( V = \\frac{\\pi h}{3}(R^2 + Rr + r^2) \\)<br><br>

<strong>Sólidos Inscritos e Circunscritos:</strong><br>
Relações entre sólidos inscritos e circunscritos<br><br>

<strong>Coordenadas Espaciais:</strong><br>
Sistema cartesiano tridimensional: \\( (x, y, z) \\)<br>
Distância entre pontos: \\( d = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2 + (z_2-z_1)^2} \\)`,

    9: `<strong>Matrizes e Determinantes:</strong><br>

<strong>Definição de Matriz:</strong><br>
Matriz \\( m \\times n \\): \\( m \\) linhas e \\( n \\) colunas<br>
\\[ A = \\begin{bmatrix} a_{11} & a_{12} & \\dots & a_{1n} \\\\ a_{21} & a_{22} & \\dots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{m1} & a_{m2} & \\dots & a_{mn} \\end{bmatrix} \\]<br><br>

<strong>Tipos de Matrizes:</strong><br>
Matriz linha, matriz coluna, matriz nula, matriz quadrada<br>
Matriz diagonal, matriz identidade, matriz triangular<br>
Matriz simétrica: \\( A = A^T \\)<br>
Matriz antissimétrica: \\( A = -A^T \\)<br><br>

<strong>Operações com Matrizes:</strong><br>
Adição: \\( C = A + B \\Rightarrow c_{ij} = a_{ij} + b_{ij} \\)<br>
Multiplicação por escalar: \\( B = kA \\Rightarrow b_{ij} = k\\cdot a_{ij} \\)<br>
Multiplicação de matrizes: \\( C = A\\cdot B \\Rightarrow c_{ij} = \\sum_{k=1}^n a_{ik}b_{kj} \\)<br>
Transposição: \\( B = A^T \\Rightarrow b_{ij} = a_{ji} \\)<br><br>

<strong>Determinantes:</strong><br>
Matriz 2×2: \\( \\det\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix} = ad - bc \\)<br>
Matriz 3×3 (regra de Sarrus):<br>
\\[ \\det\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix} = aei + bfg + cdh - ceg - bdi - afh \\]<br>
Propriedades dos determinantes<br><br>

<strong>Matriz Inversa:</strong><br>
\\[ A^{-1} = \\frac{1}{\\det(A)}\\operatorname{adj}(A) \\]<br>
Para matriz 2×2:<br>
\\[ \\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}^{-1} = \\frac{1}{ad-bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} \\]<br><br>

<strong>Sistemas Lineares:</strong><br>
Forma matricial: \\( AX = B \\)<br>
Solução: \\( X = A^{-1}B \\) (se \\( A \\) for invertível)<br>
Regra de Cramer<br><br>

<strong>Posto de uma Matriz:</strong><br>
Número de linhas/colunas linearmente independentes<br><br>

<strong>Autovalores e Autovetores:</strong><br>
\\[ Av = \\lambda v \\]<br>
Equação característica: \\( \\det(A - \\lambda I) = 0 \\)`,

    10: `<strong>Combinatória e Probabilidade:</strong><br>

<strong>Princípio Fundamental da Contagem:</strong><br>
Se um evento pode ocorrer de m maneiras e outro de n maneiras, então os dois eventos podem ocorrer de m×n maneiras.<br><br>

<strong>Permutações Simples:</strong><br>
\\[ P(n) = n! = n\\cdot(n-1)\\cdot(n-2)\\cdot\\dots\\cdot 2\\cdot 1 \\]<br><br>

<strong>Permutações com Repetição:</strong><br>
\\[ P_n^{n_1,n_2,\\dots,n_k} = \\frac{n!}{n_1!\\cdot n_2!\\cdot\\dots\\cdot n_k!} \\]<br><br>

<strong>Arranjos Simples:</strong><br>
\\[ A(n,k) = \\frac{n!}{(n-k)!} \\]<br><br>

<strong>Combinações Simples:</strong><br>
\\[ C(n,k) = \\binom{n}{k} = \\frac{n!}{k!(n-k)!} \\]<br>
Propriedades:<br>
\\[ \\binom{n}{k} = \\binom{n}{n-k} \\]<br>
\\[ \\binom{n}{k} = \\binom{n-1}{k-1} + \\binom{n-1}{k} \\] (relação de Stifel)<br><br>

<strong>Números Binomiais e Triângulo de Pascal:</strong><br>
\\[ \\binom{n}{0} = \\binom{n}{n} = 1 \\]<br>
\\[ \\binom{n}{1} = \\binom{n}{n-1} = n \\]<br><br>

<strong>Binômio de Newton:</strong><br>
\\[ (a+b)^n = \\sum_{k=0}^n \\binom{n}{k} a^{n-k}b^k \\]<br><br>

<strong>Probabilidade:</strong><br>
Definição clássica: \\( P(A) = \\frac{\\text{número de casos favoráveis}}{\\text{número total de casos possíveis}} \\)<br>
Propriedades:<br>
\\[ 0 \\leq P(A) \\leq 1 \\]<br>
\\[ P(\\varnothing) = 0, \\quad P(\\Omega) = 1 \\]<br>
\\[ P(A \\cup B) = P(A) + P(B) - P(A \\cap B) \\]<br>
\\[ P(A^c) = 1 - P(A) \\]<br><br>

<strong>Probabilidade Condicional:</strong><br>
\\[ P(A|B) = \\frac{P(A \\cap B)}{P(B)} \\]<br><br>

<strong>Eventos Independentes:</strong><br>
\\[ P(A \\cap B) = P(A)\\cdot P(B) \\]<br><br>

<strong>Teorema de Bayes:</strong><br>
\\[ P(A_i|B) = \\frac{P(B|A_i)P(A_i)}{\\sum_{j=1}^n P(B|A_j)P(A_j)} \\]<br><br>

<strong>Variáveis Aleatórias:</strong><br>
Valor esperado: \\( E[X] = \\sum x_i P(X=x_i) \\)<br>
Variância: \\( Var(X) = E[X^2] - (E[X])^2 \\)<br><br>

<strong>Distribuições de Probabilidade:</strong><br>
Distribuição binomial, distribuição de Poisson, distribuição normal`,

    11: `<strong>Conjuntos e Lógica:</strong><br>

<strong>Teoria dos Conjuntos:</strong><br>
Relação de pertinência: \\( \\in, \\notin \\)<br>
Relação de inclusão: \\( \\subset, \\subseteq, \\supset, \\supseteq \\)<br>
Conjunto vazio: \\( \\varnothing \\)<br>
Conjunto universo: \\( U \\)<br><br>

<strong>Operações com Conjuntos:</strong><br>
União: \\( A \\cup B = \\{x : x \\in A \\text{ ou } x \\in B\\} \\)<br>
Interseção: \\( A \\cap B = \\{x : x \\in A \\text{ e } x \\in B\\} \\)<br>
Diferença: \\( A - B = \\{x : x \\in A \\text{ e } x \\notin B\\} \\)<br>
Complementar: \\( A^c = \\{x : x \\notin A\\} \\)<br>
Diferença simétrica: \\( A \\triangle B = (A - B) \\cup (B - A) \\)<br><br>

<strong>Propriedades das Operações:</strong><br>
Comutativa: \\( A \\cup B = B \\cup A, \\quad A \\cap B = B \\cap A \\)<br>
Associativa: \\( (A \\cup B) \\cup C = A \\cup (B \\cup C) \\)<br>
Distributiva: \\( A \\cup (B \\cap C) = (A \\cup B) \\cap (A \\cup C) \\)<br>
Leis de De Morgan:<br>
\\[ (A \\cup B)^c = A^c \\cap B^c \\]<br>
\\[ (A \\cap B)^c = A^c \\cup B^c \\]<br><br>

<strong>Produto Cartesiano:</strong><br>
\\[ A \\times B = \\{(a,b) : a \\in A, b \\in B\\} \\]<br><br>

<strong>Relações:</strong><br>
Domínio, contradomínio, imagem<br>
Relação inversa<br><br>

<strong>Funções como Relações Especiais:</strong><br>
Função injetora, função sobrejetora, função bijetora<br><br>

<strong>Lógica Proposicional:</strong><br>
Proposições, conectivos lógicos: \\( \\land \\) (e), \\( \\lor \\) (ou), \\( \\neg \\) (não), \\( \\rightarrow \\) (implica), \\( \\leftrightarrow \\) (se e somente se)<br><br>

<strong>Tabelas-Verdade:</strong><br>
Conjunção: \\( p \\land q \\) é V apenas quando ambos são V<br>
Disjunção: \\( p \\lor q \\) é F apenas quando ambos são F<br>
Implicação: \\( p \\rightarrow q \\) é F apenas quando p é V e q é F<br>
Bicondicional: \\( p \\leftrightarrow q \\) é V quando p e q têm mesmo valor lógico<br><br>

<strong>Equivalências Lógicas:</strong><br>
\\[ p \\rightarrow q \\equiv \\neg p \\lor q \\]<br>
\\[ \\neg(p \\land q) \\equiv \\neg p \\lor \\neg q \\] (1ª Lei de De Morgan)<br>
\\[ \\neg(p \\lor q) \\equiv \\neg p \\land \\neg q \\] (2ª Lei de De Morgan)<br><br>

<strong>Quantificadores:</strong><br>
Universal: \\( \\forall x \\in A, P(x) \\)<br>
Existencial: \\( \\exists x \\in A, P(x) \\)<br>
Negação de quantificadores:<br>
\\[ \\neg(\\forall x P(x)) \\equiv \\exists x \\neg P(x) \\]<br>
\\[ \\neg(\\exists x P(x)) \\equiv \\forall x \\neg P(x) \\]<br><br>

<strong>Métodos de Demonstração:</strong><br>
Demonstração direta, demonstração por contraposição, demonstração por contradição, demonstração por indução`
};

// Certifique-se que conteudosPT e conteudosEN estão definidos antes deste bloco!

const materiasBtn = document.getElementById('materias-btn');
const materiasContainer = document.getElementById('materias-container');
const materiaCorpo = document.getElementById('materia-corpo');
const selPT = document.getElementById('materia-selector-pt');
const selEN = document.getElementById('materia-selector-en');

function atualizarMateria(id) {
    if (!id) return;
    
    const isPT = document.getElementById('materia-pt').checked;
    const banco = isPT ? conteudosPT : conteudosEN;

    if (banco[id]) {
        materiaCorpo.innerHTML = banco[id];
        if (window.MathJax) {
            MathJax.typesetPromise([materiaCorpo]);
        }
    }
}

// Escuta mudanças nos dois selects
selPT.addEventListener('change', (e) => atualizarMateria(e.target.value));
selEN.addEventListener('change', (e) => atualizarMateria(e.target.value));

// Escuta troca de idioma nos rádios para resetar o corpo
document.querySelectorAll('input[name="materia-lang"]').forEach(radio => {
    radio.addEventListener('change', () => {
        materiaCorpo.innerHTML = ""; // Limpa ao trocar idioma
        selPT.value = "";
        selEN.value = "";
    });
});

// Abre e fecha o container
materiasBtn.addEventListener('click', () => {
    materiasContainer.classList.toggle('hidden');
});