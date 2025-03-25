import fs from "fs";
import path from "path";
import { createCanvas } from "canvas";
import { fileURLToPath } from "url";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a canvas for the badge
const canvas = createCanvas(200, 200);
const ctx = canvas.getContext("2d");

// Draw badge background
ctx.fillStyle = "#4285f4";
ctx.beginPath();
ctx.arc(100, 100, 95, 0, Math.PI * 2);
ctx.fill();

// Draw inner circle
ctx.fillStyle = "#5c9eff";
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);
ctx.fill();

// Draw badge star
ctx.fillStyle = "#f9f9f9";
ctx.beginPath();
ctx.moveTo(100, 30);
ctx.lineTo(113, 70);
ctx.lineTo(155, 70);
ctx.lineTo(121, 95);
ctx.lineTo(134, 135);
ctx.lineTo(100, 110);
ctx.lineTo(66, 135);
ctx.lineTo(79, 95);
ctx.lineTo(45, 70);
ctx.lineTo(87, 70);
ctx.closePath();
ctx.fill();

// Draw badge text
ctx.fillStyle = "#ffffff";
ctx.font = "bold 16px Arial";
ctx.textAlign = "center";
ctx.fillText("TEST BADGE", 100, 160);

// Save the badge as PNG
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync(path.join(__dirname, "fixtures", "sample-badge.png"), buffer);

console.log("Sample badge PNG created successfully!");
