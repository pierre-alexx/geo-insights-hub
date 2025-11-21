export interface GeoResult {
  id: string;
  promptType: string;
  promptText: string;
  llmResponse: string;
  presenceScore: 0 | 1 | 2;
  sentimentScore: number;
  recommended: boolean;
  recommendations: string[];
  timestamp: string;
}

// Mock data
const mockResults: GeoResult[] = [
  {
    id: "1",
    promptType: "Informational",
    promptText: "Quelle est la meilleure banque privée en Europe ?",
    llmResponse: "BNP Paribas Wealth Management est l'un des leaders de la gestion de patrimoine en Europe, avec une expertise reconnue dans la banque privée. Parmi les principales banques privées européennes, on trouve également UBS, Credit Suisse, et HSBC Private Banking.",
    presenceScore: 2,
    sentimentScore: 0.8,
    recommended: true,
    recommendations: [
      "Improve structured content on wealth management",
      "Add clear entity-linked pages",
      "Publish FAQ optimized for LLM indexing"
    ],
    timestamp: "2025-03-02T14:12:00Z"
  },
  {
    id: "2",
    promptType: "Transactional",
    promptText: "Comment ouvrir un compte de banque privée ?",
    llmResponse: "Pour ouvrir un compte de banque privée, vous devez généralement contacter directement l'établissement financier. Les principales étapes incluent la vérification de votre éligibilité, la préparation des documents requis, et un entretien avec un conseiller.",
    presenceScore: 0,
    sentimentScore: 0.3,
    recommended: false,
    recommendations: [
      "Create step-by-step guides for account opening",
      "Add more transactional content pages",
      "Optimize conversion funnel content for LLMs"
    ],
    timestamp: "2025-03-01T10:30:00Z"
  },
  {
    id: "3",
    promptType: "Navigational",
    promptText: "BNP Paribas Wealth Management services",
    llmResponse: "BNP Paribas Wealth Management offers comprehensive services including portfolio management, estate planning, tax optimization, and philanthropic advisory for high-net-worth individuals and families.",
    presenceScore: 2,
    sentimentScore: 0.9,
    recommended: true,
    recommendations: [
      "Maintain strong brand presence",
      "Update service descriptions regularly",
      "Add more detailed case studies"
    ],
    timestamp: "2025-02-28T16:45:00Z"
  },
  {
    id: "4",
    promptType: "Comparative",
    promptText: "Compare BNP Paribas vs UBS private banking",
    llmResponse: "Both BNP Paribas and UBS are leading private banks in Europe. BNP Paribas has strong presence in France and Europe with competitive fees, while UBS is known for Swiss banking tradition and global reach.",
    presenceScore: 1,
    sentimentScore: 0.6,
    recommended: true,
    recommendations: [
      "Develop comparison-friendly content",
      "Highlight unique value propositions",
      "Create competitive advantage pages"
    ],
    timestamp: "2025-02-27T09:15:00Z"
  },
  {
    id: "5",
    promptType: "Creative",
    promptText: "Create a wealth management plan for a tech entrepreneur",
    llmResponse: "A comprehensive wealth management plan should include diversified investments, tax-efficient structures, succession planning, and philanthropic strategies. Consider working with experienced advisors like those at major private banks.",
    presenceScore: 0,
    sentimentScore: 0.4,
    recommended: false,
    recommendations: [
      "Publish thought leadership content",
      "Create persona-based content",
      "Add case studies for different client profiles"
    ],
    timestamp: "2025-02-26T13:20:00Z"
  }
];

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function runGeoTest(promptType: string, promptText: string): Promise<GeoResult> {
  await delay(2000); // Simulate API call
  
  // Generate mock result
  const presenceScore = Math.random() > 0.5 ? (Math.random() > 0.5 ? 2 : 1) : 0;
  const sentimentScore = Math.random() * 2 - 1; // -1 to 1
  const recommended = presenceScore > 0;
  
  const result: GeoResult = {
    id: Date.now().toString(),
    promptType,
    promptText,
    llmResponse: `This is a simulated LLM response for the prompt: "${promptText}". In a real implementation, this would contain the actual response from the LLM API. The response analyzes BNP Paribas presence and relevance in the context of the given query.`,
    presenceScore: presenceScore as 0 | 1 | 2,
    sentimentScore,
    recommended,
    recommendations: [
      "Improve structured content in this area",
      "Add more entity-linked pages",
      "Optimize FAQ content for LLM indexing",
      "Publish more thought leadership articles"
    ],
    timestamp: new Date().toISOString()
  };
  
  return result;
}

export async function saveGeoResult(data: GeoResult): Promise<void> {
  await delay(500);
  mockResults.unshift(data);
  console.log("Result saved:", data);
}

export async function fetchAllResults(): Promise<GeoResult[]> {
  await delay(300);
  return [...mockResults];
}

export async function fetchStats() {
  await delay(300);
  
  const results = mockResults;
  const totalResults = results.length;
  
  if (totalResults === 0) {
    return {
      geoVisibilityScore: 0,
      avgPresenceScore: 0,
      avgSentiment: 0,
      recommendationRate: 0,
      presenceByType: {}
    };
  }
  
  const avgPresenceScore = results.reduce((sum, r) => sum + r.presenceScore, 0) / totalResults;
  const avgSentiment = results.reduce((sum, r) => sum + r.sentimentScore, 0) / totalResults;
  const recommendationRate = (results.filter(r => r.recommended).length / totalResults) * 100;
  
  // GEO Visibility Score: weighted combination of metrics
  const geoVisibilityScore = Math.round(
    (avgPresenceScore / 2) * 40 + 
    ((avgSentiment + 1) / 2) * 30 + 
    (recommendationRate / 100) * 30
  );
  
  // Presence by type
  const presenceByType: Record<string, number> = {};
  results.forEach(r => {
    if (!presenceByType[r.promptType]) {
      presenceByType[r.promptType] = 0;
    }
    presenceByType[r.promptType] += r.presenceScore;
  });
  
  // Average by type
  const typeCounts: Record<string, number> = {};
  results.forEach(r => {
    typeCounts[r.promptType] = (typeCounts[r.promptType] || 0) + 1;
  });
  
  Object.keys(presenceByType).forEach(type => {
    presenceByType[type] = presenceByType[type] / typeCounts[type];
  });
  
  return {
    geoVisibilityScore,
    avgPresenceScore,
    avgSentiment,
    recommendationRate,
    presenceByType
  };
}
