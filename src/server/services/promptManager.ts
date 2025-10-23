import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * PromptManager - Loads and caches prompt files
 * 
 * Prompts are stored as .prompt.md files in src/server/prompts/
 */
class PromptManager {
  private promptCache: Map<string, string> = new Map();
  private promptsDir: string;

  constructor() {
    // Prompts directory relative to this file
    this.promptsDir = join(__dirname, '..', 'prompts');
  }

  /**
   * Load a prompt file by name
   * @param promptFileName - Name of the prompt file (e.g., 'task-generation.prompt.md')
   * @returns The prompt content as a string
   */
  loadPrompt(promptFileName: string): string {
    // Check cache first
    if (this.promptCache.has(promptFileName)) {
      return this.promptCache.get(promptFileName)!;
    }

    try {
      const promptPath = join(this.promptsDir, promptFileName);
      const promptContent = readFileSync(promptPath, 'utf-8');
      
      // Cache the loaded prompt
      this.promptCache.set(promptFileName, promptContent);
      
      console.log(`📄 Loaded prompt: ${promptFileName}`);
      return promptContent;
    } catch (error) {
      console.error(`❌ Failed to load prompt file: ${promptFileName}`, error);
      throw new Error(`Prompt file not found: ${promptFileName}`);
    }
  }

  /**
   * Clear the prompt cache (useful for development/hot-reloading)
   */
  clearCache(): void {
    this.promptCache.clear();
    console.log('🔄 Prompt cache cleared');
  }
}

// Export singleton instance
export const promptManager = new PromptManager();
export default promptManager;
