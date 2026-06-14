import { CORE_VERSION } from '@tileloop/core';

export default function App() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-900 text-zinc-100">
      <h1 className="text-3xl font-bold">TileLoop</h1>
      <span className="sr-only">core {CORE_VERSION}</span>
    </div>
  );
}
