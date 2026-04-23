export interface Idea {
    title: string;
    description: string;
    difficulty: "初級" | "中級" | "上級";
    input: string;
    output: string;
}

export interface ProposalResponse {
    analysis: string;
    ideas: Idea[];
}

export interface Step {
    stepNumber: number;
    title: string;
    description: string;
    prompt: string;
    nextAction: string;
}

export interface PromptResponse {
    steps: Step[];
}

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

function extractJson(text: string): string {
    const match = text.match(/```json\n([\s\S]*?)\n```/);
    if (match && match[1]) {
        return match[1];
    }
    // Try to parse raw text if no markdown block
    return text;
}

export async function fetchProposals(apiKey: string, userInput: string): Promise<ProposalResponse> {
    const prompt = `ユーザーの業務内容: "${userInput}"

この業務において、LLMを活用して「1クリックで完了するような自動化・効率化ツール」のアイデアを4つ提案してください。
JSON形式で出力してください。以下のプロパティを含めること：
- analysis: 業務の分析と仮説（全体的な講評）
- ideas: 以下のプロパティを持つ要素が4つの配列
  - title: タイトル
  - description: 概要
  - difficulty: 難易度（"初級", "中級", "上級" のいずれか）
  - input: ユーザーが入力する情報
  - output: AIが出力する情報
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonText = extractJson(rawText);
    return JSON.parse(jsonText) as ProposalResponse;
}

export async function fetchPromptSteps(apiKey: string, idea: Idea): Promise<PromptResponse> {
    const prompt = `選択されたアイデア: "${idea.title}"
概要: "${idea.description}"
INPUT: "${idea.input}"
OUTPUT: "${idea.output}"

このアイデアを実現するためのLLMプロンプトを、段階を追って構築するステップを作成してください。
ステップ1は基本機能（MVP）、ステップ2は機能拡張としてください（合計2〜3ステップ）。
JSON形式で出力してください。以下のプロパティを含めること：
- steps: 以下のプロパティを持つ要素の配列
  - stepNumber: ステップ番号（1, 2...）
  - title: ステップのタイトル
  - description: 目的・概要
  - prompt: 実際にLLMに投げるシステム指示文のテンプレート
  - nextAction: 次に必要な情報（次に改善・確認すべきこと）
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json"
            }
        }),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonText = extractJson(rawText);
    return JSON.parse(jsonText) as PromptResponse;
}

// --- API Backend Integration ---

const BACKEND_URL = '/api';

export async function registerUser(name: string, email: string, password: string) {
  const response = await fetch(`${BACKEND_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to register');
  }
  
  return response.json();
}

export async function loginUser(email: string, password: string) {
  const response = await fetch(`${BACKEND_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Invalid credentials');
  }
  
  return response.json();
}

export async function fetchBookmarks(userId: number) {
  const response = await fetch(`${BACKEND_URL}/bookmarks/${userId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch bookmarks');
  }
  
  return response.json();
}

export async function addBookmark(userId: number, idea: Idea) {
  const response = await fetch(`${BACKEND_URL}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      title: idea.title,
      description: idea.description,
      input: idea.input,
      output: idea.output
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add bookmark');
  }
  
  return response.json();
}

export async function removeBookmark(userId: number, title: string) {
  const response = await fetch(`${BACKEND_URL}/bookmarks/${userId}/${encodeURIComponent(title)}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove bookmark');
  }
  
  return response.json();
}
