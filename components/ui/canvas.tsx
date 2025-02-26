/* eslint-disable no-var */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/ban-ts-comment */

interface OscillatorParams {
  phase?: number;
  amplitude?: number;
  frequency?: number;
  offset?: number;
}

class Oscillator {
  phase: number;
  offset: number;
  frequency: number;
  amplitude: number;

  constructor(params: OscillatorParams = {}) {
    this.phase = params.phase || 0;
    this.offset = params.offset || 0;
    this.frequency = params.frequency || 0.001;
    this.amplitude = params.amplitude || 1;
  }

  update(): number {
    this.phase += this.frequency;
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }

  value(): number {
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }
}

interface LineParams {
  spring: number;
}

interface Position {
  x: number;
  y: number;
}

class Node {
  x: number;
  y: number;
  vx: number;
  vy: number;

  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
  }
}

class Line {
  spring: number;
  friction: number;
  nodes: Node[];

  constructor(params: LineParams) {
    this.spring = params.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];

    for (let n = 0; n < E.size; n++) {
      const node = new Node();
      node.x = pos.x;
      node.y = pos.y;
      this.nodes.push(node);
    }
  }

  update(): void {
    let springForce = this.spring;
    let node = this.nodes[0];

    node.vx += (pos.x - node.x) * springForce;
    node.vy += (pos.y - node.y) * springForce;

    for (let i = 0, len = this.nodes.length; i < len; i++) {
      node = this.nodes[i];

      if (i > 0) {
        const prevNode = this.nodes[i - 1];
        node.vx += (prevNode.x - node.x) * springForce;
        node.vy += (prevNode.y - node.y) * springForce;
        node.vx += prevNode.vx * E.dampening;
        node.vy += prevNode.vy * E.dampening;
      }

      node.vx *= this.friction;
      node.vy *= this.friction;
      node.x += node.vx;
      node.y += node.vy;
      springForce *= E.tension;
    }
  }

  draw(): void {
    let node: Node;
    let nextNode: Node;
    let x = this.nodes[0].x;
    let y = this.nodes[0].y;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let i = 1, len = this.nodes.length - 2; i < len; i++) {
      node = this.nodes[i];
      nextNode = this.nodes[i + 1];
      x = 0.5 * (node.x + nextNode.x);
      y = 0.5 * (node.y + nextNode.y);
      ctx.quadraticCurveTo(node.x, node.y, x, y);
    }

    node = this.nodes[this.nodes.length - 2];
    nextNode = this.nodes[this.nodes.length - 1];
    ctx.quadraticCurveTo(node.x, node.y, nextNode.x, nextNode.y);
    ctx.stroke();
    ctx.closePath();
  }
}

interface ExtendedCanvasRenderingContext2D extends CanvasRenderingContext2D {
  running: boolean;
  frame: number;
}

const pos: Position = { x: 0, y: 0 };
const lines: Line[] = [];
let oscillator: Oscillator;
let ctx: ExtendedCanvasRenderingContext2D;

const E = {
  debug: true,
  friction: 0.5,
  trails: 80,
  size: 50,
  dampening: 0.025,
  tension: 0.99,
};

function handleMouseMove(e: MouseEvent) {
  pos.x = e.clientX;
  pos.y = e.clientY;
  e.preventDefault();
}

function handleTouchMove(this: Document, e: globalThis.TouchEvent) {
  if (e.touches.length > 0) {
    pos.x = e.touches[0].pageX;
    pos.y = e.touches[0].pageY;
    e.preventDefault();
  }
}

function handleTouchStart(this: Document, e: globalThis.TouchEvent) {
  if (e.touches.length === 1) {
    pos.x = e.touches[0].pageX;
    pos.y = e.touches[0].pageY;
  }
}

function createLines() {
  lines.length = 0;
  for (let i = 0; i < E.trails; i++) {
    lines.push(new Line({ spring: 0.45 + (i / E.trails) * 0.025 }));
  }
}

function initializeEventListeners() {
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("touchmove", handleTouchMove);
  document.addEventListener("touchstart", handleTouchStart);
  createLines();
  render();
}

function render() {
  if (ctx.running) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle =
      "hsla(" + Math.round(oscillator.update()) + ",100%,50%,0.025)";
    ctx.lineWidth = 10;

    for (const line of lines) {
      line.update();
      line.draw();
    }

    ctx.frame++;
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  ctx.canvas.width = window.innerWidth - 20;
  ctx.canvas.height = window.innerHeight;
}

export const renderCanvas = function () {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d");

  if (!context) {
    console.error("Could not get 2D context from canvas");
    return;
  }

  ctx = context as ExtendedCanvasRenderingContext2D;
  ctx.running = true;
  ctx.frame = 1;

  oscillator = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 85,
    frequency: 0.0015,
    offset: 285,
  });

  initializeEventListeners();
  document.body.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);

  window.addEventListener("focus", () => {
    if (!ctx.running) {
      ctx.running = true;
      render();
    }
  });

  window.addEventListener("blur", () => {
    ctx.running = true;
  });

  resizeCanvas();
};
