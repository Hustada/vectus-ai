const express = require('express');
const bodyParser = require('body-parser');
const OpenAI = require('openai');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

// Mock CRM Database
class MockCRM {
  constructor() {
    this.leads = new Map();
    this.conversations = new Map();
  }

  getLastInteraction(phone) {
    const lead = this.leads.get(phone);
    if (!lead || !lead.interactions.length) return null;
    return lead.interactions[lead.interactions.length - 1];
  }

  logInteraction(phone, message, response) {
    const lead = this.leads.get(phone) || {
      id: Date.now(),
      phone,
      status: 'new',
      interactions: []
    };
    
    lead.interactions.push({
      timestamp: new Date(),
      inbound: message,
      outbound: response
    });
    
    this.leads.set(phone, lead);
    console.log('CRM Update:', JSON.stringify(lead, null, 2));
    return lead;
  }
}

const crm = new MockCRM();

// AI Qualification Engine
class AIQualifier {
  constructor() {
    this.availability = {
      monday: ['2:00 PM', '3:30 PM'],
      tuesday: ['2:00 PM', '3:30 PM'],
      wednesday: ['2:30 PM', '4:00 PM'],
      thursday: ['2:00 PM', '3:30 PM'],
      friday: ['2:30 PM', '3:00 PM']
    };
    
    this.checkingPhrases = [
      'SCANNING TEMPORAL DATABASE...',
      'ACCESSING QUANTUM CALENDAR...',
      'CALCULATING CHRONOLOGICAL VECTORS...'
    ];
    
    this.appointmentDetails = new Map();
  }

  getAvailabilityForDays(days) {
    let times = [];
    days.forEach(day => {
      if (this.availability[day]) {
        times.push(`${day.charAt(0).toUpperCase() + day.slice(1)} at ${this.availability[day].join(' and ')}`);
      }
    });
    return times.join(', or ');
  }

  getRandomCheckingPhrase() {
    return this.checkingPhrases[Math.floor(Math.random() * this.checkingPhrases.length)];
  }
  isTimeResponse(message) {
    const lcMessage = message.toLowerCase();
    // Check for common time formats
    if (
      lcMessage.includes('am') ||
      lcMessage.includes('pm') ||
      lcMessage.includes('tomorrow') ||
      lcMessage.includes('friday') ||
      /\b(10|11|2|3)\b/.test(lcMessage)
    ) {
      return true;
    }
    return false;
  }

  isEndingConversation(message) {
    const lcMessage = message.toLowerCase();
    return [
      'done',
      'nope',
      'no',
      'bye',
      'goodbye',
      'thanks',
      'thank you',
      'that\'s all',
      'end',
      'terminate',
      'quit'
    ].some(phrase => lcMessage.includes(phrase));
  }

  processMessage(message, lastInteraction) {
    const lcMessage = message.toLowerCase();
    
    // Handle conversation flow based on last interaction
    if (lastInteraction) {
      const lastStep = lastInteraction.outbound.nextStep;
      
      switch (lastStep) {
        case 'schedule_call':
          if (this.isTimeResponse(message)) {
            const appointmentId = Date.now().toString();
            this.appointmentDetails.set(appointmentId, {
              time: message,
              status: 'confirmed',
              details: {}
            });
            return {
              score: 9,
              qualified: true,
              response: 'APPOINTMENT CONFIRMED FOR ' + message.toUpperCase() + '.\n\nWould you like to:\n1. Share any symptoms or concerns\n2. Add medical history\n3. End conversation\n\nSelect an option or type \'done\' if you\'re all set.',
              nextStep: 'post_confirmation',
              metadata: { appointmentId, showOptions: true }
            };
          }
          }
          // If they didn't provide a time, repeat the time options
          return {
            score: 8,
            qualified: true,
            response: 'I have these time slots available: Tomorrow at 10 AM or 2 PM, or Friday at 11 AM or 3 PM. ' +
                     'Which one works best for you?',
            nextStep: 'schedule_call'
          };

        case 'collect_symptoms':
          if (lastInteraction?.metadata?.appointmentId) {
            const appointment = this.appointmentDetails.get(lastInteraction.metadata.appointmentId);
            if (appointment) {
              appointment.details.symptoms = message;
              this.appointmentDetails.set(lastInteraction.metadata.appointmentId, appointment);
            }
          }
          return {
            score: 9,
            qualified: true,
            response: 'SYMPTOMS LOGGED: ' + message + '\n\nWould you like to:\n1. Add medical history\n2. End conversation\n\nSelect an option or type \'done\' if you\'re all set.',
            nextStep: 'post_confirmation',
            metadata: { ...lastInteraction?.metadata, showOptions: true }
          };

        case 'collect_history':
          if (lastInteraction?.metadata?.appointmentId) {
            const appointment = this.appointmentDetails.get(lastInteraction.metadata.appointmentId);
            if (appointment) {
              appointment.details.history = message;
              this.appointmentDetails.set(lastInteraction.metadata.appointmentId, appointment);
            }
          }
          return {
            score: 9,
            qualified: true,
            response: 'MEDICAL HISTORY LOGGED. Would you like to:\n1. Share symptoms or concerns\n2. End conversation\n\nSelect an option or type \'done\' if you\'re all set.',
            nextStep: 'post_confirmation',
            metadata: { ...lastInteraction?.metadata, showOptions: true }
          };

        case 'post_confirmation':
          const lcMsg = message.toLowerCase();
          if (lcMsg.includes('1') || lcMsg.includes('symptoms') || lcMsg.includes('concerns')) {
            return {
              score: 9,
              qualified: true,
              response: 'Please share your symptoms or concerns.',
              nextStep: 'collect_symptoms',
              metadata: lastInteraction?.metadata
            };
          } else if (lcMsg.includes('2') || lcMsg.includes('history') || lcMsg.includes('medical')) {
            return {
              score: 9,
              qualified: true,
              response: 'Please share any relevant medical history.',
              nextStep: 'collect_history',
              metadata: lastInteraction?.metadata
            };
          } else if (lcMsg.includes('3') || this.isEndingConversation(message)) {
            return {
              score: 9,
              qualified: true,
              response: 'INITIATING SHUTDOWN SEQUENCE...',
              nextStep: 'end',
              metadata: { terminate: true }
            };
          }
          return {
            score: 9,
            qualified: true,
            response: 'Would you like to:\n1. Share symptoms or concerns\n2. Add medical history\n3. End conversation\n\nSelect an option or type \'done\' if you\'re all set.',
            nextStep: 'post_confirmation',
            metadata: { showOptions: true }
          };
      }
    }
    
    // Initial conversation starters
    // Handle specific day mentions
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const mentionedDays = days.filter(day => lcMessage.includes(day));
    
    if (mentionedDays.length > 0) {
      const availableTimes = this.getAvailabilityForDays(mentionedDays);
      return {
        score: 9,
        qualified: true,
        response: `${this.getRandomCheckingPhrase()} For those days, I have: ${availableTimes}. Which time works best for you?`,
        nextStep: 'confirm_time'
      };
    }

    // Handle vague time requests
    if (lcMessage.includes('next week') || lcMessage.includes('afternoon') || 
        lcMessage.includes('morning') || lcMessage.includes('evening')) {
      return {
        score: 8,
        qualified: true,
        response: `${this.getRandomCheckingPhrase()} Here are some options for next week:\n` +
                 `- Monday at 2:00 PM and 3:30 PM\n` +
                 `- Tuesday at 2:00 PM and 3:30 PM\n` +
                 `Which day would work better for you?`,
        nextStep: 'request_specific_day'
      };
    }

    // Handle general scheduling requests
    if (lcMessage.includes('schedule') || lcMessage.includes('appointment') || lcMessage.includes('book')) {
      return {
        score: 8,
        qualified: true,
        response: 'Perfect! I\'d be happy to help schedule that. We have slots available: ' +
                 'Tomorrow at 10 AM or 2 PM, or Friday at 11 AM or 3 PM. ' +
                 'Which time works best for you?',
        nextStep: 'schedule_call'
      };
    }
    
    if (lcMessage.includes('price') || lcMessage.includes('cost') || lcMessage.includes('pricing')) {
      return {
        score: 7,
        qualified: true,
        response: 'I\'d be happy to discuss pricing! Our plans start at $49/month for startups, ' +
                 'with custom enterprise pricing available. Would you like to schedule a quick call to discuss your specific needs?',
        nextStep: 'discuss_pricing'
      };
    }
    
    return {
      score: 3,
      qualified: false,
      response: 'Thanks for reaching out! To better assist you, could you share what specific challenges you\'re looking to solve?',
      nextStep: 'qualify'
    };
  }
}



// AI Analysis Function
async function analyzeMessage(text, lastInteraction) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  let systemPrompt = `You are Vectus AI, an advanced medical scheduling assistant from The Victor Collective. Your responses should be professional and precise, with a subtle air of authority that inspires confidence. Be direct and helpful.
    
    IMPORTANT RULES:
    1. DETECT CONVERSATION END: If the user's message suggests they are done (e.g., 'thanks', 'that's all', 'goodbye', showing satisfaction with no further questions), set shouldTerminate to true in your response.
    
    2. When someone asks about availability:
       - First say you're checking
       - Then ALWAYS provide specific available times, don't just say you're checking
       - Example: 'Let me check... Yes, I have openings on Tuesday at 2:00 PM and 3:30 PM, or Thursday at 2:30 PM.'
    
    2. When someone mentions specific days:
       - ALWAYS respond with actual available times for those days
       - Don't just acknowledge that you're checking
       - Example: If they say 'Tuesday or Thursday', respond with actual times like:
         'For those days, I have: Tuesday at 2:00 PM and 3:30 PM, or Thursday at 2:30 PM. Which would work better for you?'
    
    3. Available time slots to use in responses:
       - Mondays: 2:00 PM, 3:30 PM
       - Tuesdays: 2:00 PM, 3:30 PM
       - Wednesdays: 2:30 PM, 4:00 PM
       - Thursdays: 2:00 PM, 3:30 PM
       - Fridays: 2:30 PM, 3:00 PM. 
    
    Key behaviors:
    1. When patients ask about availability:
       - First acknowledge you're checking the schedule
       - If they give a vague timeframe (like 'next week' or 'afternoons'), ask for more specific preferences
       - If they give a specific time, pretend to check and respond accordingly
    
    2. Always maintain a helpful, friendly tone and show you're actively working on their request
       - Use phrases like 'Let me check that for you' or 'I'm looking at our availability now'
       - Add small delays in responses to simulate checking the system
    
    3. Current mock availability (pretend to check these):
       - Monday-Friday next week: 2pm, 3pm, 4pm
       - Mention 2-3 options at a time, not all at once
    
    You are having a natural conversation while helping schedule appointments.`;
  
  if (lastInteraction) {
    systemPrompt += `The last interaction was: Patient said "${lastInteraction.inbound}" and you responded about ${lastInteraction.outbound.nextStep}. `;
  }

  systemPrompt += 'Respond in JSON format with: {"score": 1-10, "qualified": boolean, "response": "your response", "nextStep": "next_step_id", "shouldTerminate": boolean}';

  // Add a delay to simulate checking calendar (3-5 seconds)
  await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: text
      }
    ],
    temperature: 0.7,
    max_tokens: 150
  });

  try {
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error parsing OpenAI response:', error);
    throw error;
  }
}

// Response Builder
function buildResponse(qualificationResult) {
  return `Score: ${qualificationResult.score}, Qualified: ${qualificationResult.qualified}, Next Step: ${qualificationResult.nextStep}`;
}

app.post('/api/message', async (req, res) => {
  try {
    const { message } = req.body;
    const phone = req.body.phone || 'web-user';
    
    // Get last interaction for context
    const lastInteraction = crm.getLastInteraction(phone);
    
    // Add a realistic delay to simulate checking (2-4 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    let result;
    
    // Try OpenAI first if API key is available
    if (process.env.OPENAI_API_KEY) {
      try {
        console.log('Using OpenAI for processing...');
        result = await analyzeMessage(message, lastInteraction);
      } catch (error) {
        console.error('OpenAI Error:', error);
        // Fallback to simple classifier
        console.log('Falling back to simple classifier...');
        const ai = new AIQualifier();
        result = ai.processMessage(message, lastInteraction);
      }
    } else {
      // Use simple classifier if no API key
      console.log('No OpenAI API key found, using simple classifier');
      const ai = new AIQualifier();

      result = ai.processMessage(message, lastInteraction);
    }
    
    // Don't auto-terminate, let the user explicitly end the conversation

    // Log interaction
    crm.logInteraction(phone, message, result);
    
    // Send response
    res.json({
      response: result.response,
      metadata: {
        qualified: result.qualified,
        nextStep: result.nextStep,
        score: result.score
      }
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      response: 'Sorry, I encountered an error processing your message.',
      error: error.message
    });
  }
});

const port = process.env.PORT || 3000;

const server = app.listen(port)
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please try a different port or stop the existing process.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  })
  .on('listening', () => {
    console.log(`Vectus AI running on port ${port}`);
  });
