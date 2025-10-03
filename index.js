// Load environment variables
require('dotenv').config();

// Imports
const { Client, GatewayIntentBits, Partials, Events, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');
const fs = require('fs');
const os = require('os');
const path = require('path');


try {
	registerFont('C:/Windows/Fonts/cour.ttf', { family: 'Courier New' });
} catch (_) {
	// Ignore if the font path is not available cuz the system default Courier New should still work
}

// Canvas and rendering configuration
const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 200;
const FONT_FAMILY = 'Courier New';
const BASE_FONT_SIZE = 32; // px (thicker)
const BITMAP_SCALE = 3; // low-res scale for bitmap effect
const TYPE_FRAME_DELAY_MS = 60; // per frame during typing
const CURSOR_BLINK_DELAY_MS = 380; // slightly slower blinking
const SCREEN_MARGIN = 8; // margin for rounded screen bezel
const SCREEN_RADIUS = 14; // corner radius for CRT screen
const HORIZONTAL_PADDING = 16;
const VERTICAL_PADDING = 20;
const CURSOR_CHAR = '_';

// Theme presets (black, green, and blue)
const THEMES = {
    black: { label: 'Black CRT', bg: '#000000', text: '#00ff66', glow: '#000000', scan: '#000000', shadowBlur: 32 },
    green: { label: 'Green CRT', bg: '#0a2d0a', text: '#00ff66', glow: '#00ff66', scan: '#00ff66', shadowBlur: 26 },
    blue: { label: 'Blue CRT', bg: '#001122', text: '#00ff66', glow: '#0066ff', scan: '#0066ff', shadowBlur: 24 }
};

/**
 * Draws CRT scanlines and vignette for effect
 */
function drawCrtOverlay(context, theme) {
	// Uniform brightness wash to lift overall luminance (reduced)
	context.save();
	context.globalAlpha = 0.08;
	context.fillStyle = theme.glow || theme.text;
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	context.restore();

	// Center soft glow to lighten the screen (reduced)
	context.save();
	const center = context.createRadialGradient(
		CANVAS_WIDTH / 2,
		CANVAS_HEIGHT / 2,
		Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 10,
		CANVAS_WIDTH / 2,
		CANVAS_HEIGHT / 2,
		Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) / 1.2
	);
	center.addColorStop(0, 'rgba(255,255,255,0.20)');
	center.addColorStop(1, 'rgba(0,0,0,0)');
	context.fillStyle = center;
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	context.restore();

	// Additive bloom sweep (vertical) for a brighter illuminated feel (reduced)
	context.save();
	context.globalCompositeOperation = 'lighter';
	const sweep = context.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
	sweep.addColorStop(0.00, 'rgba(255,255,255,0.08)');
	sweep.addColorStop(0.40, 'rgba(255,255,255,0.04)');
	sweep.addColorStop(0.75, 'rgba(255,255,255,0.01)');
	sweep.addColorStop(1.00, 'rgba(255,255,255,0.00)');
	context.fillStyle = sweep;
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	context.restore();

	// Scanlines (reduced)
	context.save();
	context.globalAlpha = 0.06;
	context.fillStyle = theme.scan;
	for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
		context.fillRect(0, y, CANVAS_WIDTH, 1);
	}
	context.restore();

	// Vignette
	const gradient = context.createRadialGradient(
		CANVAS_WIDTH / 2,
		CANVAS_HEIGHT / 2,
		Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 8,
		CANVAS_WIDTH / 2,
		CANVAS_HEIGHT / 2,
		Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) / 1.1
	);
	gradient.addColorStop(0, 'rgba(0,0,0,0)');
	gradient.addColorStop(1, 'rgba(0,0,0,0.20)');

	context.save();
	context.fillStyle = gradient;
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	context.restore();

	// Subtle static noise overlay (reduced)
	context.save();
	context.globalAlpha = 0.01;
	for (let i = 0; i < 80; i++) {
		const nx = Math.random() * CANVAS_WIDTH;
		const ny = Math.random() * CANVAS_HEIGHT;
		const ns = Math.random() * 1.0 + 0.3;
		context.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
		context.fillRect(nx, ny, ns, ns);
	}
	context.restore();
}

/**
 * Draw a single frame with the specified text and optional cursor
 */
function drawFrame(context, visibleText, showCursor, theme) {
	// Global black background
	context.fillStyle = '#000000';
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

	// Rounded screen bezel effect
	const sx = 8;
	const sy = 8;
	const sw = CANVAS_WIDTH - 16;
	const sh = CANVAS_HEIGHT - 16;
	context.save();
	context.shadowColor = 'rgba(0,0,0,0.5)';
	context.shadowBlur = 18;
	context.fillStyle = theme.bg;
	context.beginPath();
	roundedRectPath(context, sx, sy, sw, sh, 14);
	context.fill();
	context.restore();

	// Clip to the rounded screen
	context.save();
	context.beginPath();
	roundedRectPath(context, sx, sy, sw, sh, 14);
	context.clip();

	// Offscreen low-res canvas for bitmap text
	const offW = Math.floor(CANVAS_WIDTH / BITMAP_SCALE);
	const offH = Math.floor(CANVAS_HEIGHT / BITMAP_SCALE);
	const off = createCanvas(offW, offH);
	const octx = off.getContext('2d');

	const pixelFontSize = Math.max(10, Math.round(BASE_FONT_SIZE / BITMAP_SCALE));
	octx.font = `bold ${pixelFontSize}px "${FONT_FAMILY}"`;
	octx.textAlign = 'left';
	octx.textBaseline = 'top';
	octx.fillStyle = theme.text;
	octx.shadowColor = 'transparent';
	octx.shadowBlur = 0;

	const maxTextWidth = (CANVAS_WIDTH - HORIZONTAL_PADDING * 2) / BITMAP_SCALE;
	const lineHeight = Math.round(pixelFontSize * 1.4);
	const lines = wrapText(octx, visibleText + (showCursor ? CURSOR_CHAR : ''), maxTextWidth);

	let y = VERTICAL_PADDING / BITMAP_SCALE;
	const x = HORIZONTAL_PADDING / BITMAP_SCALE;
	for (const line of lines) {
		octx.fillText(line, x, y);
		y += lineHeight;
	}

	// Draw the offscreen canvas scaled up with a slight vertical wave to simulate glass curvature
	context.save();
	context.imageSmoothingEnabled = false;
	for (let y = 0; y < CANVAS_HEIGHT; y++) {
		const srcY = Math.min(offH - 1, Math.floor((y / CANVAS_HEIGHT) * offH));
		// Barrel-like curvature: stronger near center
		const t = y / CANVAS_HEIGHT;
		const offset = Math.sin(t * Math.PI) * 2.0; // amplitude in px
		context.drawImage(off, 0, srcY, offW, 1, offset, y, CANVAS_WIDTH, 1);
	}
	context.restore();

	// CRT overlay (glow, scanlines, noise, vignette)
	drawCrtOverlay(context, theme);

	// Inner edge glow removed - no outline for any theme

	// End clip
	context.restore();
}

function roundedRectPath(ctx, x, y, w, h, r) {
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
}

/**
 * Simple word-wrap for canvas text drawing
 */
function wrapText(context, text, maxWidth) {
	const words = text.split(' ');
	const lines = [];
	let currentLine = '';

	for (const word of words) {
		const testLine = currentLine ? `${currentLine} ${word}` : word;
		const metrics = context.measureText(testLine);
		if (metrics.width > maxWidth && currentLine) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = testLine;
		}
	}
	if (currentLine) lines.push(currentLine);
	return lines;
}

/**
 * Create a retro CRT-style typing GIF for the given text and return file path
 */
async function createRetroGif(text, themeKey) {
	const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
	const ctx = canvas.getContext('2d');

			// fallback to black	
		const theme = THEMES[themeKey] || THEMES.black;

	const encoder = new GIFEncoder(CANVAS_WIDTH, CANVAS_HEIGHT);
	const tempFile = path.join(os.tmpdir(), `retro-${Date.now()}-${Math.random().toString(36).slice(2)}.gif`);
	const writeStream = fs.createWriteStream(tempFile);
	encoder.createReadStream().pipe(writeStream);

	// Configure GIF
	encoder.start();
	encoder.setRepeat(0); // 0 = loop forever
	encoder.setQuality(10);

	// Initial idle frames with slower blink
	for (let i = 0; i < 3; i++) {
		encoder.setDelay(CURSOR_BLINK_DELAY_MS);
		drawFrame(ctx, '', i % 2 === 0, theme);
		encoder.addFrame(ctx);
	}

	// Typing effect frames
	const chars = [...text];
	let current = '';
	for (let i = 0; i < chars.length; i++) {
		current += chars[i];
		encoder.setDelay(TYPE_FRAME_DELAY_MS);
		drawFrame(ctx, current, true, theme);
		encoder.addFrame(ctx);
	}

	// Final blink frames at the end
	for (let i = 0; i < 6; i++) {
		encoder.setDelay(CURSOR_BLINK_DELAY_MS);
		drawFrame(ctx, current, i % 2 === 0, theme);
		encoder.addFrame(ctx);
	}

	encoder.finish();

	// Wait until the file is fully written
	await new Promise((resolve, reject) => {
		writeStream.on('finish', resolve);
		writeStream.on('error', reject);
	});

	return tempFile;
}

// Create Discord client
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	],
	partials: [Partials.Channel]
});

client.once(Events.ClientReady, c => {
	console.log(`Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
	try {
		// Ignore bots
		if (message.author?.bot) return;

		// Guard: Prevent duplicate handling if already processing this message
		if (message.__retroHandled) return;
		message.__retroHandled = true;

		// Check for the command prefix
		const content = message.content ?? '';
		if (!content.toLowerCase().startsWith('!retro')) return;


		// Extract arguments: optional theme then the text
		const rawArgs = content.slice('!retro'.length).trim();
		const firstWord = rawArgs.split(/\s+/)[0]?.toLowerCase();
		const themeKey = firstWord && THEMES[firstWord] ? firstWord : 'green';
		const text = (firstWord && THEMES[firstWord]) ? rawArgs.slice(firstWord.length).trim() : rawArgs;
		const finalText = text || 'Hello from RetroBot! \nMade by cyber';


		// Create the GIF (only send the GIF, not a text echo)
		const gifPath = await createRetroGif(finalText, themeKey);

		// Build content mention if the original message @ mentioned users
		let mentionContent = undefined;
		if (message.mentions && message.mentions.users && message.mentions.users.size > 0) {
			const tags = [...message.mentions.users.values()].map(u => `<@${u.id}>`).join(' ');
			mentionContent = tags;
		}

		// Send and clean up
		const attachment = new AttachmentBuilder(gifPath, { name: 'retro.gif' });
		await message.channel.send({ content: mentionContent, files: [attachment] });

		fs.unlink(gifPath, () => {});
	} catch (error) {
		console.error('Error handling message:', error);
		try {
			await message.channel.send({ content: 'Sorry, there was an error creating the GIF.' });
		} catch (_) {
			// ignore secondary errors
		}
	}
});

// Start the bot
const token = process.env.DISCORD_TOKEN;
if (!token) {
	console.error('DISCORD_TOKEN not found in environment. Please set it in your .env file.');
	process.exit(1);
}

client.login(token);





