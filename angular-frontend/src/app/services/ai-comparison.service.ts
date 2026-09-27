import { Injectable } from '@angular/core';
import { delay, Observable, of, forkJoin, map } from 'rxjs';
import { AIModel, AIResponse, ComparisonResult, TaskOption, TaskType, HistoryItem } from '../models/ai.model';

@Injectable({
  providedIn: 'root'
})
export class AiComparisonService {
  private readonly AI_MODELS: AIModel[] = [
    {
      id: 'llama3',
      name: 'Llama 3',
      description: 'Meta\'s powerful open-source LLM, great for general tasks',
      version: '8B-Instruct',
      provider: 'Meta',
      color: 'from-blue-500 to-cyan-500',
      icon: '🦙'
    },
    {
      id: 'mistral',
      name: 'Mistral',
      description: 'Fast and efficient model from Mistral AI',
      version: '7B-v0.3',
      provider: 'Mistral AI',
      color: 'from-orange-500 to-amber-500',
      icon: '🌪️'
    },
    {
      id: 'gemma',
      name: 'Gemma',
      description: 'Google\'s lightweight open-source model',
      version: '7B-Instruct',
      provider: 'Google',
      color: 'from-green-500 to-emerald-500',
      icon: '💎'
    },
    {
      id: 'falcon',
      name: 'Falcon',
      description: 'TII\'s high-performing open-source model',
      version: '7B-Instruct',
      provider: 'TII',
      color: 'from-purple-500 to-violet-500',
      icon: '🦅'
    },
    {
      id: 'zephyr',
      name: 'Zephyr',
      description: 'HuggingFace\'s fine-tuned conversational model',
      version: '7B-beta',
      provider: 'HuggingFace',
      color: 'from-pink-500 to-rose-500',
      icon: '🌬️'
    }
  ];

  private readonly TASK_OPTIONS: TaskOption[] = [
    {
      id: 'logo',
      label: 'Logo Design',
      description: 'Generate creative logo concepts and descriptions',
      icon: '🎨',
      placeholder: 'Describe your brand, colors, and style for the logo...'
    },
    {
      id: 'cover_letter',
      label: 'Cover Letter',
      description: 'Write a professional cover letter',
      icon: '📄',
      placeholder: 'Enter the job title, company name, and your key skills...'
    },
    {
      id: 'email',
      label: 'Email Writing',
      description: 'Draft professional emails for any occasion',
      icon: '📧',
      placeholder: 'Describe the purpose of the email and key points to include...'
    },
    {
      id: 'article',
      label: 'Article / Blog',
      description: 'Generate articles or blog posts on any topic',
      icon: '📝',
      placeholder: 'Enter the topic, target audience, and key points to cover...'
    },
    {
      id: 'code',
      label: 'Code Generation',
      description: 'Generate code snippets and solutions',
      icon: '💻',
      placeholder: 'Describe the programming problem or feature to implement...'
    },
    {
      id: 'general',
      label: 'General',
      description: 'Ask any question or request any text',
      icon: '✨',
      placeholder: 'Enter your prompt here...'
    }
  ];

  private history: HistoryItem[] = [];

  getModels(): AIModel[] {
    return this.AI_MODELS;
  }

  getTaskOptions(): TaskOption[] {
    return this.TASK_OPTIONS;
  }

  compareModels(prompt: string, taskType: TaskType): Observable<ComparisonResult> {
    const responses: Observable<AIResponse>[] = this.AI_MODELS.map(model =>
      this.simulateModelResponse(model.id, prompt, taskType)
    );

    return forkJoin(responses).pipe(
      map(allResponses => {
        const sorted = [...allResponses].sort((a, b) => b.score - a.score);
        const bestModelId = sorted[0].modelId;

        const result: ComparisonResult = {
          id: this.generateId(),
          prompt,
          taskType,
          responses: allResponses,
          bestModelId,
          createdAt: new Date()
        };

        this.addToHistory(result);
        return result;
      })
    );
  }

  getModelById(id: string): AIModel | undefined {
    return this.AI_MODELS.find(m => m.id === id);
  }

  getHistory(): HistoryItem[] {
    return this.history;
  }

  private simulateModelResponse(modelId: string, prompt: string, taskType: TaskType): Observable<AIResponse> {
    const latency = 800 + Math.random() * 2500;
    const baseScore = 70 + Math.random() * 28;

    return of(null).pipe(
      delay(latency),
      map(() => ({
        modelId,
        content: this.generateContent(modelId, prompt, taskType),
        score: Math.round(baseScore),
        reasoning: this.generateReasoning(modelId, taskType, baseScore),
        latency: Math.round(latency),
        timestamp: new Date()
      }))
    );
  }

  private generateContent(modelId: string, prompt: string, taskType: TaskType): string {
    const model = this.getModelById(modelId);
    const modelName = model?.name || 'AI Model';

    switch (taskType) {
      case 'logo':
        return `${modelName} Verdict - Logo Concept for: "${prompt}"\n\n🎯 **Design Approach:**\nModern minimalist design with clean lines and strong visual hierarchy.\n\n🎨 **Color Palette:**\n- Primary: Deep blue (#1e40af) - conveys trust and professionalism\n- Secondary: Vibrant teal (#0d9488) - adds energy and creativity\n- Accent: Soft gold (#f59e0b) - for premium feel\n\n🔤 **Typography:**\n- Sans-serif: Inter or Montserrat for modern appeal\n- Custom letterforms with subtle geometric influences\n\n✨ **Key Elements:**\n• Abstract mark representing innovation and growth\n• Negative space cleverly integrated for memorability\n• Scalable design works from favicon to billboards\n• Monochrome version maintains brand recognition\n\n💡 **Variations:**\n1. Horizontal lockup (primary)\n2. Icon-only mark (social media)\n3. Vertical stacked (print materials)`;

      case 'cover_letter':
        return `${modelName} Verdict - Cover Letter\n\nDear Hiring Manager,\n\nI am writing to express my strong interest in the position related to "${prompt}". With my background and passion for excellence, I am confident I would be a valuable addition to your team.\n\n**Key Highlights:**\n\n🚀 **Proven Track Record**: Consistently exceeded targets and delivered exceptional results in previous roles, demonstrating commitment to excellence.\n\n🤝 **Collaborative Spirit**: Thrived in cross-functional teams, contributing to a positive work environment while achieving shared objectives.\n\n💡 **Innovative Mindset**: Brought fresh perspectives and creative solutions to complex challenges, driving process improvements and efficiency gains.\n\n📈 **Results-Oriented**: Focused on measurable outcomes, with a history of contributing to organizational growth and success.\n\nI am excited about the opportunity to bring my skills, experience, and enthusiasm to your organization. Thank you for considering my application. I look forward to the possibility of discussing how I can contribute to your team's continued success.\n\nWarm regards,\n[Applicant Name]`;

      case 'email':
        return `${modelName} Verdict - Email Draft\n\n**Subject:** Re: ${prompt}\n\nDear [Recipient's Name],\n\nI hope this message finds you well.\n\nI am reaching out regarding "${prompt}". I wanted to ensure we're aligned and address any questions you may have.\n\n📌 **Key Points to Cover:**\n\n• **Context**: Providing the necessary background and information to ensure full understanding.\n• **Action Items**: Clearly outlining next steps and responsibilities for all parties involved.\n• **Timeline**: Establishing realistic expectations and deadlines for deliverables.\n• **Support**: Offering assistance and resources to facilitate successful outcomes.\n\nPlease feel free to reach out if you need any additional information or have concerns. I am available at your convenience for a discussion.\n\nThank you for your time and attention to this matter.\n\nBest regards,\n[Your Name]\n[Your Title/Contact Information]`;

      case 'article':
        return `${modelName} Verdict - Article: ${prompt}\n\n# Understanding ${prompt}: A Comprehensive Guide\n\n## Introduction\n\nIn today's rapidly evolving landscape, the topic of "${prompt}" has become increasingly relevant. This article explores the key dimensions, implications, and actionable insights for navigating this subject effectively.\n\n---\n\n## **1. The Core Concepts**\n\nTo fully grasp the subject, we must first understand its foundational elements. These building blocks provide the framework for deeper analysis and application.\n\n- **Principle A**: The fundamental driving force that shapes outcomes\n- **Principle B**: The contextual factors that influence decision-making\n- **Principle C**: The measurable indicators of success or failure\n\n## **2. Real-World Applications**\n\nTheory becomes valuable when applied. Here are practical scenarios where these concepts make a tangible difference:\n\n🏢 **Business Context**: Organizations leveraging these principles see improved efficiency and stakeholder satisfaction.\n\n🎓 **Educational Settings**: Institutions integrating these approaches report enhanced learning outcomes.\n\n🌍 **Societal Impact**: Communities adopting these frameworks experience better collaboration and progress.\n\n## **3. Challenges and Mitigations**\n\nNo approach is without obstacles. Understanding common pitfalls prepares us to address them proactively.\n\n| Challenge | Mitigation Strategy |\n|-----------|-------------------|\n| Resistance to change | Gradual implementation with clear communication |\n| Resource constraints | Prioritization and phased rollout |\n| Measuring impact | Establish KPIs early and track consistently |\n\n## Conclusion\n\nThe topic of "${prompt}" represents both challenges and opportunities. By approaching it with knowledge, strategy, and adaptability, we can unlock its full potential and create meaningful, lasting impact.\n\n---\n\n*What are your experiences with this topic? Share your insights and join the conversation.*`;

      case 'code':
        return `${modelName} Verdict - Code Solution for: "${prompt}"\n\n\`\`\`typescript\n/**\n * Solution for: ${prompt}\n * Generated by ${modelName}\n */\n\ninterface Config {\n  debug?: boolean;\n  timeout?: number;\n  retries?: number;\n}\n\ninterface Result<T> {\n  success: boolean;\n  data?: T;\n  error?: string;\n  metadata: {\n    timestamp: Date;\n    duration: number;\n  };\n}\n\nclass Processor<T> {\n  private config: Required<Config>;\n\n  constructor(config: Config = {}) {\n    this.config = {\n      debug: config.debug ?? false,\n      timeout: config.timeout ?? 5000,\n      retries: config.retries ?? 3\n    };\n  }\n\n  async execute(input: T): Promise<Result<T>> {\n    const startTime = Date.now();\n    let attempts = 0;\n\n    while (attempts < this.config.retries) {\n      try {\n        if (this.config.debug) {\n          console.log(\`[Attempt \${attempts + 1}] Processing...\`);\n        }\n\n        const processed = this.transform(input);\n        const validated = this.validate(processed);\n\n        if (!validated.ok) {\n          throw new Error(validated.error);\n        }\n\n        return {\n          success: true,\n          data: processed,\n          metadata: {\n            timestamp: new Date(),\n            duration: Date.now() - startTime\n          }\n        };\n      } catch (err) {\n        attempts++;\n        if (attempts >= this.config.retries) {\n          return {\n            success: false,\n            error: err instanceof Error ? err.message : 'Unknown error',\n            metadata: {\n              timestamp: new Date(),\n              duration: Date.now() - startTime\n            }\n          };\n        }\n      }\n    }\n\n    throw new Error('Unreachable');\n  }\n\n  private transform(input: T): T {\n    if (this.config.debug) {\n      console.log('Transforming input:', input);\n    }\n    return input;\n  }\n\n  private validate(input: T): { ok: boolean; error?: string } {\n    if (input === null || input === undefined) {\n      return { ok: false, error: 'Input cannot be null or undefined' };\n    }\n    return { ok: true };\n  }\n}\n\nexport { Processor, Config, Result };\n\`\`\`\n\n**Key Features:**\n✅ Type-safe interfaces with full generics support\n✅ Built-in retry mechanism with configurable attempts\n✅ Comprehensive error handling and reporting\n✅ Debug mode for development and troubleshooting\n✅ Performance metadata tracking\n\n**Usage Example:**\n\`\`\`typescript\nconst processor = new Processor<string>({\n  debug: true,\n  retries: 3,\n  timeout: 3000\n});\n\nconst result = await processor.execute('Hello World');\nconsole.log(result);\n\`\`\``;

      default:
        return `${modelName} Verdict - Response\n\nRegarding your query about "${prompt}":\n\nHere is a comprehensive analysis and response:\n\n**📌 Summary**\n\nThis response addresses your query with relevant information, structured for clarity and actionable insights.\n\n**🔍 Detailed Breakdown**\n\n1. **Contextual Understanding**: The topic involves multiple interconnected factors that need consideration. Each element plays a role in the overall picture.\n\n2. **Key Considerations**: Several important points emerge when examining this topic carefully. These factors help inform the best approach.\n\n3. **Practical Applications**: The insights can be applied in various scenarios, yielding positive outcomes when implemented thoughtfully.\n\n4. **Potential Challenges**: As with any complex topic, there are nuances and potential pitfalls to be aware of. Proper preparation mitigates these risks.\n\n**💡 Recommendations**\n\n• Start with clear objectives and success metrics\n• Break complex tasks into manageable steps\n• Iterate and refine based on feedback\n• Document learnings for future reference\n\nThank you for your question. If you need further clarification or have follow-up inquiries, feel free to ask!`;
    }
  }

  private generateReasoning(modelId: string, taskType: TaskType, score: number): string {
    const model = this.getModelById(modelId);
    const quality = score >= 90 ? 'Excellent' : score >= 80 ? 'Very Good' : score >= 70 ? 'Good' : 'Fair';

    const strengths: Record<string, string[]> = {
      llama3: ['Strong reasoning capabilities', 'Coherent narrative flow', 'Good contextual awareness'],
      mistral: ['Fast response time', 'Concise and to-the-point', 'Efficient token usage'],
      gemma: ['Well-structured output', 'Clear formatting', 'Good instruction following'],
      falcon: ['Creative approach', 'Detailed explanations', 'Good vocabulary usage'],
      zephyr: ['Conversational tone', 'Emotionally appropriate', 'Engaging writing style']
    };

    const modelStrengths = strengths[modelId] || ['Balanced performance'];
    const randomStrength = modelStrengths[Math.floor(Math.random() * modelStrengths.length)];

    return `${quality} output (${score}/100) from ${model?.name}. Strengths: ${randomStrength}. Well-suited for ${taskType.replace('_', ' ')} tasks.`;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  private addToHistory(result: ComparisonResult): void {
    const bestModel = this.getModelById(result.bestModelId);
    const bestResponse = result.responses.find(r => r.modelId === result.bestModelId);

    const historyItem: HistoryItem = {
      id: result.id,
      prompt: result.prompt,
      taskType: result.taskType,
      bestModel: bestModel?.name || 'Unknown',
      bestScore: bestResponse?.score || 0,
      createdAt: result.createdAt
    };

    this.history.unshift(historyItem);

    if (this.history.length > 50) {
      this.history = this.history.slice(0, 50);
    }
  }
}
