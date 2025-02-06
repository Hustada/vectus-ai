# Vectus AI

An intelligent medical scheduling assistant by The Victor Collective. Vectus AI provides a seamless, conversational interface for appointment scheduling and patient interaction.

## Features

- Natural language appointment scheduling
- Real-time availability checking
- Contextual conversation memory
- Intelligent response handling
- Professional, authoritative interaction style
- Modern, dark-themed UI with responsive design

## Tech Stack

- Node.js with Express for the backend
- OpenAI GPT-4 for natural language processing
- Modern vanilla JavaScript frontend
- Real-time typing indicators
- Conversation state management

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vectus-ai.git
cd vectus-ai
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
```

4. Start the development server:
```bash
npm run dev
```

5. Open `http://localhost:3000` in your browser

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `PORT`: Port number for the server (default: 3000)

## Development

The project uses nodemon for development, which automatically restarts the server when files change:

```bash
npm run dev
```

## Production

For production deployment:

```bash
npm start
```

## Project Structure

- `/public` - Static frontend files
  - `index.html` - Main interface
- `server.js` - Express server and API endpoints
- `.env` - Environment variables (not tracked in git)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is proprietary software owned by The Victor Collective.

## Contact

The Victor Collective - [victorhustad@victorcollective.com]
