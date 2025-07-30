
import { GoogleGenAI } from "@google/genai";
import { Project, User } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Gemini API key not found. Project Summary feature will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateProjectSummary = async (project: Project, supervisor?: User): Promise<string> => {
  if (!API_KEY) {
    return "Project Summary feature is disabled. Please configure the Gemini API key.";
  }

  const prompt = `
    Generate a concise and professional project progress report summary.
    The report is for the executive team of a telecom company.
    Use the following project data:

    - Project Name: ${project.name}
    - Location: ${project.location}
    - Status: ${project.status}
    - Progress: ${project.progress}% complete
    - Duration: ${project.duration}
    - Cost: AED ${project.cost.toLocaleString()}
    - Responsible Supervisor: ${supervisor ? supervisor.name : 'Not Assigned'}

    Based on the data, create a brief summary that highlights the current standing of the project. 
    If progress is low and the status is 'In Progress', mention that it might need attention.
    If progress is high and nearing completion, state it positively.
    If status is 'On Hold', explain that activities are paused.
  `;

  try {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text;
  } catch (error) {
    console.error("Error generating project summary with Gemini API:", error);
    return "Could not generate summary. There was an error connecting to the AI service.";
  }
};
