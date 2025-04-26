import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';
import fetch from 'node-fetch';

const router = Router();

// Add input validation schema
const generateCodeSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  language: z.string().optional().default('javascript'),
  model: z.string().optional().default('codellama')
});

type GenerateCodeRequest = z.infer<typeof generateCodeSchema>;

interface ModelEndpoint {
  url: string;
  headers: Record<string, string>;
  transform: (response: any) => string;
}

const modelEndpoints: Record<string, ModelEndpoint> = {
  'codellama': {
    url: process.env.CODELLAMA_API_URL || 'https://api.replicate.com/v1/predictions',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    transform: (response) => response.output || ''
  },
  'starcoder': {
    url: process.env.STARCODER_API_URL || 'https://api.huggingface.co/models/bigcode/starcoder',
    headers: {
      'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    transform: (response) => response.generated_text || ''
  },
  'wizard-coder': {
    url: process.env.WIZARD_CODER_API_URL || 'https://api.together.xyz/inference',
    headers: {
      'Authorization': `Bearer ${process.env.TOGETHER_API_KEY}`,
      'Content-Type': 'application/json'
    },
    transform: (response) => response.output?.text || ''
  }
};

async function generateCode(prompt: string, language: string, model: string): Promise<string> {
  const endpoint = modelEndpoints[model];
  if (!endpoint) {
    throw new Error(`Unsupported model: ${model}`);
  }

  try {
    // Add timeout to fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: endpoint.headers,
        body: JSON.stringify({
          prompt: `Write ${language} code for: ${prompt}\nOnly respond with code, no explanations.`,
          max_new_tokens: 1000,
          temperature: 0.2,
          top_p: 0.95
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const result = endpoint.transform(data);
      
      if (!result || result.trim() === '') {
        throw new Error('Empty response from AI model');
      }
      
      return result;
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error(`Request to ${model} API timed out after 30 seconds`);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`Error generating code with ${model}:`, error);
    throw error;
  }
}

const generateCodeHandler: RequestHandler = async (req, res, next): Promise<void> => {
  try {
    // Validate input
    try {
      const { prompt, language, model } = generateCodeSchema.parse(req.body);
      
      // Generate code
      try {
        const code = await generateCode(prompt, language, model);
        res.json({ code, language });
      } catch (genError: any) {
        console.error('Code generation error:', genError);
        res.status(500).json({ 
          error: 'Failed to generate code', 
          message: genError.message || 'Unknown error occurred',
          model
        });
      }
    } catch (validationError: any) {
      console.error('Validation error:', validationError);
      res.status(400).json({ 
        error: 'Invalid request data', 
        message: validationError.message || 'Validation failed'
      });
    }
  } catch (error: any) {
    console.error('Unexpected error in generateCodeHandler:', error);
    next(error);
  }
};

router.post('/generate-code', generateCodeHandler);

export default router;