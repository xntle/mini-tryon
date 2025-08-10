import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Loading() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: any };
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [rotatingIndexes, setRotatingIndexes] = useState<Set<number>>(
    new Set()
  );
  const [fade, setFade] = useState("opacity-0");

  const createGrid = () => {
    const grid = gridRef.current;
    if (!grid) return;
    grid.innerHTML = "";

    const gridSize = grid.clientWidth;
    const minCellSize = 40;
    const gap = parseFloat(getComputedStyle(grid).gap);
    const cols = Math.floor(gridSize / (minCellSize + gap));
    const rows = cols;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    const totalCells = cols * rows;
    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className =
        "bg-white/10 rounded-sm aspect-square transition-all duration-500";
      grid.appendChild(cell);
    }
  };

  const rotateRandomCells = () => {
    const grid = gridRef.current;
    if (!grid) return;
    const cells = grid.children;
    const totalCells = cells.length;

    const newRotations: number[] = [];
    const newSet = new Set(rotatingIndexes);

    while (newRotations.length < 3 && newRotations.length < totalCells) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!newSet.has(idx)) {
        newSet.add(idx);
        newRotations.push(idx);
      }
    }

    newRotations.forEach((index) => {
      const cell = cells[index] as HTMLElement;
      cell.style.transform = "rotate(360deg)";
      cell.style.backgroundColor = "white";

      setTimeout(() => {
        cell.style.transform = "";
        cell.style.backgroundColor = "rgba(255,255,255,0.1)";
        newSet.delete(index);
        setRotatingIndexes(new Set(newSet));
      }, 500);
    });

    setRotatingIndexes(new Set(newSet));
  };

  useEffect(() => {
    createGrid();
    window.addEventListener("resize", createGrid);

    // Fade in quickly
    setTimeout(() => setFade("opacity-100"), 50);

    const interval = setInterval(rotateRandomCells, 400);

    // Fade out before navigation
    setTimeout(() => {
      setFade("opacity-0");
      setTimeout(() => {
        navigate("/shop", { state });
      }, 400); // match fade duration
    }, 2600); // 3s total but fade starts slightly earlier

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", createGrid);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 bg-black flex items-center justify-center transition-opacity duration-500 ${fade}`}
    >
      {/* Grid background */}
      <div
        ref={gridRef}
        id="grid"
        className="grid w-[90vmin] h-[90vmin] gap-[1vmin]"
      ></div>

      {/* Overlay text */}
      <div className="absolute text-white text-xl md:text-3xl font-medium text-center px-6 animate-pulse">
        Finding the perfect outfit for you...
      </div>
    </div>
  );
}
