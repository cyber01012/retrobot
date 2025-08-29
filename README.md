# RetroBot 🖥️

A Discord bot that converts text messages into retro CRT-style animated GIFs with authentic vintage computer aesthetics.

## ✨ Features

- **🎨 Multiple CRT Themes**: Black, Green, and Blue CRT screens
- **📝 Real-time Text Rendering**: Converts messages into animated typing GIFs
- **🖥️ Authentic CRT Effects**: Scanlines, glow, vignette, noise, and screen curvature
- **⚡ Fast Generation**: Optimized canvas rendering with @napi-rs/canvas

## 🚀 Quick Start

### Prerequisites

- **Node.js** 22.18.0 or higher
- **npm** (comes with Node.js)
- **Discord Bot Token**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/cyber01012/retrobot.git
   cd retrobot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file
   echo "DISCORD_TOKEN=your_bot_token_here" > .env
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. **Enable "Message Content Intent"** (REQUIRED)
5. Copy the bot token to your `.env` file
6. Invite the bot to your server

## 📖 How to Use

To use RetroBot, simply type a command in a channel where the bot is present. The bot will then generate a retro-style GIF based on your message.

### Basic Usage

The most basic command is `!retro`. This will generate a GIF with the default green theme.

**Example:**
```
!retro Hello, world!
```

### Changing Themes

You can change the theme of the GIF by specifying a theme name after the `!retro` command.

**Example:**
```
!retro blue This is a blue theme.
```

## 🎨 Themes

- **Black CRT**: Pure black background with black overlay effects
- **Green CRT**: Classic green terminal look (default)
- **Blue CRT**: Dark blue background with blue effects

## 🛠️ Commands

| Command | Description | Example |
|---|---|---|
| `!retro <text>` | Creates a GIF with the default green theme. | `!retro Hello, world!` |
| `!retro black <text>` | Creates a GIF with the black theme. | `!retro black This is a black theme.` |
| `!retro green <text>` | Creates a GIF with the green theme. | `!retro green This is a green theme.` |
| `!retro blue <text>` | Creates a GIF with the blue theme. | `!retro blue This is a blue theme.` |

## 🤝 Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or create a pull request.

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔍 Troubleshooting

**"Used disallowed intents" Error**
- Enable "Message Content Intent" in Discord Developer Portal
- Restart the bot after enabling

**Font Not Loading**
- Bot will fallback to system default Courier New

---

**Made with ❤️ by cyber**

*RetroBot - Bringing back the golden age of CRT monitors, one GIF at a time!*
